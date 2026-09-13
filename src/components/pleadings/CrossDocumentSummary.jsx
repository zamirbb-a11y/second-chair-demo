// Compact, document-level rollup of how this pleading relates to whatever
// it was marked as responding to — derived entirely from the stored
// relations (never a separately model-written summary), so it can never
// drift from the detail underneath it. Numbers only — no interactive
// filtering, no visual weight beyond a single line, exactly the
// "navigation layer, not the finding itself" role this was designed for.

import { summarizeCrossDocumentRelations } from "../../lib/crossDocumentRelations.js";

export default function CrossDocumentSummary({ relations, analysisId, families, priorTitles }) {
  const s = summarizeCrossDocumentRelations(relations, analysisId, families);
  const priorLabel = priorTitles.length ? priorTitles.join(", ") : "המסמך הקודם";

  const stats = [
    s.respondsTo > 0 && {
      text: `${s.respondsTo} טענות נענו${
        s.respondsTo > 0
          ? ` (${[
              s.byStance.admits && `${s.byStance.admits} הודאה`,
              s.byStance.denies && `${s.byStance.denies} הכחשה`,
              s.byStance.partial && `${s.byStance.partial} מענה חלקי`,
              s.byStance.talks_past && `${s.byStance.talks_past} לא ממוקד`,
            ].filter(Boolean).join(" · ")})`
          : ""
      }`,
      tone: "slate",
    },
    s.contradicts > 0 && { text: `${s.contradicts} סתירות אפשריות`, tone: "red" },
    s.changed > 0 && { text: `${s.changed} שינויי עמדה`, tone: "amber" },
    s.repeats > 0 && { text: `${s.repeats} חזרות על עמדה קודמת`, tone: "slate" },
    s.notAddressed > 0 && { text: `${s.notAddressed} טענות ללא התייחסות מזוהה`, tone: "amber" },
  ].filter(Boolean);

  if (stats.length === 0) return null;

  const TONE_TEXT = { slate: "text-slate-600", red: "text-red-700", amber: "text-amber-700" };

  return (
    <div className="mt-3 max-w-[680px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
      <p className="text-xs text-slate-500 mb-1">ביחס ל{priorLabel}:</p>
      <p className="text-sm leading-relaxed">
        {stats.map((s, i) => (
          <span key={i} className={`font-semibold ${TONE_TEXT[s.tone]}`}>
            {i > 0 && <span className="text-slate-300 font-normal mx-1.5">·</span>}
            {s.text}
          </span>
        ))}
      </p>
    </div>
  );
}
