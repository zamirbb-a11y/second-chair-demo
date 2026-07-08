// Left panel: indented claim list with filters (all / gaps / unreviewed),
// review checkboxes, and gap dots. Streaming-aware: claims whose QA hasn't
// arrived yet show a pending state.

import { useState } from "react";

export function hasGap(claim) {
  return !!(claim.qa && (claim.qa.evidence_gap || claim.qa.authority_gap || claim.qa.logical_gap_flag));
}

function ClaimRow({ claim, level, selected, onSelect, reviewed, onToggleReviewed, analyzing }) {
  const pending = analyzing && !claim.qa;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={selected || undefined}
      onClick={() => onSelect(claim.id)}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          onSelect(claim.id);
        }
      }}
      className={[
        "flex items-start gap-2 py-2 cursor-pointer border-r-[3px] transition-all",
        level === 2 ? "pr-8 pl-3" : "pr-3 pl-3",
        selected ? "bg-blue-50 border-blue-500" : "border-transparent hover:bg-slate-50",
      ].join(" ")}
    >
      <input
        type="checkbox"
        checked={!!reviewed}
        disabled={pending}
        onClick={(e) => e.stopPropagation()}
        onChange={() => onToggleReviewed(claim.id)}
        aria-label={`סמן כנבדקה: ${claim.text.slice(0, 60)}`}
        className="mt-1 accent-slate-700 cursor-pointer flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={[
              "text-xs leading-snug flex-1",
              selected ? "text-blue-700 font-semibold"
                : reviewed ? "text-slate-400"
                : "text-slate-700 font-medium",
            ].join(" ")}
          >
            {claim.text}
          </span>
        </div>
        {pending ? (
          <span className="text-xs text-slate-400 italic">ממתין לביקורת…</span>
        ) : hasGap(claim) ? (
          <span className="flex items-center gap-1 text-xs text-amber-700">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
            {[
              claim.qa.evidence_gap && "פער ראייתי",
              claim.qa.authority_gap && "פער אסמכתאות",
              claim.qa.logical_gap_flag && "פער לוגי",
            ].filter(Boolean).join(" · ")}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function ClaimList({
  claims, selectedClaimId, onSelectClaim,
  reviewed, onToggleReviewed, analyzing,
}) {
  const [filter, setFilter] = useState("all");

  const mains = claims.filter((c) => c.level === 1);
  const subsOf = (id) => claims.filter((c) => c.parent_id === id);

  const passes = (c) =>
    filter === "all" ? true
    : filter === "gaps" ? hasGap(c)
    : !reviewed[c.id];

  // a main claim stays visible when any of its subs pass the filter
  const visibleMains = mains.filter((m) => passes(m) || subsOf(m.id).some(passes));
  const reviewedCount = claims.filter((c) => reviewed[c.id]).length;

  return (
    <div className="w-[320px] bg-[#f8f9fb] border-l border-slate-200 flex flex-col flex-shrink-0 h-full">
      <div className="px-4 h-12 border-b border-slate-100 flex-shrink-0 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-900">טענות ({mains.length})</span>
        {claims.length > 0 && (
          <span className="text-xs text-slate-500">{reviewedCount}/{claims.length} נבדקו</span>
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
        {claims.length === 0 && analyzing && (
          <div className="px-4 py-3 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 rounded bg-slate-200 animate-pulse" style={{ width: `${85 - i * 12}%` }} />
                <div className="h-2.5 rounded bg-slate-100 animate-pulse" style={{ width: `${60 - i * 8}%` }} />
              </div>
            ))}
          </div>
        )}
        {visibleMains.map((main) => (
          <div key={main.id}>
            <ClaimRow
              claim={main}
              level={1}
              selected={selectedClaimId === main.id}
              onSelect={onSelectClaim}
              reviewed={reviewed[main.id]}
              onToggleReviewed={onToggleReviewed}
              analyzing={analyzing}
            />
            {subsOf(main.id).filter((s) => filter === "all" || passes(s)).map((sub) => (
              <ClaimRow
                key={sub.id}
                claim={sub}
                level={2}
                selected={selectedClaimId === sub.id}
                onSelect={onSelectClaim}
                reviewed={reviewed[sub.id]}
                onToggleReviewed={onToggleReviewed}
                analyzing={analyzing}
              />
            ))}
          </div>
        ))}
        {claims.length > 0 && visibleMains.length === 0 && (
          <p className="px-4 py-3 text-xs text-slate-500">
            {filter === "gaps" ? "אין טענות עם פערים." : "כל הטענות נבדקו."}
          </p>
        )}
      </div>
    </div>
  );
}
