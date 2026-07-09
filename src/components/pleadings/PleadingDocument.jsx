// Annotated-document view: the pleading itself as a clean RTL numbered-
// paragraph document, with the analysis anchored onto it — tinted
// paragraphs and per-claim marker chips (red = key vulnerability,
// amber = gap, indigo = suggested arguments). Clicking a chip opens the
// claim; unanchorable notes live in a strip at the top.

import { useMemo } from "react";
import { splitParagraphs, anchorClaims, claimMarkers } from "../../lib/pleadingAnchors.js";

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

export default function PleadingDocument({
  pleadingText, analysis, selectedClaimId, onSelectClaim,
}) {
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
  );
}
