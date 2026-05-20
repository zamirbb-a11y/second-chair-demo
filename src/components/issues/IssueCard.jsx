import { useEffect, useState } from "react";
import { translateEvidenceType } from "../../utils/applyOverlays";

export default function IssueCard({
  issue,
  onUpdateIssue,
  onWorkspaceUpdate,
  evidenceOverlays = [],
  workItemOverlays = [],
  onRollbackOverlay,
  onRemoveWorkItem,
}) {
  const totalOverlays = evidenceOverlays.length + workItemOverlays.length;
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(issue.title);
  const [draftDescription, setDraftDescription] = useState(issue.description);
  const [isExpanded, setIsExpanded] = useState(false);

  const [activeAction, setActiveAction] = useState(null);
  const [actionText, setActionText] = useState("");
  useEffect(() => {
  setDraftTitle(issue.title || "");
  setDraftDescription(issue.description || "");
  setIsEditing(false);
  setIsExpanded(false);
  setActiveAction(null);
  setActionText("");
}, [issue.id, issue.title, issue.description]);

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
            </SectionCard>

            <SectionCard title="עמדת הנתבע">
              <InfoBlock text={issue.partyPositions?.defendant} />
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <SectionCard title="הערכה משפטית">
              <InfoBlock text={issue.legalAssessment?.summary} />

              <ExpandableList
                title="חקיקה ופסיקה"
                items={issue.legalAssessment?.relevantLaw}
                limit={3}
              />
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
            </SectionCard>
          </div>

          {workItemOverlays.length > 0 && (
            <ApprovedUpdatesSection
              workItemOverlays={workItemOverlays}
              onRemoveWorkItem={onRemoveWorkItem}
            />
          )}

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

function ExpandableList({
  title,
  items,
  limit = 3,
  overlayItems = [],
  onRollbackOverlay,
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!items?.length && !overlayItems.length) return null;

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

function ApprovedUpdatesSection({ workItemOverlays, onRemoveWorkItem }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
      <div className="text-sm font-bold text-blue-900 mb-3">
        משימות שאושרו
      </div>

      <div className="space-y-2">
        {workItemOverlays.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-blue-100 bg-white px-3 py-2.5"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 shrink-0">
                  משימה
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {item.title}
                </span>
              </div>
              {item.description && (
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {item.description}
                </p>
              )}
            </div>

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
}) {
  if (!items?.length) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3">
      <div className="text-xs font-bold text-slate-500 mb-2">
        {title}
      </div>

      <div className="space-y-2">
        {items.map((item) => {
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
      </div>
    </div>
  );
}