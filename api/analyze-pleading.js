// Pleading decomposition & QA — 3-pass pipeline streaming NDJSON.
// Pass 1: skeleton (theory of case + main claims) — one call
// Pass 2: per-claim deep analysis — N parallel calls, streamed as they land;
//         lightweight node_kinds (remedy/background/procedural/conclusion)
//         skip the deep call and get empty QA
// Coverage audit (internal): section-to-claim mapping check; unmapped
//         substantive sections trigger one targeted recheck extraction;
//         warnings fold into coverage_notes
// Pass 3: authority/evidence/quotation dedup + normalization — one call
//
// Stream protocol (one JSON object per line):
//   {type:"stage",  stage:"skeleton"|"claims"|"audit"|"references"}
//   {type:"skeleton", document, theory_of_case, claims, coverage_notes}
//   {type:"claim_analysis", claim_id, sub_claims, qa, source_spans}
//   {type:"claim_error", claim_id, message}
//   {type:"claims_added", claims}          — recheck found missed claims
//   {type:"coverage_audit", warnings}      — internal; UI may ignore
//   {type:"references", authorities, evidence_refs, quotations}
//   {type:"done", analysis}   — the fully assembled PleadingAnalysis
//   {type:"error", message}

import { buildPass1Prompt, PASS1_SYSTEM } from "../src/prompts/pleadingPass1.js";
import { buildPass2Prompt, PASS2_SYSTEM, summarizeOtherClaims } from "../src/prompts/pleadingPass2.js";
import { buildPass3Prompt, PASS3_SYSTEM } from "../src/prompts/pleadingPass3.js";
import { buildCoverageAuditPrompt, AUDIT_SYSTEM, buildCoverageRecheckPrompt } from "../src/prompts/pleadingCoverageAudit.js";
import {
  validatePass1, validatePass2, verifySourceSpans,
  LIGHTWEIGHT_KINDS, EMPTY_QA,
} from "../src/lib/pleadingValidation.js";

const MODEL = "gpt-4.1";
// Mechanical passes (reference dedup, coverage mapping) run on mini:
// separate per-model TPM pool, ~5x cheaper, no legal judgment involved.
const MODEL_MINI = "gpt-4.1-mini";
const PASS2_CONTEXT_WINDOW = 3000; // chars around each source excerpt
const PASS2_FALLBACK_SLICE = 15000;
const PASS2_CONCURRENCY = 5; // stay under the org TPM limit
const RATE_LIMIT_RETRIES = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callModel({ system, prompt, temperature = 0.2, model = MODEL }) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        temperature,
      }),
    });
    const data = await response.json();
    if (response.status === 429 && attempt < RATE_LIMIT_RETRIES) {
      // "Please try again in 6.01s" — honor the hint, with headroom
      const hinted = parseFloat(data?.error?.message?.match(/try again in ([\d.]+)s/)?.[1]);
      const waitMs = (Number.isFinite(hinted) ? hinted * 1000 : 8000 * (attempt + 1)) + 1000;
      console.warn(`Rate limited, retry ${attempt + 1}/${RATE_LIMIT_RETRIES} in ${Math.round(waitMs)}ms`);
      await sleep(waitMs);
      continue;
    }
    if (!response.ok) {
      console.error("OpenAI call failed:", data);
      throw new Error(data?.error?.message || "OpenAI request failed");
    }
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content returned");
    return JSON.parse(content);
  }
}

// Run async tasks with a concurrency cap — full parallelism over 10+
// claims blows through the OpenAI TPM budget in one burst.
async function runLimited(items, limit, worker) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(limit, queue.length) }, async () => {
      while (queue.length > 0) await worker(queue.shift());
    })
  );
}

// Call with one retry when the validator reports problems; validation
// feedback is appended so the retry knows what to fix.
async function callWithRetry({ system, prompt, validate }) {
  let result = await callModel({ system, prompt });
  const errors = validate(result);
  if (errors.length === 0) return result;
  console.warn("Validation failed, retrying once:", errors);
  result = await callModel({
    system,
    prompt: `${prompt}\n\n---\nהפלט הקודם נפסל מהסיבות הבאות — תקן אותן:\n${errors.join("\n")}`,
    temperature: 0.1,
  });
  return result; // second result is accepted as-is; errors surface via review UI
}

