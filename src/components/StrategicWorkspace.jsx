import { useState } from "react";

export default function StrategicWorkspace({
  analysis,
  workspaceUpdates,
  analysisDiff,
  onAddWorkspaceUpdate,
}) {
  const questions = analysis?.actionCenter?.clientQuestions || [];
  const missingEvidence = analysis?.evidenceAndGaps?.missingEvidence || [];

  const [freeInput, setFreeInput] = useState("");

  function handleFreeInputSubmit() {
    if (!freeInput.trim()) return;

    onAddWorkspaceUpdate({
      type: "free-input",
      topic: "קלט חופשי",
      text: freeInput,
    });

    setFreeInput("");
  }

  return (
    <aside className="bg-white border rounded-2xl shadow-sm p-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold">מרחב עבודה</h2>

        <p className="text-xs text-slate-500 mt-1">
          שאלות, חוסרים וקלט נוסף שיכולים לשנות את הערכת התיק.
        </p>
      </div>

      {analysisDiff?.length > 0 && (
        <ChangeFeedSection>
          <WhatChanged
            analysisDiff={analysisDiff}
            workspaceUpdates={workspaceUpdates}
          />
        </ChangeFeedSection>
      )}

      <WorkspaceSection title="שאלות שעשויות לשנות את הניתוח">
        <InteractiveItems
          items={questions}
          type="question"
          empty="לא זוהו שאלות מהותיות."
          onAddWorkspaceUpdate={onAddWorkspaceUpdate}
        />
      </WorkspaceSection>

      <WorkspaceSection title="מסמכים / ראיות חסרים">
        <InteractiveItems
          items={missingEvidence}
          type="missing"
          empty="לא זוהו חוסרים מרכזיים."
          onAddWorkspaceUpdate={onAddWorkspaceUpdate}
        />
      </WorkspaceSection>

      <WorkspaceSection title="קלט חופשי">
        <textarea
          value={freeInput}
          onChange={(e) => setFreeInput(e.target.value)}
          placeholder="הוסף מידע, מחשבה אסטרטגית או שאלה חופשית לגבי התיק..."
          className="w-full min-h-20 rounded-xl border p-3 text-sm leading-6 bg-white"
        />

        <div className="flex gap-2 mt-2">
          <button
            onClick={handleFreeInputSubmit}
            className="rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-semibold"
          >
            הוסף לתיק
          </button>

          <button className="rounded-lg border bg-white px-3 py-1.5 text-xs hover:bg-slate-50">
            שאל את המערכת
          </button>
        </div>
      </WorkspaceSection>
    </aside>
  );
}

function ChangeFeedSection({ children }) {
  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-100/70 p-3 shadow-sm">
      <div className="mb-3">
        <h3 className="font-bold text-sm text-slate-950">
          מה השתנה מאז ההרצה האחרונה
        </h3>

        <p className="text-xs text-slate-600 mt-1">
          עודכן בעקבות המידע החדש וההרצה המחודשת.
        </p>
      </div>

      {children}
    </section>
  );
}

function WorkspaceSection({ title, children }) {
  return (
    <section className="border rounded-xl bg-slate-50 p-3">
      <h3 className="font-semibold text-sm mb-2">{title}</h3>
      {children}
    </section>
  );
}

