import { useMemo, useState } from "react";

export default function DeltaNotificationPanel({
  delta,
  onClose,
  onAcceptWorkItem,
  onRejectWorkItem,
  onAcceptEvidenceUpdate,
  onRejectEvidenceUpdate,
  onAcceptTimelineUpdate,
  onRejectTimelineUpdate,
  onAcceptContradiction,
  onRejectContradiction,
}) {
  const sections = useMemo(
    () => [
      {
        key: "issues",
        title: "מחלוקות שהושפעו",
        icon: "📄",
        items: delta?.impactedIssues || [],
        render: (item) => ({
          title: item.issueTitle || "מחלוקת שהושפעה",
          description: item.reason || item.impact || "",
        }),
      },
      {
        key: "assessments",
        title: "שינויי הערכה",
        icon: "↗",
        items: delta?.changedAssessments || [],
        render: (item) => ({
          title: item.area || item.title || "שינוי הערכה",
          description:
            item.reason ||
            item.description ||
            item.newAssessment ||
            item.previousAssessment ||
            "",
        }),
      },
      {
        key: "evidence",
        title: "עדכוני ראיות",
        icon: "📁",
        items: delta?.evidenceUpdates || [],
        render: (item) => ({
          title: item.title || "עדכון ראייתי",
          description: item.description || "",
        }),
      },
      {
        key: "timeline",
        title: "ציר זמן",
        icon: "⏱",
        items: delta?.timelineUpdates || [],
        render: (item) => ({
          title: item.event || "אירוע",
          description: item.significance || "",
          badge: item.date || null,
        }),
      },
      {
        key: "workItems",
        title: "משימות שנוצרו",
        icon: "☑",
        items: delta?.generatedWorkItems || [],
        render: (item) => ({
          title: item.title || "משימה",
          description: item.description || item.reason || "",
          badge: translateWorkItemType(item.type),
        }),
      },
      {
        key: "contradictions",
        title: "סתירות",
        icon: "⚠",
        items: delta?.contradictions || [],
        render: (item) => ({
          title: item.title || "סתירה",
          description: item.description || "",
          badge: translateDirection(item.direction),
          severity: item.severity,
        }),
      },
    ],
    [delta]
  );

  const [activeKey, setActiveKey] = useState(null);

  const activeSection = activeKey
    ? sections.find((section) => section.key === activeKey)
    : null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-4 border-b border-amber-100">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold">
            !
          </div>

          <div>
            <div className="font-bold text-slate-900">עדכון ניתוח אחרון</div>

            <div className="mt-1 text-sm leading-6 text-slate-700">
              {delta?.summary || "אין תקציר לעדכון."}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-500 hover:text-slate-800"
        >
          סגור
        </button>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-5 bg-white/60 border-b border-amber-100">
        {sections.map((section) => {
          const isActive = section.key === activeKey;
          const count = section.items.length;

          return (
            <button
              key={section.key}
              type="button"
              onClick={() =>
                setActiveKey((current) =>
                  current === section.key ? null : section.key
                )
              }
              className={[
                "flex items-center justify-center gap-2 px-3 py-3 text-sm border-l last:border-l-0 border-amber-100 transition",
                isActive
                  ? "bg-amber-100/70 text-slate-900 font-bold"
                  : "text-slate-600 hover:bg-amber-50",
              ].join(" ")}
            >
              <span>{section.icon}</span>
              <span>{section.title}</span>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs text-slate-600 border border-slate-200">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {activeSection && (
        <div className="bg-white/70 p-4">
          {activeSection.items.length > 0 ? (
            <div className="space-y-2">
              {activeSection.items.map((item, index) => {
                const rendered = activeSection.render(item);

                return (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {rendered.badge && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {rendered.badge}
                        </span>
                      )}

                      <div className="font-semibold text-slate-900">
                        {rendered.title}
                      </div>
                    </div>

                    {rendered.description && (
                      <div className="mt-1 leading-6 text-slate-600">
                        {rendered.description}
                      </div>
                    )}

                    {activeSection.key === "workItems" && (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => onAcceptWorkItem?.(item, index)}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          הוסף למשימות
                        </button>

                        <button
                          type="button"
                          onClick={() => onRejectWorkItem?.(index)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          דחה
                        </button>
                      </div>
                    )}

                    {activeSection.key === "evidence" && (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => onAcceptEvidenceUpdate?.(item, index)}
                          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                        >
                          אשר עדכון
                        </button>

                        <button
                          type="button"
                          onClick={() => onRejectEvidenceUpdate?.(index)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          דחה
                        </button>
                      </div>
                    )}

                    {activeSection.key === "timeline" && (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => onAcceptTimelineUpdate?.(item, index)}
                          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                        >
                          הוסף לציר הזמן
                        </button>

                        <button
                          type="button"
                          onClick={() => onRejectTimelineUpdate?.(index)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          דחה
                        </button>
                      </div>
                    )}

                    {activeSection.key === "contradictions" && (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => onAcceptContradiction?.(item, index)}
                          className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
                        >
                          סמן כסתירה
                        </button>

                        <button
                          type="button"
                          onClick={() => onRejectContradiction?.(index)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          דחה
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
              אין פריטים בקטגוריה זו.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function translateDirection(direction) {
  switch (direction) {
    case "hurts_us":
      return "מחליש אותנו";
    case "hurts_them":
      return "מחליש אותם";
    case "unclear":
      return "לא ברור";
    default:
      return null;
  }
}

function translateWorkItemType(type) {
  switch (type) {
    case "client_question":
      return "שאלה ללקוח";
    case "evidence_to_obtain":
      return "ראיה להשגה";
    case "suggested_action":
      return "מהלך מוצע";
    case "pleading_gap":
      return "פער בכתב טענות";
    case "legal_research":
      return "בדיקה משפטית";
    default:
      return "משימה";
  }
}