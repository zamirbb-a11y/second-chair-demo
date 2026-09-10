// כתבי טענות — top-level container. Three states: pleadings list, upload
// form, and the two-panel analysis view. Streams NDJSON from
// /api/analyze-pleading so claims and QA fill in live; analyses persist to
// localStorage per case (Supabase lands in a later phase).
//
// The claims panel always operates on Claim Families, not raw claims —
// deriveFamilies() falls back to "every claim is its own family" both for
// analyses saved before this feature shipped and for the in-progress
// stream before the pipeline's families stage completes, so the list
// naturally "collapses" from one row per raw claim to fewer family rows
// once clustering finishes, with no special-casing here.

import { useRef, useState } from "react";
import { runPleadingAnalysis } from "../lib/pleadingPipeline.js";
import { uploadFileViaStorage } from "../utils/uploadViaStorage";
import { deriveFamilies, familyContaining } from "../lib/claimFamilies.js";
import CrossDocumentSummary from "../components/pleadings/CrossDocumentSummary.jsx";
import PleadingList, { DOC_TYPE_LABELS, PARTY_LABELS } from "../components/pleadings/PleadingList.jsx";
import PleadingUpload from "../components/pleadings/PleadingUpload.jsx";
import ClaimList from "../components/pleadings/ClaimList.jsx";
import ClaimDetail from "../components/pleadings/ClaimDetail.jsx";
import PleadingDocument from "../components/pleadings/PleadingDocument.jsx";

const storageKey = (caseId) => `pleadingAnalyses:${caseId ?? "no-case"}`;

function loadRecords(caseId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(caseId))) ?? [];
  } catch {
    return [];
  }
}

const STAGE_LABELS = {
  reading:    "קורא את המסמך…",
  skeleton:   "מחלץ טענות…",
  claims:     "מבצע ביקורת על הטענות…",
  audit:      "בודק כיסוי מול המסמך…",
  references: "מאחד אסמכתאות וראיות…",
  families:   "מאתר טענות חוזרות…",
  relations:  "משווה לכתב הטענות הקודם…",
};

