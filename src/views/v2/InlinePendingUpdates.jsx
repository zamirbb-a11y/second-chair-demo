const FIELD_LABELS = {
  "legalAssessment.strength": "סיכויי הטענה",
  "legalAssessment.summary":  "הערכה משפטית",
  importance:                 "חשיבות המחלוקת",
  status:                     "סטטוס",
};

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

function label(v) { return STRENGTH_LABELS[v] ?? v ?? "—"; }
function fieldLabel(f) { return FIELD_LABELS[f] ?? f; }

// Build a natural legal-language sentence for each delta type
function assessmentInsight(item) {
  const field = fieldLabel(item.field);
  const prev  = label(item.previousValue);
  const next  = label(item.newValue);
  const base  = `${field} השתנה/ה מ-${prev} ל-${next}`;
  return item.reason ? `${base}. ${item.reason}` : base;
}

function evidenceInsight(item) {
  return [item.title, item.description].filter(Boolean).join(" — ");
}

function contradictionInsight(item) {
  return item.description || item.title || "";
}

function workItemInsight(item) {
  return [item.title, item.description].filter(Boolean).join(" — ");
}

// A single pending insight row
function PendingItem({ typeLabel, insight, source, onAccept, onReject }) {
  return (
    <div className="px-5 py-4 border-b border-amber-100 last:border-0">
      <div className="text-[10px] font-bold text-amber-700 tracking-[0.06em] uppercase mb-1.5">
        {typeLabel}
      </div>
      <div className="text-[13.5px] text-amber-900 leading-relaxed mb-1">
        {insight}
      </div>
      {source && (
        <div className="text-[11px] text-amber-600 mb-2.5">{source}</div>
      )}
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="bg-emerald-700 text-white border-0 rounded-lg px-4 py-1.5 text-[11.5px] font-bold cursor-pointer hover:bg-emerald-800"
        >
          ✓ אשר
        </button>
        <button
          onClick={onReject}
          className="bg-white text-slate-500 border border-slate-200 rounded-lg px-4 py-1.5 text-[11.5px] font-semibold cursor-pointer hover:bg-slate-50"
        >
          דחה
        </button>
      </div>
    </div>
  );
}

export default function InlinePendingUpdates({
  issue,
  latestDelta,
  onApproveAll,
  onAcceptAssessmentChange,
  onRejectAssessmentChange,
  onAcceptEvidenceUpdate,
  onRejectEvidenceUpdate,
  onAcceptContradiction,
  onRejectContradiction,
  onAcceptWorkItem,
  onRejectWorkItem,
}) {
  if (!latestDelta || !issue) return null;

  const id    = issue.id;
  const title = issue.title;

  // Filter each delta type to this issue, preserving original array index
  const assessments = (latestDelta.changedAssessments ?? [])
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.issueId === id || item.issueTitle === title);

  const evidence = (latestDelta.evidenceUpdates ?? [])
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.relatedIssueId === id || item.relatedIssueTitle === title);

  const contradictions = (latestDelta.contradictions ?? [])
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.relatedIssueId === id || item.relatedIssueTitle === title);

  const workItems = (latestDelta.generatedWorkItems ?? [])
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.relatedIssueId === id || item.relatedIssueTitle === title);

  const totalCount = assessments.length + evidence.length + contradictions.length + workItems.length;
  if (totalCount === 0) return null;

  function handleApproveAll() {
    if (onApproveAll) {
      onApproveAll({ assessments, evidence, contradictions, workItems });
      return;
    }
    assessments.forEach(({ item, index }) => onAcceptAssessmentChange?.(item, index));
    evidence.forEach(({ item, index }) => onAcceptEvidenceUpdate?.(item, index));
    contradictions.forEach(({ item, index }) => onAcceptContradiction?.(item, index));
    workItems.forEach(({ item, index }) => onAcceptWorkItem?.(item, index));
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-amber-100/60 border-b border-amber-200">
        <div className="text-[10.5px] font-bold text-amber-800 tracking-[0.07em] uppercase">
          עדכונים שמשנים את התמונה ({totalCount})
        </div>
        <button
          onClick={handleApproveAll}
          className="text-[11.5px] font-semibold text-amber-800 underline underline-offset-2 cursor-pointer bg-transparent border-0 hover:text-amber-900"
        >
          אשר הכל
        </button>
      </div>

      {/* Assessment changes */}
      {assessments.map(({ item, index }) => (
        <PendingItem
          key={`assessment-${index}`}
          typeLabel={`שינוי — ${fieldLabel(item.field)}`}
          insight={assessmentInsight(item)}
          source={item.area ? `תחום: ${item.area}` : undefined}
          onAccept={() => onAcceptAssessmentChange?.(item, index)}
          onReject={() => onRejectAssessmentChange?.(index)}
        />
      ))}

      {/* Evidence updates */}
      {evidence.map(({ item, index }) => (
        <PendingItem
          key={`evidence-${index}`}
          typeLabel="חומר חדש שהתקבל"
          insight={evidenceInsight(item)}
          source={item.type ? `סוג: ${item.type}` : undefined}
          onAccept={() => onAcceptEvidenceUpdate?.(item, index)}
          onReject={() => onRejectEvidenceUpdate?.(index)}
        />
      ))}

      {/* Contradictions */}
      {contradictions.map(({ item, index }) => (
        <PendingItem
          key={`contradiction-${index}`}
          typeLabel="מתח או סתירה שזוהתה"
          insight={contradictionInsight(item)}
          source={
            item.severity
              ? `עוצמה: ${item.severity === "high" ? "גבוהה" : item.severity === "medium" ? "בינונית" : "נמוכה"}`
              : undefined
          }
          onAccept={() => onAcceptContradiction?.(item, index)}
          onReject={() => onRejectContradiction?.(index)}
        />
      ))}

      {/* Work items */}
      {workItems.map(({ item, index }) => (
        <PendingItem
          key={`workitem-${index}`}
          typeLabel="כיוון פעולה מוצע"
          insight={workItemInsight(item)}
          source={undefined}
          onAccept={() => onAcceptWorkItem?.(item, index)}
          onReject={() => onRejectWorkItem?.(index)}
        />
      ))}
    </div>
  );
}
