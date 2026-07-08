// כתבי טענות — top-level container. Three states: pleadings list, upload
// form, and the two-panel analysis view. Streams NDJSON from
// /api/analyze-pleading so claims and QA fill in live; analyses persist to
// localStorage per case (Supabase lands in a later phase).

import { useRef, useState } from "react";
import { uploadFileViaStorage } from "../utils/uploadViaStorage";
import PleadingList, { DOC_TYPE_LABELS, PARTY_LABELS } from "../components/pleadings/PleadingList.jsx";
import PleadingUpload from "../components/pleadings/PleadingUpload.jsx";
import ClaimList from "../components/pleadings/ClaimList.jsx";
import ClaimDetail from "../components/pleadings/ClaimDetail.jsx";

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
};

export default function PleadingAnalysisView({ caseId, accessToken }) {
  const [records, setRecords] = useState(() => loadRecords(caseId));
  const [mode, setMode] = useState("list"); // "list" | "upload" | "analysis"
  const [currentId, setCurrentId] = useState(null);
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [uploadError, setUploadError] = useState("");
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
  const selectedClaim = claims.find((c) => c.id === selectedClaimId) ?? null;
  const analyzing = draft !== null;

  const reviewed = current?.reviewed ?? {};
  function toggleReviewed(claimId) {
    if (!current) return;
    const nextReviewed = { ...reviewed, [claimId]: !reviewed[claimId] };
    if (!nextReviewed[claimId]) delete nextReviewed[claimId];
    persist(records.map((r) => (r.id === current.id ? { ...r, reviewed: nextReviewed } : r)));
  }

  // ── Streaming analysis ────────────────────────────────────────────────
  async function analyze({ file, docType, party }) {
    setUploadError("");
    setStatus("");
    setStage("reading");
    setDraft({ claims: [], authorities: [], evidence_refs: [], quotations: [] });
    setMode("analysis");
    setCurrentId(null);
    setSelectedClaimId(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Direct-to-Supabase-Storage upload (50MB) — bypasses Vercel's ~4.5MB
      // request-body platform limit that caps the legacy /api/upload path.
      const processed = await uploadFileViaStorage(file, accessToken);
      if (controller.signal.aborted) {
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      }
      const pleadingText = processed?.text ?? "";
      if (pleadingText.trim().length < 200) throw new Error("extraction_failed");

      const res = await fetch("/api/analyze-pleading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pleadingText, docType, party }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("analysis_failed");

      let working = { claims: [], authorities: [], evidence_refs: [], quotations: [] };
      const decoder = new TextDecoder();
      let buf = "";
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let ev;
          try { ev = JSON.parse(line); } catch { continue; }

          if (ev.type === "stage") {
            setStage(ev.stage);
          } else if (ev.type === "skeleton") {
            working = { ...working, document: ev.document, theory_of_case: ev.theory_of_case, claims: ev.claims };
            setDraft({ ...working });
          } else if (ev.type === "claim_analysis") {
            working.claims = working.claims.map((c) =>
              c.id === ev.claim_id
                ? { ...c, qa: ev.qa, source_spans: ev.source_spans ?? c.source_spans, child_ids: (ev.sub_claims ?? []).map((s) => s.id) }
                : c
            );
            working.claims = [...working.claims, ...(ev.sub_claims ?? [])];
            setDraft({ ...working });
          } else if (ev.type === "claims_added") {
            working.claims = [...working.claims, ...ev.claims];
            setDraft({ ...working });
          } else if (ev.type === "references") {
            working = { ...working, authorities: ev.authorities, evidence_refs: ev.evidence_refs, quotations: ev.quotations };
            setDraft({ ...working });
          } else if (ev.type === "done") {
            const record = {
              id: ev.analysis.id,
              docType,
              party,
              title: ev.analysis.document?.title || file.name,
              createdAt: new Date().toISOString(),
              reviewed: {},
              analysis: ev.analysis,
            };
            persist([record, ...records]);
            setCurrentId(record.id);
            setDraft(null);
            setStage(null);
          } else if (ev.type === "error") {
            throw new Error("analysis_failed");
          }
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
            : "הניתוח לא הושלם הפעם. הקובץ לא אבד — נסה שוב בעוד רגע."
        );
        setMode("upload");
      }
    } finally {
      abortRef.current = null;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  if (mode === "upload") {
    return (
      <PleadingUpload
        onAnalyze={analyze}
        onCancel={() => { setUploadError(""); setMode("list"); }}
        error={uploadError}
      />
    );
  }

  if (mode === "analysis" && (analyzing || current)) {
    const doc = analysis?.document;
    return (
      <div className="flex h-full min-h-0" dir="rtl">
        <ClaimList
          claims={claims}
          selectedClaimId={selectedClaimId}
          onSelectClaim={setSelectedClaimId}
          reviewed={reviewed}
          onToggleReviewed={toggleReviewed}
          analyzing={analyzing}
        />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header strip: current pleading + switcher + back */}
          <div className="h-12 px-5 border-b border-slate-200 flex items-center gap-3 flex-shrink-0 bg-white">
            <button
              type="button"
              onClick={() => { setMode("list"); setCurrentId(null); setSelectedClaimId(null); }}
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
                onChange={(e) => { setCurrentId(e.target.value); setSelectedClaimId(null); }}
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

          {/* Theory of case + coverage notes above the detail pane */}
          {analysis?.theory_of_case && !selectedClaim && (
            <div className="px-7 pt-5 flex-shrink-0">
              <h4 className="text-xs font-bold text-slate-500 mb-1">תיאוריית המקרה</h4>
              <p className="text-sm text-slate-700 leading-relaxed max-w-[680px]">{analysis.theory_of_case}</p>
              {analysis.coverage_notes && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-3 max-w-[680px]">
                  {analysis.coverage_notes}
                </p>
              )}
            </div>
          )}

          <ClaimDetail
            claim={selectedClaim}
            analysis={analysis ?? { claims: [] }}
            reviewed={selectedClaim ? !!reviewed[selectedClaim.id] : false}
            onToggleReviewed={toggleReviewed}
          />
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
        onOpen={(id) => { setCurrentId(id); setSelectedClaimId(null); setMode("analysis"); setStatus(""); }}
        onUploadNew={() => { setUploadError(""); setMode("upload"); setStatus(""); }}
        onRemove={(id) => persist(records.filter((r) => r.id !== id))}
      />
    </>
  );
}