export default function PleadingAnalysisView({ caseId, accessToken }) {
  const [records, setRecords] = useState(() => loadRecords(caseId));
  const [mode, setMode] = useState("list"); // "list" | "upload" | "analysis"
  const [viewMode, setViewMode] = useState("claims"); // "claims" | "document"
  const [currentId, setCurrentId] = useState(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [lastAttempt, setLastAttempt] = useState(null);
  const [status, setStatus] = useState("");

  // live-analysis state
  const [stage, setStage] = useState(null);
  const [draft, setDraft] = useState(null); // partial analysis while streaming
  const abortRef = useRef(null);

  function persist(next) {
    setRecords(next);
    try {
      localStorage.setItem(storageKey(caseId), JSON.stringify(next));
    } catch (err) {
      console.error("pleading persist failed:", err);
      setStatus("הניתוח הושלם אך לא נשמר מקומית — ייתכן שאחסון הדפדפן מלא.");
    }
  }

  const current = records.find((r) => r.id === currentId) ?? null;
  const analysis = draft ?? current?.analysis ?? null;
  const claims = analysis?.claims ?? [];
  const families = deriveFamilies(analysis);
  const selectedFamily = families.find((f) => f.id === selectedFamilyId) ?? null;
  const analyzing = draft !== null;

  // Case-wide pool, not just this document's own relations — a family's
  // History needs to show relations pointed at it from a LATER document
  // too (e.g. a reply's not_addressed finding about a defense claim), and
  // this is what lets History grow into a real chain later with no
  // redesign: every relation just names two (analysisId, familyId) pairs.
  const allRelations = records.flatMap((r) => r.analysis?.cross_document_relations ?? []);
  const recordByAnalysisId = new Map(records.map((r) => [r.analysis?.id, r]));

  function jumpToFamily(analysisId, familyId) {
    const target = recordByAnalysisId.get(analysisId);
    if (!target) return;
    setCurrentId(target.id);
    setSelectedFamilyId(familyId);
  }

  // For rendering a relation's "other side" in History: which document is
  // it from, and what does that family actually say. familyId is optional
  // (a not_addressed relation's target names a document with no specific
  // family — "this document never answered it" — so the doc title alone
  // still needs to resolve).
  function resolveFamilyRef(analysisId, familyId) {
    const record = recordByAnalysisId.get(analysisId);
    if (!record) return null;
    const family = familyId ? deriveFamilies(record.analysis).find((f) => f.id === familyId) : null;
    if (familyId && !family) return null;
    return { family, docTitle: record.title, docType: record.docType, analysisId, filingDate: record.filingDate ?? null };
  }

  const reviewed = current?.reviewed ?? {};
  function toggleReviewed(familyId) {
    if (!current) return;
    const nextReviewed = { ...reviewed, [familyId]: !reviewed[familyId] };
    if (!nextReviewed[familyId]) delete nextReviewed[familyId];
    persist(records.map((r) => (r.id === current.id ? { ...r, reviewed: nextReviewed } : r)));
  }

  // ── Streaming analysis ────────────────────────────────────────────────
  async function analyze({ file, docType, party, respondsTo = [], filingDate = null }) {
    setUploadError("");
    setLastAttempt({ file, docType, party, respondsTo, filingDate });
    setStatus("");
    setStage("reading");
    setDraft({ claims: [], authorities: [], evidence_refs: [], quotations: [], claim_families: [], cross_document_relations: [] });
    setMode("analysis");
    setCurrentId(null);
    setSelectedFamilyId(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Preferred: direct-to-Supabase-Storage upload (50MB), bypassing
      // Vercel's ~4.5MB request-body platform limit. Falls back to the legacy
      // multipart path (4MB cap) when there's no session OR the storage leg
      // fails (e.g. bucket not provisioned) — small files work either way.
      let pleadingText = null;
      let storagePath = null; // kept for original-document display
      let ocrReview = null; // {needsManualReview, unreadablePages} — only set for scanned PDFs
      if (accessToken) {
        try {
          const processed = await uploadFileViaStorage(file, accessToken);
          pleadingText = processed?.text ?? "";
          storagePath = processed?.storagePath ?? null;
          if (processed?.needsManualReview) {
            ocrReview = { needsManualReview: true, unreadablePages: (processed.ocrPages ?? []).filter((p) => p.status === "unreadable").map((p) => p.page) };
          }
        } catch (storageErr) {
          console.error("storage upload failed, falling back to /api/upload:", storageErr);
        }
        if (controller.signal.aborted) {
          throw Object.assign(new Error("aborted"), { name: "AbortError" });
        }
      }
      if (pleadingText === null) {
        if (file.size > 4 * 1024 * 1024) throw new Error("too_large_local");
        const form = new FormData();
        form.append("files", file);
        const up = await fetch("/api/upload", { method: "POST", body: form, signal: controller.signal });
        if (!up.ok) throw new Error("upload_failed");
        const upData = await up.json();
        const uploaded = upData.files?.[0];
        pleadingText = (upData.files ?? []).map((f) => f?.text ?? "").join("\n\n");
        if (uploaded?.needsManualReview) {
          ocrReview = { needsManualReview: true, unreadablePages: (uploaded.ocrPages ?? []).filter((p) => p.status === "unreadable").map((p) => p.page) };
        }
      }
      if (pleadingText.trim().length < 200) throw new Error("extraction_failed");

      // Prior pleadings this one was explicitly marked as responding to —
      // their already-computed families are what cross-document relations
      // get matched against. Never inferred, only what the user picked.
      const priorDocs = respondsTo
        .map((id) => records.find((r) => r.id === id))
        .filter(Boolean)
        .map((r) => ({ analysisId: r.analysis.id, party: r.party, families: r.analysis.claim_families ?? [] }));

      // Client-orchestrated pipeline: each server call is short, so the
      // platform's 300s function cap can never kill a run mid-analysis.
      let working = { claims: [], authorities: [], evidence_refs: [], quotations: [], claim_families: [], cross_document_relations: [] };
      try {
        const analysis = await runPleadingAnalysis({
          pleadingText,
          docType,
          party,
          priorDocs,
          signal: controller.signal,
          on: {
            stage: setStage,
            skeleton: (s) => {
              working = { ...working, document: s.document, theory_of_case: s.theory_of_case, claims: s.claims, coverage_notes: s.coverage_notes };
              setDraft({ ...working });
            },
            claim: (r) => {
              // Same defensive filter as pleadingPipeline.js's analyzeClaim:
              // an atomic claim should yield sub_claims: [], but the model
              // occasionally echoes the prompt's blank schema-example
              // sub_claim instead. Only matters here for a partial record
              // saved after an interrupted run — a completed run's on.done
              // analysis already comes back through that filter.
              const validSubClaims = (r.sub_claims ?? []).filter(
                (s) => s?.id && typeof s.text === "string" && s.text.trim().length > 0
              );
              working.claims = working.claims.map((c) =>
                c.id === r.claim_id
                  ? { ...c, qa: r.qa, source_spans: r.source_spans ?? c.source_spans, child_ids: validSubClaims.map((s) => s.id) }
                  : c
              );
              working.claims = [...working.claims, ...validSubClaims];
              setDraft({ ...working });
            },
            claimsAdded: (added) => {
              working.claims = [...working.claims, ...added];
              setDraft({ ...working });
            },
            references: (refs) => {
              working = { ...working, ...refs };
              setDraft({ ...working });
            },
            families: (fams) => {
              working = { ...working, claim_families: fams };
              setDraft({ ...working });
            },
            relations: (rels) => {
              working = { ...working, cross_document_relations: rels };
              setDraft({ ...working });
            },
          },
        });
        const record = {
          id: analysis.id,
          docType,
          party,
          title: analysis.document?.title || file.name,
          createdAt: new Date().toISOString(),
          filingDate, // ISO date (YYYY-MM-DD) as entered at upload, or null — drives History's chronological order
          reviewed: {},
          pleadingText, // the document view renders the pleading itself
          storagePath,  // original file in Supabase Storage (PDF display)
          fileType: (file.name.split(".").pop() ?? "").toLowerCase(),
          ocrReview, // {needsManualReview, unreadablePages} for scanned-PDF uploads, else null
          analysis,
        };
        persist([record, ...records]);
        setCurrentId(record.id);
        setDraft(null);
        setStage(null);
      } catch (pipelineErr) {
        // Keep whatever fully arrived instead of losing the run.
        if (pipelineErr?.name !== "AbortError" && working.claims.some((c) => c.qa)) {
          const record = {
            id: `pa_partial_${Date.now()}`,
            docType,
            party,
            title: working.document?.title || file.name,
            createdAt: new Date().toISOString(),
            filingDate,
            reviewed: {},
            pleadingText,
            ocrReview,
            analysis: {
              ...working,
              coverage_notes: [working.coverage_notes, "הניתוח נקטע לפני סיום — ייתכן שחלק מהטענות חסרות או ללא ביקורת."]
                .filter(Boolean).join(" · "),
            },
          };
          persist([record, ...records]);
          setCurrentId(record.id);
          setDraft(null);
          setStage(null);
          setStatus("הניתוח נקטע לפני סיום ונשמר באופן חלקי.");
        } else {
          throw pipelineErr;
        }
      }
    } catch (err) {
      setDraft(null);
      setStage(null);
      if (err?.name === "AbortError") {
        setStatus("הניתוח בוטל.");
        setMode("list");
      } else {
        console.error("pleading analysis failed:", err);
        setUploadError(
          err.message === "extraction_failed"
            ? "לא הצלחתי לחלץ טקסט מהקובץ — נסה קובץ אחר או פורמט אחר."
            : err.message === "too_large_local"
            ? "ללא התחברות (סביבת פיתוח מקומית) ניתן להעלות קבצים עד 4MB."
            : err.message === "insufficient_quota"
            ? "מכסת ה-AI של המערכת מוצתה. יש לטעון קרדיט בחשבון OpenAI ואז לנסות שוב."
            : "הניתוח לא הושלם הפעם. הקובץ והבחירות נשמרו — נסה שוב בעוד רגע."
        );
        setMode("upload");
      }
    } finally {
      abortRef.current = null;
    }
  }

  // Bridges the document view's per-claim selection to family selection:
  // clicking a paragraph chip for any occurrence selects the family that
  // contains it (clicking the currently-active occurrence deselects).
  function selectFamilyForClaim(claimId) {
    if (claimId === selectedFamily?.primary_member_id) {
      setSelectedFamilyId(null);
      return;
    }
    const fam = familyContaining(families, claimId);
    setSelectedFamilyId(fam?.id ?? null);
  }

  // ── Render ────────────────────────────────────────────────────────────
  if (mode === "upload") {
    return (
      <PleadingUpload
        onAnalyze={analyze}
        onCancel={() => { setUploadError(""); setMode("list"); }}
        error={uploadError}
        initial={lastAttempt}
        priorRecords={records}
        maxSizeLabel={accessToken ? "50MB" : "4MB"}
      />
    );
  }

  if (mode === "analysis" && (analyzing || current)) {
    const doc = analysis?.document;
    // The document view needs the pleading text, which only new records carry.
    const documentAvailable = !analyzing && !!current?.pleadingText;
    const effectiveView = viewMode === "document" && documentAvailable ? "document" : "claims";
    return (
      <div className="flex h-full min-h-0" dir="rtl">
        {effectiveView === "claims" && (
        <ClaimList
          families={families}
          claims={claims}
          selectedFamilyId={selectedFamilyId}
          onSelectFamily={setSelectedFamilyId}
          reviewed={reviewed}
          onToggleReviewed={toggleReviewed}
          analyzing={analyzing}
          analysisId={analysis?.id}
          relations={allRelations}
        />
        )}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header strip: current pleading + switcher + back */}
          <div className="h-12 px-5 border-b border-slate-200 flex items-center gap-3 flex-shrink-0 bg-white">
            <button
              type="button"
              onClick={() => { setMode("list"); setCurrentId(null); setSelectedFamilyId(null); }}
              className="text-xs text-slate-500 hover:text-slate-700 bg-transparent border-0 cursor-pointer p-0 flex-shrink-0"
            >
              → כל כתבי הטענות
            </button>
            <span aria-hidden="true" className="h-4 w-px bg-slate-200" />
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 flex-shrink-0">
              {DOC_TYPE_LABELS[current?.docType ?? doc?.type] ?? ""}
            </span>
            {PARTY_LABELS[current?.party ?? doc?.party] && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 flex-shrink-0">
                {PARTY_LABELS[current?.party ?? doc?.party]}
              </span>
            )}
            <span className="text-sm font-semibold text-slate-800 truncate">
              {current?.title ?? doc?.title ?? ""}
            </span>
            <span className="flex-1" />
            {!analyzing && (
              <span className="flex rounded-lg border border-slate-200 overflow-hidden flex-shrink-0" role="group" aria-label="תצוגה">
                {[["claims", "טענות"], ["document", "מסמך"]].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setViewMode(value)}
                    disabled={value === "document" && !documentAvailable}
                    title={value === "document" && !documentAvailable ? "זמין לניתוחים חדשים בלבד" : undefined}
                    aria-pressed={effectiveView === value}
                    className={[
                      "text-xs font-semibold px-3 py-1 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-default",
                      effectiveView === value ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </span>
            )}
            {analyzing ? (
              <span className="flex items-center gap-2 flex-shrink-0" role="status">
                <span aria-hidden="true" className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
                <span className="text-xs text-slate-600">{STAGE_LABELS[stage] ?? "מנתח…"}</span>
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-full px-3 py-1 bg-white cursor-pointer"
                >
                  בטל
                </button>
              </span>
            ) : records.length > 1 && (
              <select
                value={currentId ?? ""}
                onChange={(e) => { setCurrentId(e.target.value); setSelectedFamilyId(null); }}
                aria-label="מעבר לכתב טענות אחר"
                className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white outline-none max-w-[220px] flex-shrink-0"
              >
                {records.map((r) => (
                  <option key={r.id} value={r.id}>
                    {DOC_TYPE_LABELS[r.docType]} · {r.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {!analyzing && current?.ocrReview?.needsManualReview && (
            <p
              role="status"
              className="flex-shrink-0 text-xs text-amber-800 bg-amber-50 border-b border-amber-200 px-5 py-2"
            >
              <b className="font-bold">מסמך סרוק — {current.ocrReview.unreadablePages.length} עמודים לא זוהו אוטומטית</b>
              {" "}(עמ׳ {current.ocrReview.unreadablePages.join(", ")}) — הניתוח אינו כולל אותם. יש לבדוק מול המקור.
            </p>
          )}

          {effectiveView === "document" ? (
            <div className="flex-1 flex min-h-0">
              <PleadingDocument
                pleadingText={current.pleadingText}
                analysis={analysis}
                families={families}
                selectedFamilyId={selectedFamilyId}
                onSelectFamily={setSelectedFamilyId}
                selectedClaimId={selectedFamily?.primary_member_id ?? null}
                onSelectClaim={selectFamilyForClaim}
                original={{ storagePath: current.storagePath, fileType: current.fileType, accessToken }}
              />
              {selectedFamily && (
                <aside className="w-[400px] flex-shrink-0 flex flex-col border-r border-slate-200 bg-white min-h-0">
                  <ClaimDetail
                    family={selectedFamily}
                    claims={claims}
                    analysis={analysis ?? { claims: [] }}
                    reviewed={!!reviewed[selectedFamily.id]}
                    onToggleReviewed={toggleReviewed}
                    analysisId={analysis?.id}
                    relations={allRelations}
                    resolveFamilyRef={resolveFamilyRef}
                    onJumpToFamily={jumpToFamily}
                  />
                </aside>
              )}
            </div>
          ) : (
          <>
          {/* Theory of case + coverage notes above the detail pane */}
          {analysis?.theory_of_case && !selectedFamily && (
            <div className="px-7 pt-5 flex-shrink-0">
              <h4 className="text-xs font-bold text-slate-500 mb-1">תיאוריית המקרה</h4>
              <p className="text-sm text-slate-700 leading-relaxed max-w-[680px]">{analysis.theory_of_case}</p>
              {analysis.coverage_notes && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-3 max-w-[680px]">
                  {analysis.coverage_notes}
                </p>
              )}
              {analysis.cross_document_relations?.length > 0 && (
                <CrossDocumentSummary
                  relations={analysis.cross_document_relations}
                  analysisId={analysis.id}
                  families={families}
                  priorTitles={(analysis.respondsTo ?? []).map((id) => recordByAnalysisId.get(id)?.title).filter(Boolean)}
                />
              )}
            </div>
          )}

          <ClaimDetail
            family={selectedFamily}
            claims={claims}
            analysis={analysis ?? { claims: [] }}
            reviewed={selectedFamily ? !!reviewed[selectedFamily.id] : false}
            onToggleReviewed={toggleReviewed}
            analysisId={analysis?.id}
            relations={allRelations}
            resolveFamilyRef={resolveFamilyRef}
            onJumpToFamily={jumpToFamily}
          />
          </>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {status && (
        <p className="mx-8 mt-4 text-sm text-slate-600 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 max-w-[760px]" role="status">
          {status}
        </p>
      )}
      <PleadingList
        records={records}
        onOpen={(id) => { setCurrentId(id); setSelectedFamilyId(null); setMode("analysis"); setStatus(""); }}
        onUploadNew={() => { setUploadError(""); setMode("upload"); setStatus(""); }}
        onRemove={(id) => persist(records.filter((r) => r.id !== id))}
      />
    </>
  );
}
