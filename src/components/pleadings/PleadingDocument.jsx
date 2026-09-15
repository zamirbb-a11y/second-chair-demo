// Annotated-document view. For PDFs, the real filed document renders via
// PdfFamilyOverlay with Claim Family occurrences highlighted directly on
// it (position-anchored, not text-matched — see PdfFamilyOverlay.jsx for
// why). For everything else (DOCX/TXT, or old records with no stored
// PDF), a reconstructed RTL numbered-paragraph document with per-claim
// marker chips (red = key vulnerability, amber = gap, indigo = suggested
// arguments) — not yet family-aware, still per raw claim.

import { useEffect, useMemo, useState } from "react";
import { splitParagraphs, anchorClaims, claimMarkers } from "../../lib/pleadingAnchors.js";
import PdfFamilyOverlay from "./PdfFamilyOverlay.jsx";

const MARKER_ORDER = ["vulnerability", "gap", "suggestion"];
const MARKER_STYLES = {
  vulnerability: "bg-red-50 text-red-700 border-red-200",
  gap: "bg-amber-50 text-amber-800 border-amber-200",
  suggestion: "bg-indigo-50 text-indigo-700 border-indigo-200",
  none: "bg-slate-50 text-slate-600 border-slate-200",
};

function strongestMarker(claim) {
  const markers = claimMarkers(claim);
  for (const kind of MARKER_ORDER) if (markers.includes(kind)) return kind;
  return "none";
}

function ClaimChip({ claim, selected, onSelect }) {
  const kind = strongestMarker(claim);
  return (
    <button
      type="button"
      onClick={() => onSelect(claim.id)}
      aria-pressed={selected}
      title={claim.text}
      className={[
        "text-xs font-bold px-2 py-0.5 rounded-full border cursor-pointer transition-all",
        MARKER_STYLES[kind],
        selected ? "ring-2 ring-blue-400" : "hover:brightness-95",
      ].join(" ")}
    >
      {claim.id}
    </button>
  );
}

// Original-PDF mode: the real filed document, rendered via pdf.js with
// Claim Family occurrences highlighted directly on it — see
// PdfFamilyOverlay.jsx. Fetches a signed download URL the same way the
// old iframe-based viewer did.
function OriginalPdfView({ storagePath, accessToken, families, selectedFamilyId, onSelectFamily }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/storage", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ action: "get-download-url", storagePath }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) setUrl(d.signedUrl); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [storagePath, accessToken]);

  if (error) return <p className="p-6 text-sm text-slate-500">לא הצלחתי לטעון את הקובץ המקורי מהאחסון.</p>;
  if (!url) return <p className="p-6 text-sm text-slate-500">טוען את המסמך המקורי…</p>;

  return (
    <PdfFamilyOverlay
      url={url}
      families={families}
      selectedFamilyId={selectedFamilyId}
      onSelectFamily={onSelectFamily}
    />
  );
}

