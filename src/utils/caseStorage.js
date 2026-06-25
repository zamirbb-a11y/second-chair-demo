import { supabase } from "../lib/supabaseClient";

const CASES_INDEX_KEY  = "secondChair.cases.index";
const CASE_KEY_PREFIX  = "secondChair.case.";
const DEBOUNCE_MS      = 2500;
const RETRY_INTERVAL_MS = 45_000;

// ── Sync state ────────────────────────────────────────────────
// pending  : caseId → { timer, payload, version }  (debounce slot)
// versions : caseId → number                        (latest issued version)
// failed   : caseId → payload                       (last unsynced payload)
const pending  = new Map();
const versions = new Map();
const failed   = new Map();
let   inFlight = 0;

let   syncStatus = { state: "idle", lastSavedAt: null };
const listeners  = new Set();

function emitStatus(patch) {
  syncStatus = { ...syncStatus, ...patch };
  listeners.forEach((cb) => cb(syncStatus));
}

export function getSyncStatus()        { return syncStatus; }
export function onSyncStatusChange(cb) { listeners.add(cb); return () => listeners.delete(cb); }

// ── Public API (synchronous — call sites unchanged) ───────────

export function createCaseId() {
  return (
    "case_" +
    new Date().toISOString().replace(/[:.]/g, "-") +
    "_" +
    Math.random().toString(36).slice(2, 8)
  );
}

export function saveCase(caseState) {
  if (!caseState?.id) throw new Error("Cannot save case without id");

  const now = new Date().toISOString();
  const safeCase = {
    ...caseState,
    updatedAt: now,
    createdAt: caseState.createdAt || now,
  };

  // localStorage write is always synchronous and immediate
  localStorage.setItem(`${CASE_KEY_PREFIX}${safeCase.id}`, JSON.stringify(safeCase));
  updateCasesIndex(safeCase);

  // Cloud write is debounced — only latest payload per caseId is sent
  scheduleBgSave(safeCase);

  return safeCase;
}

export function loadCase(caseId) {
  if (!caseId) return null;
  const raw = localStorage.getItem(`${CASE_KEY_PREFIX}${caseId}`);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function listCases() {
  try {
    const raw   = localStorage.getItem(CASES_INDEX_KEY);
    const cases = raw ? JSON.parse(raw) : [];
    return Array.isArray(cases)
      ? cases.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
      : [];
  } catch { return []; }
}

export function deleteCase(caseId) {
  if (!caseId) return;
  localStorage.removeItem(`${CASE_KEY_PREFIX}${caseId}`);
  const cases = listCases().filter((item) => item.id !== caseId);
  localStorage.setItem(CASES_INDEX_KEY, JSON.stringify(cases));

  // Cancel any pending save for this case and clear its failure record
  const slot = pending.get(caseId);
  if (slot) { clearTimeout(slot.timer); pending.delete(caseId); }
  failed.delete(caseId);
  if (failed.size === 0 && inFlight === 0) emitStatus({ state: "idle" });

  bgDelete(caseId);
}

// ── Sync from Supabase (called once on login) ─────────────────

export async function syncFromSupabase(userId) {
  if (!supabase || !userId) return;

  const { data: remote, error } = await supabase
    .from("cases")
    .select("id, name, data, updated_at, created_at, documents_count, has_analysis")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) { console.warn("[caseStorage] sync failed:", error.message); return; }

  const remoteIds = new Set((remote || []).map((r) => r.id));

  // Push local-only cases to Supabase
  listCases().forEach((item) => {
    if (remoteIds.has(item.id)) return;
    const raw = localStorage.getItem(`${CASE_KEY_PREFIX}${item.id}`);
    if (!raw) return;
    try { bgSaveRaw(userId, JSON.parse(raw)); } catch { /* skip corrupt */ }
  });

  if (!remote?.length) return;

  // Remote wins when newer (by updatedAt timestamp)
  remote.forEach((row) => {
    const key      = `${CASE_KEY_PREFIX}${row.id}`;
    const localRaw = localStorage.getItem(key);
    const localTs  = localRaw ? (JSON.parse(localRaw)?.updatedAt || "") : "";
    const remoteTs = row.updated_at || "";
    if (!localRaw || remoteTs > localTs) {
      localStorage.setItem(key, JSON.stringify(row.data));
    }
  });

  // Rebuild merged index
  const localIndex = listCases();
  const merged = [
    ...remote.map((row) => ({
      id:             row.id,
      name:           row.name || "תיק ללא שם",
      updatedAt:      row.updated_at,
      createdAt:      row.created_at,
      documentsCount: row.documents_count || 0,
      hasAnalysis:    row.has_analysis || false,
    })),
    ...localIndex.filter((c) => !remoteIds.has(c.id)),
  ];
  merged.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  localStorage.setItem(CASES_INDEX_KEY, JSON.stringify(merged));
}

