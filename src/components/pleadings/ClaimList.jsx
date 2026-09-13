// Left panel: Claim Families rail. One row per family — the same
// substantive claim restated across the document collapses to one row
// with an occurrence badge, instead of one row per raw claim node.
// Streaming-aware: families only exist once the pipeline's final stage
// completes, so mid-stream this naturally shows one row per raw claim
// (via deriveFamilies' singleton fallback) and "collapses" as clustering
// finishes — no special-casing needed for the in-progress state.

import { useState } from "react";
import { familyHasGap, primaryClaim } from "../../lib/claimFamilies.js";
import { highSalienceRelationsForFamily, sortByAlertPriority } from "../../lib/crossDocumentRelations.js";

// One compact line, worst-first — a family with several high-salience
// relations still shows only one, so a busy history never stacks rows.
const ALERT_LABELS = {
  contradicts: { text: "סתירה אפשרית עם עמדה קודמת", tone: "text-red-700 bg-red-400" },
  not_addressed: { text: "לא אותרה התייחסות לטענה זו", tone: "text-amber-700 bg-amber-400" },
  changed: { text: "שינוי עמדה אפשרי", tone: "text-amber-700 bg-amber-400" },
  responds_to_partial: { text: "מענה חלקי בלבד", tone: "text-amber-700 bg-amber-400" },
  responds_to_talks_past: { text: "מענה שאינו ממוקד בטענה עצמה", tone: "text-amber-700 bg-amber-400" },
  possible_scope_expansion: { text: "ייתכן שזו הרחבת חזית", tone: "text-amber-700 bg-amber-400" },
};

function alertFor(family, relations, analysisId) {
  const high = highSalienceRelationsForFamily(relations, analysisId, family.id);
  if (high.length === 0) return null;
  const r = sortByAlertPriority(high)[0];
  const key = r.type === "responds_to" ? `responds_to_${r.stance}` : r.type;
  return ALERT_LABELS[key] ?? null;
}

function FamilyRow({ family, claims, selected, onSelect, reviewed, onToggleReviewed, analyzing, relations, analysisId }) {
  const primary = primaryClaim(family, claims);
  const pending = analyzing && !primary?.qa;
  const gap = !pending && familyHasGap(family, claims);
  const alert = !pending ? alertFor(family, relations, analysisId) : null;
  const occurrences = family.member_ids.length;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={selected || undefined}
      onClick={() => onSelect(family.id)}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          onSelect(family.id);
        }
      }}
      className={[
        "flex items-start gap-2 px-3 py-2 cursor-pointer border-r-[3px] transition-all",
        selected ? "bg-blue-50 border-blue-500" : "border-transparent hover:bg-slate-50",
      ].join(" ")}
    >
      <input
        type="checkbox"
        checked={!!reviewed}
        disabled={pending}
        onClick={(e) => e.stopPropagation()}
        onChange={() => onToggleReviewed(family.id)}
        aria-label={`סמן כנבדקה: ${family.canonical_text.slice(0, 60)}`}
        className="mt-1 accent-slate-700 cursor-pointer flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5">
          <span
            className={[
              "text-xs leading-snug flex-1",
              selected ? "text-blue-700 font-semibold"
                : reviewed ? "text-slate-400"
                : "text-slate-700 font-medium",
            ].join(" ")}
          >
            {family.canonical_text}
          </span>
          {occurrences > 1 && (
            <span
              title={`מופיעה ${occurrences} פעמים`}
              className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-1.5 py-0.5 flex-shrink-0"
            >
              ×{occurrences}
            </span>
          )}
        </div>
        {pending ? (
          <span className="text-xs text-slate-400 italic">ממתין לביקורת…</span>
        ) : alert ? (
          <span className={`flex items-center gap-1 text-xs ${alert.tone.split(" ")[0]}`}>
            <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${alert.tone.split(" ")[1]}`} />
            {alert.text}
          </span>
        ) : gap ? (
          <span className="flex items-center gap-1 text-xs text-amber-700">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
            {[
              primary.qa.evidence_gap && "פער ראייתי",
              primary.qa.authority_gap && "פער אסמכתאות",
              primary.qa.logical_gap_flag && "פער לוגי",
            ].filter(Boolean).join(" · ")}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function ClaimList({
  families, claims, selectedFamilyId, onSelectFamily,
  reviewed, onToggleReviewed, analyzing,
  relations = [], analysisId,
}) {
  const [filter, setFilter] = useState("all");

  const passes = (f) =>
    filter === "all" ? true
    : filter === "gaps" ? familyHasGap(f, claims)
    : !reviewed[f.id];

  const visible = families.filter(passes);
  const reviewedCount = families.filter((f) => reviewed[f.id]).length;

  return (
    <div className="w-[320px] bg-[#f8f9fb] border-l border-slate-200 flex flex-col flex-shrink-0 h-full">
      <div className="px-4 h-12 border-b border-slate-100 flex-shrink-0 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-900">טענות ({families.length})</span>
        {families.length > 0 && (
          <span className="text-xs text-slate-500">{reviewedCount}/{families.length} נבדקו</span>
        )}
      </div>

      <div className="px-4 py-2 flex gap-1.5 border-b border-slate-100 flex-shrink-0">
        {[["all", "הכל"], ["gaps", "פערים"], ["unreviewed", "לבדיקה"]].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={[
              "text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer border transition-colors",
              filter === value
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto py-1" aria-live="polite">
        {families.length === 0 && analyzing && (
          <div className="px-4 py-3 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 rounded bg-slate-200 animate-pulse" style={{ width: `${85 - i * 12}%` }} />
                <div className="h-2.5 rounded bg-slate-100 animate-pulse" style={{ width: `${60 - i * 8}%` }} />
              </div>
            ))}
          </div>
        )}
        {visible.map((family) => (
          <FamilyRow
            key={family.id}
            family={family}
            claims={claims}
            selected={selectedFamilyId === family.id}
            onSelect={onSelectFamily}
            reviewed={reviewed[family.id]}
            onToggleReviewed={onToggleReviewed}
            analyzing={analyzing}
            relations={relations}
            analysisId={analysisId}
          />
        ))}
        {families.length > 0 && visible.length === 0 && (
          <p className="px-4 py-3 text-xs text-slate-500">
            {filter === "gaps" ? "אין טענות עם פערים." : "כל הטענות נבדקו."}
          </p>
        )}
      </div>
    </div>
  );
}