function WhatChanged({ analysisDiff, workspaceUpdates }) {
  const hasDiff = analysisDiff && analysisDiff.length > 0;
  const hasUpdates = workspaceUpdates && workspaceUpdates.length > 0;

  if (!hasDiff && !hasUpdates) {
    return (
      <p className="text-sm text-slate-600 leading-6">
        עדיין לא נוספו עדכונים מתוך מרחב העבודה.
      </p>
    );
  }

  const primaryChange = hasDiff ? analysisDiff[0] : null;
  const secondaryChanges = hasDiff ? analysisDiff.slice(1, 4) : [];

  return (
    <div className="space-y-3">
      {primaryChange && (
        <div className="rounded-2xl border border-blue-300 bg-white p-3 shadow-sm border-r-4 border-r-blue-500">
          <div className="flex items-center gap-2 mb-2">
            <ChangeBadge type={primaryChange.type} />

            <span className="text-xs font-semibold text-blue-700">
              שינוי מרכזי בניתוח
            </span>
          </div>

          <div className="text-sm font-bold text-slate-900 leading-6">
            {primaryChange.title}
          </div>

          <div className="text-sm text-slate-700 leading-6 mt-1">
            {primaryChange.description}
          </div>
        </div>
      )}

      {secondaryChanges.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-600">
            שינויים נוספים
          </div>

          {secondaryChanges.map((change, index) => (
            <div
              key={index}
              className="rounded-xl border border-white/70 bg-white p-2.5 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <ChangeBadge type={change.type} />

                <span className="text-xs text-slate-400">
                  עודכן בניתוח
                </span>
              </div>

              <div className="text-sm font-semibold text-slate-800 leading-6">
                {change.title}
              </div>

              <div className="text-sm text-slate-600 leading-6 mt-1">
                {change.description}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasUpdates && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-600">
            עדכונים שהוזנו לתיק
          </div>

          {workspaceUpdates.slice(0, 4).map((update, index) => (
            <div
              key={index}
              className="rounded-xl border border-white/70 bg-white p-2.5 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="rounded-full bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 text-[11px]">
                  {formatType(update.type)}
                </span>

                <span className="text-xs text-slate-400">
                  נוסף לתיק
                </span>
              </div>

              <div className="text-sm font-semibold text-slate-800 leading-6">
                {update.topic}
              </div>

              <div className="text-sm text-slate-600 leading-6 mt-1">
                {update.text}
              </div>
            </div>
          ))}

          <div className="text-xs text-slate-500 pt-1">
            לחץ על "נתח מחדש" כדי לעדכן את הניתוח.
          </div>
        </div>
      )}
    </div>
  );
}

function ChangeBadge({ type }) {
  if (type === "battlefield-shift") {
    return (
      <span className="rounded-full bg-purple-50 border border-purple-100 text-purple-700 px-2 py-0.5 text-[11px]">
        מוקד השתנה
      </span>
    );
  }

  if (type === "issue-shift") {
    return (
      <span className="rounded-full bg-amber-50 border border-amber-100 text-amber-700 px-2 py-0.5 text-[11px]">
        סוגיה השתנתה
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 border text-slate-600 px-2 py-0.5 text-[11px]">
      שינוי
    </span>
  );
}

function InteractiveItems({
  items,
  type,
  empty,
  onAddWorkspaceUpdate,
}) {
  const shown = (items || []).slice(0, 4);

  const [openIndex, setOpenIndex] = useState(null);
  const [answers, setAnswers] = useState({});
  const [statuses, setStatuses] = useState({});

  if (!shown.length) {
    return <p className="text-sm text-slate-500">{empty}</p>;
  }

  function handleAdd(item, index) {
    const answer = answers[index];

    if (!answer?.trim()) return;

    onAddWorkspaceUpdate({
      type:
        type === "question"
          ? "question-answer"
          : "missing-evidence",
      topic: item,
      text: answer,
    });

    setStatuses((prev) => ({
      ...prev,
      [index]: "answered",
    }));

    setAnswers((prev) => ({
      ...prev,
      [index]: "",
    }));
  }

  return (
    <div className="space-y-2">
      {shown.map((item, index) => {
        const isOpen = openIndex === index;
        const status = statuses[index] || "open";

        return (
          <div
            key={index}
            className={`rounded-xl border bg-white overflow-hidden ${
              status === "answered" ? "border-emerald-200" : ""
            }`}
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="w-full text-right p-2.5 hover:bg-slate-50"
            >
              <div className="flex items-start gap-2">
                <StatusBadge status={status} type={type} />

                <div className="min-w-0 flex-1">
                  <div className="text-sm leading-6 font-semibold text-slate-900">
                    {item}
                  </div>
                </div>

                <span className="text-slate-400 text-sm mt-1">
                  {isOpen ? "⌃" : "⌄"}
                </span>
              </div>
            </button>

            {isOpen && (
              <div className="border-t bg-slate-50 px-2.5 py-2 space-y-2">
                <p className="text-[11px] text-slate-500 leading-5">
                  {type === "question"
                    ? "מידע כאן יעדכן בהמשך את מודל התיק ואת הערכת הסיכון."
                    : "תאר או העלה את הראיה החסרה כדי לשפר את הניתוח."}
                </p>

                <textarea
                  value={answers[index] || ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [index]: e.target.value,
                    }))
                  }
                  placeholder={
                    type === "question"
                      ? "תשובה קצרה לשאלה..."
                      : "תיאור קצר של המסמך או הראיה..."
                  }
                  className="w-full min-h-16 rounded-lg border p-2.5 text-sm leading-5 bg-white"
                />

                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleAdd(item, index)}
                    className="rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-semibold"
                  >
                    הוסף
                  </button>

                  <button className="rounded-lg border bg-white px-3 py-1.5 text-xs hover:bg-slate-50">
                    העלה מסמך
                  </button>

                  <button
                    onClick={() =>
                      setStatuses((prev) => ({
                        ...prev,
                        [index]: "irrelevant",
                      }))
                    }
                    className="rounded-lg border bg-white px-3 py-1.5 text-xs hover:bg-slate-50"
                  >
                    לא רלוונטי
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status, type }) {
  if (status === "answered") {
    return (
      <span className="mt-1 shrink-0 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[11px]">
        נענה
      </span>
    );
  }

  if (status === "irrelevant") {
    return (
      <span className="mt-1 shrink-0 rounded-full bg-slate-100 text-slate-500 border px-2 py-0.5 text-[11px]">
        נדחה
      </span>
    );
  }

  return (
    <span className="mt-1 shrink-0 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[11px]">
      {type === "question" ? "שאלה" : "חסר"}
    </span>
  );
}

function formatType(type) {
  switch (type) {
    case "question-answer":
      return "תשובה";

    case "missing-evidence":
      return "ראיה";

    case "free-input":
      return "קלט";

    default:
      return "עדכון";
  }
}