export default function PleadingDocument({
  pleadingText, analysis, families,
  selectedClaimId, onSelectClaim,
  selectedFamilyId, onSelectFamily,
  original,
}) {
  const originalAvailable = !!(original?.storagePath && original?.fileType === "pdf" && original?.accessToken);
  // Defaults to the real PDF when there is one — richer (real layout,
  // real formatting) — but some filed PDFs place Hebrew glyphs in
  // left-to-right visual order on the page itself (a source-document
  // authoring bug, not an extraction one — see OriginalPdfView's own
  // note). The page then renders exactly that scrambled layout even
  // though text extraction's own bidi-aware reconstruction reads it
  // correctly, so the reconstructed view stays one click away for
  // exactly that case.
  const [viewSource, setViewSource] = useState("original");
  const showOriginal = originalAvailable && viewSource === "original";

  const sourceToggle = originalAvailable && (
    <div className="flex-shrink-0 bg-slate-100 border-b border-slate-200 px-3 py-1.5 flex items-center gap-2" dir="rtl">
      <span className="text-xs text-slate-500">תצוגת מסמך:</span>
      <span className="flex rounded-lg border border-slate-200 overflow-hidden bg-white" role="group" aria-label="מקור התצוגה">
        {[["original", "המסמך המקורי"], ["reconstructed", "טקסט משוחזר"]].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setViewSource(value)}
            aria-pressed={viewSource === value}
            className={[
              "text-xs font-semibold px-2.5 py-1 cursor-pointer transition-colors",
              viewSource === value ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </span>
      {viewSource === "reconstructed" && (
        <span className="text-xs text-slate-400">
          טקסט שחולץ מהקובץ — לשימוש כשעימוד המסמך המקורי אינו קריא
        </span>
      )}
    </div>
  );

  if (showOriginal) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {sourceToggle}
        <OriginalPdfView
          storagePath={original.storagePath}
          accessToken={original.accessToken}
          families={families ?? []}
          selectedFamilyId={selectedFamilyId}
          onSelectFamily={onSelectFamily}
        />
      </div>
    );
  }
  const claims = analysis?.claims ?? [];
  const { paragraphs, byParagraph, unanchored } = useMemo(() => {
    const paragraphs = splitParagraphs(pleadingText ?? "");
    const { byParagraph, unanchored } = anchorClaims(paragraphs, claims);
    return { paragraphs, byParagraph, unanchored };
  }, [pleadingText, claims]);

  const claimById = (id) => claims.find((c) => c.id === id);
  const selectedParas = useMemo(() => {
    if (!selectedClaimId) return new Set();
    const set = new Set();
    for (const [paraIndex, ids] of byParagraph) {
      if (ids.includes(selectedClaimId)) set.add(paraIndex);
    }
    return set;
  }, [byParagraph, selectedClaimId]);

  const unanchoredClaims = unanchored.map(claimById).filter(Boolean);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {sourceToggle}
      <div className="flex-1 overflow-y-auto" dir="rtl">
        <div className="max-w-[760px] mx-auto px-8 py-8">
          {/* Notes strip: document-level observations + unanchorable notes */}
          {(analysis?.coverage_notes || unanchoredClaims.length > 0) && (
            <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 space-y-2">
              {analysis?.coverage_notes && <p>{analysis.coverage_notes}</p>}
              {unanchoredClaims.length > 0 && (
                <p className="flex items-center gap-2 flex-wrap">
                  <span>הערות שלא אותר להן מיקום במסמך:</span>
                  {unanchoredClaims.map((c) => (
                    <ClaimChip key={c.id} claim={c} selected={selectedClaimId === c.id} onSelect={onSelectClaim} />
                  ))}
                </p>
              )}
            </div>
          )}

          {/* The document */}
          <div className="bg-white border border-slate-200 rounded-2xl px-8 py-7 shadow-sm">
            {paragraphs.map((p) => {
              const claimIds = byParagraph.get(p.index) ?? [];
              const paraClaims = claimIds.map(claimById).filter(Boolean);
              const hasNotes = paraClaims.some((c) => claimMarkers(c).length > 0);
              const isSelected = selectedParas.has(p.index);
              return (
                <div
                  key={p.index}
                  className={[
                    "flex gap-3 rounded-lg px-2 -mx-2 py-1.5 transition-colors",
                    isSelected ? "bg-blue-50 ring-1 ring-blue-200"
                      : hasNotes ? "bg-amber-50/50"
                      : "",
                  ].join(" ")}
                >
                  <span className="w-8 flex-shrink-0 text-xs text-slate-400 font-semibold text-left pt-1 select-none">
                    {p.number ?? ""}
                  </span>
                  <p
                    className={[
                      "flex-1 min-w-0 text-sm leading-[1.9] text-slate-800 whitespace-pre-line",
                      p.number === null ? "font-bold" : "",
                    ].join(" ")}
                  >
                    {p.text}
                  </p>
                  {paraClaims.length > 0 && (
                    <span className="flex-shrink-0 flex flex-col items-start gap-1 pt-1">
                      {paraClaims.map((c) => (
                        <ClaimChip key={c.id} claim={c} selected={selectedClaimId === c.id} onSelect={onSelectClaim} />
                      ))}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
