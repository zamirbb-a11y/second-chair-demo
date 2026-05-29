const STRENGTH_LABELS = {
  very_strong:   "גבוה מאוד",
  strong:        "גבוה",
  medium_strong: "בינוני-גבוה",
  medium:        "בינוני",
  medium_weak:   "בינוני-נמוך",
  weak:          "נמוך",
  very_weak:     "נמוך מאוד",
  unclear:       "לא ברור",
};

function strengthLabel(v) {
  return STRENGTH_LABELS[v] ?? v ?? "—";
}

function strengthDotClass(strength) {
  if (["very_strong", "strong"].includes(strength))   return "bg-emerald-500";
  if (strength === "medium_strong")                   return "bg-blue-500";
  if (strength === "medium")                          return "bg-slate-400";
  if (strength === "medium_weak")                     return "bg-amber-400";
  if (["weak", "very_weak"].includes(strength))       return "bg-orange-400";
  return "bg-slate-300";
}

function strengthTextClass(strength) {
  if (["very_strong", "strong"].includes(strength))   return "text-emerald-700";
  if (strength === "medium_strong")                   return "text-blue-700";
  if (strength === "medium")                          return "text-slate-500";
  if (strength === "medium_weak")                     return "text-amber-700";
  if (["weak", "very_weak"].includes(strength))       return "text-orange-700";
  return "text-slate-400";
}

// Case-level pending: caseAssessmentChange
function CasePendingDelta({ delta, onAccept, onReject }) {
  const change = delta?.caseAssessmentChange;
  if (!change) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6">
      <div className="text-[10px] font-bold text-amber-700 tracking-[0.07em] uppercase mb-2">
        עדכון ממתין — הערכת סיכויי התיק
      </div>
      <div className="text-[14px] text-amber-900 leading-relaxed mb-1">
        הערכת הסיכויים הכוללת השתנתה:{" "}
        <span className="font-semibold">{change.previousLevel}</span>
        {" → "}
        <span className="font-semibold">{change.newLevel}</span>
      </div>
      {change.reason && (
        <div className="text-[12.5px] text-amber-700 leading-relaxed mb-3">
          {change.reason}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => onAccept?.(change)}
          className="bg-emerald-700 text-white border-0 rounded-lg px-4 py-1.5 text-[12px] font-bold cursor-pointer hover:bg-emerald-800"
        >
          ✓ אשר עדכון
        </button>
        <button
          onClick={() => onReject?.()}
          className="bg-white text-slate-500 border border-slate-200 rounded-lg px-4 py-1.5 text-[12px] font-semibold cursor-pointer hover:bg-slate-50"
        >
          דחה
        </button>
      </div>
    </div>
  );
}

// Issue row in the dispute map
function DisputeMapRow({ issue, onSelectIssue }) {
  const strength = issue.effectiveLegal?.strength;
  const signal =
    issue.overlays?.contradictions?.[0]?.description ||
    issue.effectiveLegal?.summary?.split(/[.!?]/)[0]?.trim() ||
    issue.description?.slice(0, 100);

  return (
    <div
      onClick={() => onSelectIssue(issue.id)}
      className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0 cursor-pointer group"
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-[6px] ${strengthDotClass(strength)}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold text-slate-800 group-hover:text-blue-700 leading-snug mb-0.5 transition-colors">
          {issue.title}
        </div>
        {signal && (
          <div className="text-[12px] text-slate-400 leading-[1.45]">
            {signal.length > 100 ? signal.slice(0, 100) + "…" : signal}
          </div>
        )}
      </div>
      {strength && (
        <span className={`text-[11px] font-semibold flex-shrink-0 ${strengthTextClass(strength)}`}>
          {strengthLabel(strength)}
        </span>
      )}
    </div>
  );
}

export default function CaseOverview({
  liveCaseState,
  analysis,
  latestDelta,
  onSelectIssue,
  onAcceptCaseAssessmentChange,
  onRejectCaseAssessmentChange,
}) {
  const issues = liveCaseState?.issues ?? [];
  const assessment = analysis?.executiveView?.successAssessment;

  return (
    <div className="px-8 py-7 max-w-[900px]">

      {/* Case-level pending */}
      <CasePendingDelta
        delta={latestDelta}
        onAccept={onAcceptCaseAssessmentChange}
        onReject={onRejectCaseAssessmentChange}
      />

      {/* Case assessment — center of gravity */}
      {assessment && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="text-[10.5px] font-bold text-slate-400 tracking-[0.07em] uppercase">
              הערכת מצב
            </div>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <div className="flex items-start justify-between gap-6 mb-3">
            <div className="text-[19px] font-bold text-slate-900 leading-tight">
              הערכת סיכויי התביעה
            </div>
            {assessment.level && (
              <div className="border border-slate-200 bg-white rounded-lg px-3 py-1 text-[13px] font-bold text-slate-700 flex-shrink-0">
                {assessment.level}
              </div>
            )}
          </div>

          {assessment.disputeFocus && (
            <div className="text-[13.5px] text-slate-500 leading-relaxed mb-2">
              <span className="font-semibold text-slate-700">מוקד המחלוקת: </span>
              {assessment.disputeFocus}
            </div>
          )}

          {assessment.summary && (
            <div className="text-[15px] text-slate-700 leading-[1.75] max-w-[760px]">
              {assessment.summary}
            </div>
          )}

          {assessment.reservation && (
            <div className="mt-3 border-r-[3px] border-slate-200 pr-4 text-[13.5px] text-slate-500 leading-relaxed max-w-[720px]">
              {assessment.reservation}
            </div>
          )}
        </div>
      )}

      {/* Dispute map */}
      {issues.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-[10.5px] font-bold text-slate-400 tracking-[0.07em] uppercase">
              מחלוקות
            </div>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <div>
            {issues.map((issue) => (
              <DisputeMapRow
                key={issue.id}
                issue={issue}
                onSelectIssue={onSelectIssue}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!analysis && (
        <div className="text-[14px] text-slate-400 mt-8">
          טרם נטען תיק. השתמש בטופס הקלט כדי להוסיף חומר.
        </div>
      )}
    </div>
  );
}