// ── Debounce: one slot per caseId ────────────────────────────

function scheduleBgSave(caseState) {
  if (!supabase) return;

  const caseId = caseState.id;

  // Cancel the existing debounce timer for this case (if any)
  const existing = pending.get(caseId);
  if (existing) clearTimeout(existing.timer);

  // Monotonically increasing version — prevents older in-flight saves from winning
  const version = (versions.get(caseId) || 0) + 1;
  versions.set(caseId, version);

  const timer = setTimeout(() => {
    pending.delete(caseId);
    doUpsert(caseId, caseState, version);
  }, DEBOUNCE_MS);

  pending.set(caseId, { timer, payload: caseState, version });
}

async function doUpsert(caseId, payload, version) {
  inFlight++;
  emitStatus({ state: "syncing" });

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Not logged in — skip silently, not a failure
      inFlight--;
      resolveStatus();
      return;
    }

    const { error } = await supabase.from("cases").upsert(
      {
        id:              payload.id,
        user_id:         user.id,
        name:            payload.name || "תיק ללא שם",
        data:            payload,
        updated_at:      payload.updatedAt,
        created_at:      payload.createdAt,
        documents_count: payload.caseFiles?.length || 0,
        has_analysis:    Boolean(payload.analysis),
      },
      { onConflict: "id" }
    );

    // Race prevention: if a newer version was issued for this case after we started,
    // discard our result — the newer call will handle the final status.
    if (versions.get(caseId) !== version) {
      inFlight--;
      // Do NOT call resolveStatus here; the newer version's doUpsert will.
      return;
    }

    if (error) {
      failed.set(caseId, payload);
      console.warn(`[caseStorage] sync failed — caseId: ${caseId}, error: ${error.message}`);
    } else {
      failed.delete(caseId);
    }

  } catch (err) {
    // Only record failure if we're still the latest version
    if (versions.get(caseId) === version) {
      failed.set(caseId, payload);
      console.warn(`[caseStorage] sync error — caseId: ${caseId}, error: ${err?.message || err}`);
    }
  }

  inFlight--;
  resolveStatus();
}

// Emit the correct terminal state when nothing is in flight.
// If there are still pending debounce timers, stay on 'syncing' — they will resolve.
function resolveStatus() {
  if (inFlight > 0) return; // another upsert is still running
  if (pending.size > 0) {
    // Debounce timers still ticking — stay in syncing
    emitStatus({ state: "syncing" });
    return;
  }
  emitStatus(
    failed.size > 0
      ? { state: "failed" }
      : { state: "saved", lastSavedAt: new Date().toISOString() }
  );
}

// ── Retry ─────────────────────────────────────────────────────

async function retryFailed() {
  if (failed.size === 0) return;
  for (const [caseId, payload] of failed) {
    const version = (versions.get(caseId) || 0) + 1;
    versions.set(caseId, version);
    doUpsert(caseId, payload, version);
  }
}

setInterval(retryFailed, RETRY_INTERVAL_MS);
if (typeof window !== "undefined") {
  window.addEventListener("online", retryFailed);
}

// ── Private helpers ───────────────────────────────────────────

function bgSaveRaw(userId, caseState) {
  if (!supabase) return;
  supabase
    .from("cases")
    .upsert(
      {
        id:              caseState.id,
        user_id:         userId,
        name:            caseState.name || "תיק ללא שם",
        data:            caseState,
        updated_at:      caseState.updatedAt,
        created_at:      caseState.createdAt,
        documents_count: caseState.caseFiles?.length || 0,
        has_analysis:    Boolean(caseState.analysis),
      },
      { onConflict: "id" }
    )
    .then(({ error }) => {
      if (error) console.warn("[caseStorage] save failed:", error.message);
    });
}

function bgDelete(caseId) {
  if (!supabase) return;
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return;
    supabase
      .from("cases")
      .delete()
      .eq("id", caseId)
      .eq("user_id", user.id)
      .then(({ error }) => {
        if (error) console.warn("[caseStorage] delete failed:", error.message);
      });
  });
}

function updateCasesIndex(caseState) {
  const cases   = listCases();
  const summary = {
    id:             caseState.id,
    name:           caseState.name || "תיק ללא שם",
    updatedAt:      caseState.updatedAt,
    createdAt:      caseState.createdAt,
    documentsCount: caseState.caseFiles?.length || 0,
    hasAnalysis:    Boolean(caseState.analysis),
  };
  const nextCases = [summary, ...cases.filter((item) => item.id !== caseState.id)];
  localStorage.setItem(CASES_INDEX_KEY, JSON.stringify(nextCases));
}
