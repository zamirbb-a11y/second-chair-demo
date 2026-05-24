import { useEffect, useState } from "react";
import { translateEvidenceType } from "../../utils/applyOverlays";

export default function IssueCard({
  issue,
  onUpdateIssue,
  onWorkspaceUpdate,
  evidenceOverlays = [],
  workItemOverlays = [],
  contradictionOverlays = [],
  assessmentOverlays = [],
  onRollbackOverlay,
  onRemoveWorkItem,
}) {
  const totalOverlays = evidenceOverlays.length + workItemOverlays.length + contradictionOverlays.length;
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(issue.title);
  const [draftDescription, setDraftDescription] = useState(issue.description);
  const [isExpanded, setIsExpanded] = useState(false);

  const [activeAction, setActiveAction] = useState(null);
  const [actionText, setActionText] = useState("");
  const [precedentSuggestions, setPrecedentSuggestions] = useState(null);
  const [isPrecedentLoading, setIsPrecedentLoading] = useState(false);

  useEffect(() => {
    setDraftTitle(issue.title || "");
    setDraftDescription(issue.description || "");
    setIsEditing(false);
    setIsExpanded(false);
    setActiveAction(null);
    setActionText("");
    setPrecedentSuggestions(null);
  }, [issue.id, issue.title, issue.description]);

  async function checkIssuePrecedents() {
    setIsPrecedentLoading(true);
    setPrecedentSuggestions(null);

    const issueText = [
      issue.title,
      issue.description,
      issue.legalAssessment?.summary,
      issue.partyPositions?.coreDispute,
      ...(issue.legalAssessment?.relevantLaw || []),
    ].filter(Boolean).join("\n");

    try {
      const res = await fetch("/api/retrieve-precedents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId: issue.id, issueText, maxResults: 5 }),
      });
      const data = await res.json();
      setPrecedentSuggestions(data.precedents || []);
    } catch {
      setPrecedentSuggestions([]);
    } finally {
      setIsPrecedentLoading(false);
    }
  }

  const importanceClasses = {
    central: "bg-slate-900 text-white",
    secondary: "bg-slate-200 text-slate-700",
    peripheral: "bg-slate-100 text-slate-500",
  };

  const importanceLabels = {
    central: "מרכזית",
    secondary: "משנית",
    peripheral: "שולית",
  };

  function handleSelectAction(type, title) {
    const isSameAction =
      activeAction?.type === type && activeAction?.title === title;

    if (isSameAction) {
      setActiveAction(null);
      setActionText("");
      return;
    }

    setActiveAction({ type, title });
    setActionText("");
  }

  function handleSaveActionNote() {
    if (!activeAction || !actionText.trim()) return;

    const note = {
      type: activeAction.type,
      title: activeAction.title,
      text: actionText.trim(),
      createdAt: new Date().toISOString(),
    };

    onUpdateIssue({
      ...issue,
      actionNotes: [...(issue.actionNotes || []), note],
    });

    onWorkspaceUpdate?.({
      type: "issue-action-note",
      topic: issue.title,
      issueId: issue.id,
      actionType: activeAction.type,
      actionTitle: activeAction.title,
      text: actionText.trim(),
    });

    setActionText("");
  }

  const effectiveLegal = { ...issue.legalAssessment };
  const updatedLegalFields = new Set();
  for (const o of assessmentOverlays) {
    if (o.patch.field === "legalAssessment.summary" && o.patch.newValue != null) {
      effectiveLegal.summary = o.patch.newValue;
      updatedLegalFields.add("summary");
    }
    if (o.patch.field === "legalAssessment.strength" && o.patch.newValue != null) {
      effectiveLegal.strength = o.patch.newValue;
      updatedLegalFields.add("strength");
    }
  }

  const existingLaw = issue.legalAssessment?.relevantLaw || [];
  const newPrecedents = (precedentSuggestions || []).filter((p) => {
    const name = (p.shortName || "").toLowerCase();
    const num = (p.caseNumber || "").toLowerCase();
    return !existingLaw.some((e) => {
      const entry = e.toLowerCase();
      return (name && entry.includes(name)) || (num && entry.includes(num));
    });
  });

  return (
    <div
      className="
     bg-white/95 border border-blue-100 rounded-2xl p-5
shadow-[0_6px_18px_rgba(15,23,42,0.08)]
        transition-all duration-200
        hover:border-slate-400 hover:shadow-md hover:-translate-y-[1px]
      "
    >
      <div className="space-y-4">
        <div
          className="
            flex flex-wrap items-center gap-3 cursor-pointer
            rounded-xl px-3 py-3 transition-all duration-150 hover:bg-slate-50
          "
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          {!isEditing && (
            <h3 className="text-lg font-bold text-slate-900">
              {draftTitle}
            </h3>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();

              if (isEditing) {
                onUpdateIssue({
                  ...issue,
                  title: draftTitle,
                  description: draftDescription,
                });
              }

              setIsEditing((prev) => !prev);
            }}
            className="
              rounded-lg border border-slate-300 bg-white
              px-3 py-1.5 text-sm font-medium text-slate-700
              hover:bg-slate-100 transition
            "
          >
            {isEditing ? "שמור" : "ערוך"}
          </button>

          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              importanceClasses[issue.importance] ||
              "bg-slate-100 text-slate-700"
            }`}
          >
            {importanceLabels[issue.importance] || "לא סווג"}
          </span>

          {totalOverlays > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {totalOverlays} עדכונים שאושרו
            </span>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <input
              className="
                w-full border border-slate-300
                rounded-xl px-3 py-2 text-lg font-bold
              "
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
            />

            <select
              className="
                border border-slate-300 rounded-xl
                px-3 py-2 text-sm bg-white
              "
              value={issue.importance}
              onChange={(e) =>
                onUpdateIssue({
                  ...issue,
                  importance: e.target.value,
                })
              }
            >
              <option value="central">מרכזית</option>
              <option value="secondary">משנית</option>
              <option value="peripheral">שולית</option>
            </select>

            <textarea
              className="
                w-full border border-slate-300
                rounded-xl px-3 py-2
                text-sm leading-6 min-h-[90px]
              "
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
            />
          </div>
        ) : (
          <>
            <p className="text-slate-600 text-sm leading-6">
              {draftDescription}
            </p>

            {issue.partyPositions?.coreDispute && (
              <div
                className="
                  rounded-2xl border border-slate-200
                  bg-slate-50 px-4 py-3
                "
              >
                <div className="text-xs font-bold text-slate-500 mb-1">
                  ליבת המחלוקת
                </div>

                <div className="text-sm leading-6 text-slate-800 font-medium">
                  {issue.partyPositions.coreDispute}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-4 mt-5">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <SectionCard title="עמדת התובע">
              <InfoBlock text={issue.partyPositions?.claimant} />
              {contradictionOverlays
                .filter((o) => POSITION_SURFACE_TYPES.includes(o.patch.targetType))
                .map((o) => (
                  <ContradictionSignal
                    key={o.id}
                    overlay={o}
                    framing="position"
                    onRollback={onRollbackOverlay}
                  />
                ))}
            </SectionCard>

            <SectionCard title="עמדת הנתבע">
              <InfoBlock text={issue.partyPositions?.defendant} />
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <SectionCard title="הערכה משפטית">
              <AssessmentSummaryBlock
                summary={effectiveLegal.summary}
                strength={effectiveLegal.strength}
                updatedFields={updatedLegalFields}
                assessmentOverlays={assessmentOverlays}
                onRollbackOverlay={onRollbackOverlay}
              />

              <ExpandableList
                title="חקיקה ופסיקה"
                items={issue.legalAssessment?.relevantLaw}
                limit={3}
                suggestedItems={newPrecedents}
              />

              {precedentSuggestions !== null && newPrecedents.length > 0 && (
                <div className="text-xs text-slate-500">
                  התווספו {newPrecedents.length} פסקי דין לבדיקה
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={checkIssuePrecedents}
                  disabled={isPrecedentLoading}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
                >
                  {isPrecedentLoading ? "מחפש פסיקה..." : "בדוק פסיקה למחלוקת זו"}
                </button>

                {precedentSuggestions !== null && (
                  <button
                    type="button"
                    onClick={() => setPrecedentSuggestions(null)}
                    className="text-xs text-slate-400 hover:text-slate-700 transition"
                  >
                    נקה תוצאות
                  </button>
                )}
              </div>

              {contradictionOverlays
                .filter((o) => !EVIDENCE_SURFACE_TYPES.includes(o.patch.targetType) && !POSITION_SURFACE_TYPES.includes(o.patch.targetType))
                .map((o) => (
                  <ContradictionSignal
                    key={o.id}
                    overlay={o}
                    framing="legal"
                    onRollback={onRollbackOverlay}
                  />
                ))}
            </SectionCard>

            <SectionCard title="מצב ראייתי">
              <ExpandableList
                title="ראיות קשורות"
                items={issue.linkedEvidence}
                limit={4}
                overlayItems={evidenceOverlays.filter(
                  (o) =>
                    o.patch.evidenceType === "new_evidence" ||
                    o.patch.evidenceType === "document_impact"
                )}
                onRollbackOverlay={onRollbackOverlay}
              />

              <ExpandableList
                title="עדים קשורים"
                items={issue.linkedWitnesses}
                limit={3}
              />

              <ExpandableList
                title="חוסרים ראייתיים"
                items={issue.missingInfo}
                limit={3}
                overlayItems={evidenceOverlays.filter(
                  (o) =>
                    o.patch.evidenceType === "missing_evidence" ||
                    o.patch.evidenceType === "evidence_gap"
                )}
                onRollbackOverlay={onRollbackOverlay}
              />

              {contradictionOverlays
                .filter((o) => EVIDENCE_SURFACE_TYPES.includes(o.patch.targetType))
                .map((o) => (
                  <ContradictionSignal
                    key={o.id}
                    overlay={o}
                    framing="evidence"
                    onRollback={onRollbackOverlay}
                  />
                ))}
            </SectionCard>
          </div>

          <SectionCard title="כיווני פעולה">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <ActionList
                title="שאלות ללקוח"
                items={issue.actionItems?.clientQuestions}
                actionType="clientQuestion"
                activeAction={activeAction}
                actionText={actionText}
                setActionText={setActionText}
                onSelectAction={handleSelectAction}
                onSaveActionNote={handleSaveActionNote}
                onCloseAction={() => {
                  setActiveAction(null);
                  setActionText("");
                }}
                overlayItems={workItemOverlays.filter((i) => i.type === "client_question")}
                onRemoveWorkItem={onRemoveWorkItem}
              />

              <ActionList
                title="ראיות שצריך להשיג"
                items={issue.actionItems?.missingEvidence}
                actionType="missingEvidence"
                activeAction={activeAction}
                actionText={actionText}
                setActionText={setActionText}
                onSelectAction={handleSelectAction}
                onSaveActionNote={handleSaveActionNote}
                onCloseAction={() => {
                  setActiveAction(null);
                  setActionText("");
                }}
                overlayItems={workItemOverlays.filter((i) => i.type === "evidence_to_obtain")}
                onRemoveWorkItem={onRemoveWorkItem}
              />

              <ActionList
                title="מהלכים מוצעים"
                items={issue.actionItems?.suggestedActions}
                actionType="suggestedAction"
                activeAction={activeAction}
                actionText={actionText}
                setActionText={setActionText}
                onSelectAction={handleSelectAction}
                onSaveActionNote={handleSaveActionNote}
                onCloseAction={() => {
                  setActiveAction(null);
                  setActionText("");
                }}
                overlayItems={workItemOverlays.filter((i) => !["client_question", "evidence_to_obtain"].includes(i.type))}
                onRemoveWorkItem={onRemoveWorkItem}
              />
            </div>

            {(issue.actionNotes || []).length > 0 && (
              <div className="mt-4 text-xs text-slate-500">
                נשמרו {issue.actionNotes.length} עדכונים למחלוקת זו
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div
      className="
        rounded-2xl
        border border-blue-100
        bg-[#f8fbff]
        p-4
        shadow-[0_2px_8px_rgba(15,23,42,0.04)]
      "
    >
      <div className="text-sm font-bold text-slate-900 mb-4">
        {title}
      </div>

      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

function InfoBlock({ text }) {
  if (!text) return null;

  return (
    <div className="text-sm leading-6 text-slate-700">
      {text}
    </div>
  );
}

const STRENGTH_LABEL = {
  very_strong:   "חוזק: גבוה מאוד",
  strong:        "חוזק: גבוה",
  medium_strong: "חוזק: בינוני-גבוה",
  medium:        "חוזק: בינוני",
  medium_weak:   "חוזק: בינוני-נמוך",
  weak:          "חוזק: נמוך",
  very_weak:     "חוזק: נמוך מאוד",
  unclear:       "חוזק: לא ברור",
};

const STRENGTH_COLOR = {
  very_strong:   "bg-emerald-100 text-emerald-800",
  strong:        "bg-emerald-100 text-emerald-700",
  medium_strong: "bg-blue-100 text-blue-700",
  medium:        "bg-slate-100 text-slate-600",
  medium_weak:   "bg-amber-100 text-amber-700",
  weak:          "bg-orange-100 text-orange-700",
  very_weak:     "bg-red-100 text-red-700",
  unclear:       "bg-slate-100 text-slate-500",
};

function AssessmentSummaryBlock({ summary, strength, updatedFields, assessmentOverlays, onRollbackOverlay }) {
  const summaryUpdated = updatedFields.has("summary");
  const strengthUpdated = updatedFields.has("strength");

  const summaryOverlay = summaryUpdated
    ? [...assessmentOverlays].reverse().find((o) => o.patch.field === "legalAssessment.summary")
    : null;
  const strengthOverlay = strengthUpdated
    ? [...assessmentOverlays].reverse().find((o) => o.patch.field === "legalAssessment.strength")
    : null;

  return (
    <div className="space-y-2">
      {summary && (
        <div className="text-sm leading-6 text-slate-700">
          {summary}
          {summaryUpdated && (
            <span className="inline-flex items-center gap-1 mr-1.5 align-middle">
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                עודכן
              </span>
              {summaryOverlay && (
                <button
                  type="button"
                  onClick={() => onRollbackOverlay?.(summaryOverlay.id)}
                  className="text-xs text-slate-400 hover:text-red-500 transition"
                >
                  בטל
                </button>
              )}
            </span>
          )}
        </div>
      )}

      {strength && STRENGTH_LABEL[strength] && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STRENGTH_COLOR[strength] ?? "bg-slate-100 text-slate-600"}`}>
              {STRENGTH_LABEL[strength]}
            </span>
            {strengthUpdated && (
              <>
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                  עודכן
                </span>
                {strengthOverlay?.patch.previousValue && (
                  <span className="text-xs text-slate-400">
                    (היה: {STRENGTH_LABEL[strengthOverlay.patch.previousValue] ?? strengthOverlay.patch.previousValue})
                  </span>
                )}
                {strengthOverlay && (
                  <button
                    type="button"
                    onClick={() => onRollbackOverlay?.(strengthOverlay.id)}
                    className="text-xs text-slate-400 hover:text-red-500 transition"
                  >
                    בטל
                  </button>
                )}
              </>
            )}
          </div>
          {strengthUpdated && strengthOverlay?.patch.reason && (
            <div className="text-xs text-slate-500 leading-5">
              סיבת העדכון: {strengthOverlay.patch.reason}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExpandableList({
  title,
  items,
  limit = 3,
  overlayItems = [],
  onRollbackOverlay,
  suggestedItems = [],
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!items?.length && !overlayItems.length && !suggestedItems.length) return null;

  const visibleItems = isOpen
    ? items
    : (items || []).slice(0, limit);

  const hiddenCount = (items?.length || 0) - limit;

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl p-3">
        <div className="text-xs font-bold text-slate-500 mb-2">
          {title}
        </div>

        <ul className="space-y-1 text-sm text-slate-700">
          {visibleItems.map((item) => (
            <li key={item}>• {item}</li>
          ))}
          {overlayItems.map((overlay) => (
            <li key={overlay.id} className="flex items-start justify-between gap-2 pt-0.5">
              <span className="leading-5">
                • {overlay.patch.title}
                {overlay.isNew && (
                  <span className="mr-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 align-middle">
                    חדש
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => onRollbackOverlay?.(overlay.id)}
                className="shrink-0 text-xs text-slate-400 hover:text-red-500 transition"
              >
                בטל
              </button>
            </li>
          ))}
          {suggestedItems.map((p) => (
            <li key={p.id} className="flex items-start gap-1.5 pt-0.5">
              <span className="leading-5 text-slate-700">
                • {p.caseNumber ? `${p.caseNumber} ${p.shortName || ""}`.trim() : (p.shortName || p.id)}
              </span>
              <span className="mr-1 shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 align-middle">
                חדש
              </span>
            </li>
          ))}
        </ul>

        {(items?.length || 0) > limit && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="
              mt-3 text-xs font-bold text-slate-500
              hover:text-slate-900
            "
          >
            הצג הכל ({hiddenCount}+)
          </button>
        )}
      </div>

      {isOpen && (
        <div
          className="
            fixed inset-0 z-50
            bg-black/30
            flex items-center justify-center
            p-6
          "
        >
          <div
            className="
              w-full max-w-2xl max-h-[80vh]
              overflow-auto
              rounded-3xl bg-white
              shadow-2xl border border-slate-200
              p-6
            "
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-xs font-bold text-slate-500">
                  מבט מלא
                </div>

                <div className="text-lg font-bold text-slate-900 mt-1">
                  {title}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="
                  rounded-lg border border-slate-300
                  px-3 py-1.5 text-sm
                  hover:bg-slate-100
                "
              >
                סגור
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item}
                  className="
                    rounded-xl border border-slate-200
                    bg-slate-50 px-4 py-3
                    text-sm leading-6 text-slate-700
                  "
                >
                  • {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}


const EVIDENCE_SURFACE_TYPES = [
  "evidence",
  "document_vs_claim",
  "admission_against_interest",
  "behavior_vs_claim",
];

const POSITION_SURFACE_TYPES = [
  "claim",
  "document_vs_claim",
  "admission_against_interest",
  "behavior_vs_claim",
];

const CONTRADICTION_FRAMING = {
  evidence: {
    hurts_us:   { badge: "bg-red-100 text-red-700",     border: "border-red-200",   bg: "bg-red-50/50",     label: "ראיה מחלישה" },
    hurts_them: { badge: "bg-emerald-100 text-emerald-700", border: "border-emerald-200", bg: "bg-emerald-50/40", label: "ראיה מחזקת" },
    unclear:    { badge: "bg-amber-100 text-amber-700",  border: "border-amber-200", bg: "bg-amber-50/40",   label: "אי-עקביות ראייתית" },
  },
  position: {
    hurts_us:   { badge: "bg-red-100 text-red-700",     border: "border-red-200",   bg: "bg-red-50/50",     label: "סתירת גרסה" },
    hurts_them: { badge: "bg-emerald-100 text-emerald-700", border: "border-emerald-200", bg: "bg-emerald-50/40", label: "גרסה משתנה" },
    unclear:    { badge: "bg-amber-100 text-amber-700",  border: "border-amber-200", bg: "bg-amber-50/40",   label: "אי-עקביות בעמדה" },
  },
  legal: {
    hurts_us:   { badge: "bg-red-100 text-red-700",     border: "border-red-200",   bg: "bg-red-50/50",     label: "סיכון ליטיגטורי" },
    hurts_them: { badge: "bg-emerald-100 text-emerald-700", border: "border-emerald-200", bg: "bg-emerald-50/40", label: "הזדמנות ליטיגטורית" },
    unclear:    { badge: "bg-amber-100 text-amber-700",  border: "border-amber-200", bg: "bg-amber-50/40",   label: "השלכה משפטית" },
  },
};

function ContradictionSignal({ overlay, framing, onRollback }) {
  const direction = overlay.patch.direction || "unclear";
  const style = CONTRADICTION_FRAMING[framing]?.[direction] ?? CONTRADICTION_FRAMING.legal.unclear;

  return (
    <div className={`flex items-start justify-between gap-2 rounded-xl border ${style.border} ${style.bg} px-3 py-2`}>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0 ${style.badge}`}>
            {style.label}
          </span>
          <span className="text-xs font-semibold text-slate-800">{overlay.patch.title}</span>
        </div>
        {overlay.patch.description && (
          <p className="mt-0.5 text-xs leading-5 text-slate-600">{overlay.patch.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRollback?.(overlay.id)}
        className="shrink-0 text-[11px] text-slate-400 hover:text-red-500 transition mt-0.5"
      >
        בטל
      </button>
    </div>
  );
}

function ActionList({
  title,
  items,
  actionType,
  activeAction,
  actionText,
  setActionText,
  onSelectAction,
  onSaveActionNote,
  onCloseAction,
  overlayItems = [],
  onRemoveWorkItem,
}) {
  if (!items?.length && !overlayItems.length) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3">
      <div className="text-xs font-bold text-slate-500 mb-2">
        {title}
      </div>

      <div className="space-y-2">
        {(items || []).map((item) => {
          const isActive =
            activeAction?.type === actionType &&
            activeAction?.title === item;

          return (
            <div key={item} className="relative">
              <button
                type="button"
                onClick={() =>
                  onSelectAction(actionType, item)
                }
                className={`
                  w-full text-right group cursor-pointer
                  rounded-xl border
                  px-3 py-2 text-sm transition-all duration-150
                  ${
                    isActive
                      ? "border-slate-500 bg-slate-50 shadow-sm text-slate-900"
                      : "border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:shadow-sm"
                  }
                `}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="leading-6">• {item}</div>

                  <div className="text-xs text-slate-500 whitespace-nowrap">
                    {isActive ? "פתוח" : "פתח"}
                  </div>
                </div>
              </button>

              {isActive && (
                <div
                  className="
                    absolute z-30 right-0 left-0
                    mt-2 rounded-2xl border border-slate-300
                    bg-white p-4 shadow-xl
                  "
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-500 mb-1">
                        עדכון לפריט
                      </div>

                      <div className="text-sm font-bold text-slate-900 leading-6">
                        {item}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onCloseAction}
                      className="text-xs font-bold text-slate-500 hover:text-slate-900"
                    >
                      סגור
                    </button>
                  </div>

                  <textarea
                    className="
                      mt-3 w-full min-h-[90px]
                      rounded-2xl border border-slate-300
                      bg-white px-3 py-2 text-sm leading-6
                    "
                    placeholder="כתוב כאן תשובה, מידע חדש או הנחיה..."
                    value={actionText}
                    onChange={(e) =>
                      setActionText(e.target.value)
                    }
                  />

                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      className="
                        rounded-lg border border-slate-300 bg-white
                        px-3 py-1.5 text-xs font-bold text-slate-700
                        hover:bg-slate-100
                      "
                    >
                      צרף קובץ
                    </button>

                    <button
                      type="button"
                      onClick={onSaveActionNote}
                      className="
                        rounded-lg bg-slate-900
                        px-3 py-1.5 text-xs font-bold text-white
                        hover:bg-slate-800
                      "
                    >
                      שמור למחלוקת
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {overlayItems.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <span className="leading-5 text-slate-700">
              • {item.title}
              <span className="mr-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 align-middle">
                חדש
              </span>
            </span>
            <button
              type="button"
              onClick={() => onRemoveWorkItem?.(item.id)}
              className="shrink-0 text-xs text-slate-400 hover:text-red-500 transition"
            >
              בטל
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}