// Deterministic dedup backstop after Pass 3 — the model occasionally
// returns the same citation twice; merge exact matches (normalized) and
// union their claim_ids and source_spans.
function dedupeReferences(items, keyFn, idPrefix) {
  const byKey = new Map();
  for (const item of items ?? []) {
    const key = (keyFn(item) ?? "").replace(/\s+/g, " ").trim().toLowerCase();
    if (!key) {
      byKey.set(Symbol(), item);
      continue;
    }
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...item });
    } else {
      existing.claim_ids = [...new Set([...(existing.claim_ids ?? []), ...(item.claim_ids ?? [])])];
      existing.source_spans = [...(existing.source_spans ?? []), ...(item.source_spans ?? [])];
      for (const field of ["normalized_citation", "verbatim_quote", "description", "proposition"]) {
        if (!existing[field] && item[field]) existing[field] = item[field];
      }
    }
  }
  return [...byKey.values()].map((item, i) => ({ ...item, id: `${idPrefix}${i + 1}` }));
}

// Targeted context for a Pass 2 call: windows around the claim's verified
// excerpts instead of the full document (falls back to a leading slice).
function buildSectionText(pleadingText, claim) {
  const normalizedDoc = pleadingText.replace(/\s+/g, " ");
  const windows = [];
  for (const span of claim.source_spans ?? []) {
    const excerpt = (span.excerpt ?? "").replace(/\s+/g, " ");
    if (!excerpt) continue;
    const idx = normalizedDoc.indexOf(excerpt);
    if (idx === -1) continue;
    const start = Math.max(0, idx - PASS2_CONTEXT_WINDOW);
    const end = Math.min(normalizedDoc.length, idx + excerpt.length + PASS2_CONTEXT_WINDOW);
    windows.push({ start, end });
  }
  if (windows.length === 0) return normalizedDoc.slice(0, PASS2_FALLBACK_SLICE);

  // merge overlapping windows
  windows.sort((a, b) => a.start - b.start);
  const merged = [windows[0]];
  for (const w of windows.slice(1)) {
    const last = merged[merged.length - 1];
    if (w.start <= last.end) last.end = Math.max(last.end, w.end);
    else merged.push(w);
  }
  return merged
    .map((w) => normalizedDoc.slice(w.start, w.end))
    .join("\n\n[...]\n\n");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { pleadingText, docType = "other", party = "unknown" } = req.body || {};
  if (!pleadingText?.trim() || pleadingText.trim().length < 200) {
    return res.status(400).json({ error: "pleadingText missing or too short" });
  }

  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  const send = (obj) => res.write(JSON.stringify(obj) + "\n");

  try {
    // ── Pass 1: skeleton ──────────────────────────────────────────────
    send({ type: "stage", stage: "skeleton" });
    const pass1 = await callWithRetry({
      system: PASS1_SYSTEM,
      prompt: buildPass1Prompt({ pleadingText, docType, party }),
      validate: validatePass1,
    });

    const mainClaims = (pass1.claims ?? []).map((c) =>
      verifySourceSpans(
        { ...c, child_ids: [], authority_ids: [], evidence_ref_ids: [], quotation_ids: [], qa: null },
        pleadingText
      )
    );
    send({
      type: "skeleton",
      document: pass1.document,
      theory_of_case: pass1.theory_of_case,
      claims: mainClaims,
      coverage_notes: pass1.coverage_notes ?? null,
    });

    // ── Pass 2: per-claim deep analysis, parallel ─────────────────────
    send({ type: "stage", stage: "claims" });
    const rawAuthorities = [];
    const rawEvidenceRefs = [];
    const rawQuotations = [];
    const subClaimsByParent = {};

    const failedClaims = [];

    async function analyzeClaim(claim) {
      // Lightweight kinds (remedy, background, procedural, conclusion) are
      // listed but not QA'd — a prayer for relief must not be flagged for
      // evidence gaps like a factual allegation.
      if (LIGHTWEIGHT_KINDS.has(claim.node_kind)) {
        claim.qa = { ...EMPTY_QA };
        subClaimsByParent[claim.id] = [];
        send({
          type: "claim_analysis",
          claim_id: claim.id,
          sub_claims: [],
          qa: claim.qa,
          source_spans: claim.source_spans,
        });
        return;
      }
      try {
        const result = await callWithRetry({
          system: PASS2_SYSTEM,
          prompt: buildPass2Prompt({
            claim,
            sectionText: buildSectionText(pleadingText, claim),
            otherClaimsSummary: summarizeOtherClaims(mainClaims, claim.id),
            theoryOfCase: pass1.theory_of_case,
          }),
          validate: (r) => validatePass2(r, claim.id),
        });

        const subClaims = (result.sub_claims ?? []).map((s) =>
          verifySourceSpans(
            { ...s, child_ids: [], authority_ids: [], evidence_ref_ids: [], quotation_ids: [] },
            pleadingText
          )
        );
        subClaimsByParent[claim.id] = subClaims;

        claim.qa = result.qa;
        if (Array.isArray(result.source_spans) && result.source_spans.length > 0) {
          // Pass 2 often re-quotes the excerpts Pass 1 already found, with a
          // slightly different section label — dedupe on normalized excerpt.
          const seen = new Set();
          const merged = [...claim.source_spans, ...result.source_spans].filter((s) => {
            const key = (s.excerpt ?? "").replace(/\s+/g, " ").trim();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          claim.source_spans = verifySourceSpans({ source_spans: merged }, pleadingText).source_spans;
        }
        claim.child_ids = subClaims.map((s) => s.id);

        for (const a of result.authorities ?? []) rawAuthorities.push({ ...a, claim_ids: [claim.id] });
        for (const e of result.evidence_refs ?? []) rawEvidenceRefs.push({ ...e, claim_ids: [claim.id] });
        for (const q of result.quotations ?? []) rawQuotations.push({ ...q, claim_ids: [claim.id] });

        send({
          type: "claim_analysis",
          claim_id: claim.id,
          sub_claims: subClaims,
          qa: result.qa,
          source_spans: claim.source_spans,
        });
      } catch (err) {
        console.error(`Pass 2 failed for ${claim.id}:`, err);
        failedClaims.push(claim);
      }
    }

    await runLimited(mainClaims, PASS2_CONCURRENCY, analyzeClaim);

    // Claims that exhausted their retries during the parallel burst get a
    // final serial attempt once the TPM window has recovered — the largest
    // claim of the pleading is exactly the one most likely to lose the race.
    if (failedClaims.length > 0) {
      const secondChance = failedClaims.splice(0);
      console.warn(`Retrying ${secondChance.length} rate-limited claims serially:`, secondChance.map((c) => c.id));
      await runLimited(secondChance, 1, analyzeClaim);
      for (const claim of failedClaims) {
        send({ type: "claim_error", claim_id: claim.id, message: "claim analysis failed" });
      }
    }

    // ── Coverage audit (internal) ─────────────────────────────────────
    // Verifies no substantive section went unmapped; unmapped material
    // triggers one targeted recheck. Warnings fold into coverage_notes.
    send({ type: "stage", stage: "audit" });
    const auditWarnings = [];
    try {
      const auditNodes = [
        ...mainClaims.map((c) => ({ id: c.id, node_kind: c.node_kind, text: c.text })),
        ...Object.values(subClaimsByParent).flat().map((s) => ({ id: s.id, node_kind: s.node_kind, text: s.text })),
        ...rawAuthorities.map((a, i) => ({ id: `rawA${i + 1}`, node_kind: "authority", text: a.raw_citation })),
        ...rawEvidenceRefs.map((e, i) => ({ id: `rawE${i + 1}`, node_kind: "evidence", text: e.label })),
      ];
      const audit = await callModel({
        system: AUDIT_SYSTEM,
        prompt: buildCoverageAuditPrompt({ pleadingText, nodes: auditNodes }),
        model: MODEL_MINI,
      });
      console.log("coverage audit section_map:", JSON.stringify(audit.section_map ?? []));

      const unmapped = audit.unmapped_substantive ?? [];
      if (unmapped.length > 0) {
        const nextIdNumber =
          Math.max(0, ...mainClaims.map((c) => parseInt(String(c.id).replace(/^C/, ""), 10) || 0)) + 1;
        const recheck = await callModel({
          system: PASS1_SYSTEM,
          prompt: buildCoverageRecheckPrompt({
            pleadingText,
            unmapped,
            existingClaims: mainClaims,
            nextIdNumber,
          }),
        });
        const added = (recheck.claims ?? []).map((c) =>
          verifySourceSpans(
            { ...c, child_ids: [], authority_ids: [], evidence_ref_ids: [], quotation_ids: [], qa: null },
            pleadingText
          )
        );
        if (added.length > 0) {
          mainClaims.push(...added);
          send({ type: "claims_added", claims: added });
          await runLimited(added, PASS2_CONCURRENCY, analyzeClaim);
          if (failedClaims.length > 0) {
            await runLimited(failedClaims.splice(0), 1, analyzeClaim);
            for (const claim of failedClaims) {
              send({ type: "claim_error", claim_id: claim.id, message: "claim analysis failed" });
            }
          }
          auditWarnings.push(`בדיקת כיסוי: נוספו ${added.length} טענות שלא נקלטו בחילוץ הראשון.`);
        } else {
          for (const u of unmapped) {
            auditWarnings.push(
              `בדיקת כיסוי: ${u.section ?? "מקטע"}${u.paragraphs ? ` פסקאות ${u.paragraphs}` : ""} לא מופה לטענה — נבדק מחדש ולא נמצאה טענה חסרה.`
            );
          }
        }
      }
      for (const f of audit.misclassification_flags ?? []) {
        auditWarnings.push(`בדיקת סיווג: ${f.claim_id} סווג כ-${f.current_kind} — ${f.note}`);
      }
      for (const w of audit.warnings ?? []) auditWarnings.push(w);
    } catch (err) {
      console.error("Coverage audit failed (non-blocking):", err);
      auditWarnings.push("בדיקת הכיסוי הפנימית לא הושלמה בריצה זו.");
    }
    send({ type: "coverage_audit", warnings: auditWarnings });

    // ── Pass 3: dedup + normalize references ──────────────────────────
    send({ type: "stage", stage: "references" });
    let references = { authorities: [], evidence_refs: [], quotations: [] };
    if (rawAuthorities.length + rawEvidenceRefs.length + rawQuotations.length > 0) {
      try {
        references = await callModel({
          system: PASS3_SYSTEM,
          prompt: buildPass3Prompt({ rawAuthorities, rawEvidenceRefs, rawQuotations }),
          model: MODEL_MINI,
        });
      } catch (err) {
        console.error("Pass 3 failed, returning raw references:", err);
        references = {
          authorities: rawAuthorities.map((a, i) => ({ id: `A${i + 1}`, normalized_citation: null, ...a })),
          evidence_refs: rawEvidenceRefs.map((e, i) => ({ id: `E${i + 1}`, ...e })),
          quotations: rawQuotations.map((q, i) => ({ id: `Q${i + 1}`, ...q })),
        };
      }
    }
    references.authorities = dedupeReferences(references.authorities, (a) => a.raw_citation, "A");
    references.evidence_refs = dedupeReferences(references.evidence_refs, (e) => e.label, "E");
    references.quotations = dedupeReferences(references.quotations, (q) => q.text, "Q");
    send({ type: "references", ...references });

    // link claims to reference ids
    const authorityIdsByClaim = {};
    for (const a of references.authorities ?? [])
      for (const cid of a.claim_ids ?? []) (authorityIdsByClaim[cid] ??= []).push(a.id);
    const evidenceIdsByClaim = {};
    for (const e of references.evidence_refs ?? [])
      for (const cid of e.claim_ids ?? []) (evidenceIdsByClaim[cid] ??= []).push(e.id);
    const quotationIdsByClaim = {};
    for (const q of references.quotations ?? [])
      for (const cid of q.claim_ids ?? []) (quotationIdsByClaim[cid] ??= []).push(q.id);

    const allClaims = [];
    for (const claim of mainClaims) {
      claim.authority_ids = authorityIdsByClaim[claim.id] ?? [];
      claim.evidence_ref_ids = evidenceIdsByClaim[claim.id] ?? [];
      claim.quotation_ids = quotationIdsByClaim[claim.id] ?? [];
      allClaims.push(claim);
      for (const sub of subClaimsByParent[claim.id] ?? []) {
        sub.authority_ids = authorityIdsByClaim[sub.id] ?? [];
        sub.evidence_ref_ids = evidenceIdsByClaim[sub.id] ?? [];
        sub.quotation_ids = quotationIdsByClaim[sub.id] ?? [];
        allClaims.push(sub);
      }
    }

    const coverageNotes =
      [pass1.coverage_notes, ...auditWarnings].filter(Boolean).join(" · ") || null;

    const analysis = {
      id: `pa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      document: pass1.document,
      theory_of_case: pass1.theory_of_case,
      claims: allClaims,
      authorities: references.authorities ?? [],
      evidence_refs: references.evidence_refs ?? [],
      quotations: references.quotations ?? [],
      coverage_notes: coverageNotes,
    };
    send({ type: "done", analysis });
    res.end();
  } catch (error) {
    console.error("analyze-pleading failed:", error);
    send({ type: "error", message: "pleading analysis failed" });
    res.end();
  }
}
