import { useState } from "react";

export default function StrategicWorkspace({ analysis }) {
  const questions = analysis?.actionCenter?.clientQuestions || [];
  const missingEvidence = analysis?.evidenceAndGaps?.missingEvidence || [];
  const [freeInput, setFreeInput] = useState("");

  return (
    <aside className="bg-white border rounded-2xl shadow-sm p-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold">מרחב עבודה</h2>
        <p className="text-xs text-slate-500 mt-1">
          שאלות, חוסרים וקלט נוסף שיכולים לשנות את הערכת התיק.
        </p>
      </div>

      <WorkspaceSection title="שאלות שעשויות לשנות את הניתוח">
        <InteractiveItems
          items={questions}
          type="question"
          empty="לא זוהו שאלות מהותיות."
        />
      </WorkspaceSection>

      <WorkspaceSection title="מסמכים / ראיות חסרים">
        <InteractiveItems
          items={missingEvidence}
          type="missing"
          empty="לא זוהו חוסרים מרכזיים."
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
          <button className="rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-semibold">
            הוסף לתיק
          </button>

          <button className="rounded-lg border bg-white px-3 py-1.5 text-xs hover:bg-slate-50">
            שאל את המערכת
          </button>
        </div>
      </WorkspaceSection>

      <WorkspaceSection title="מה השתנה">
        <p className="text-sm text-slate-500 leading-6">
          לאחר הוספת מידע חדש, כאן יוצגו שינויים בהערכת הסיכון, בתיאוריות התיק
          ובפערים הראייתיים.
        </p>
      </WorkspaceSection>
    </aside>
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

function InteractiveItems({ items, type, empty }) {
  const shown = (items || []).slice(0, 4);
  const [openIndex, setOpenIndex] = useState(null);
  const [answers, setAnswers] = useState({});
  const [statuses, setStatuses] = useState({});

  if (!shown.length) {
    return <p className="text-sm text-slate-500">{empty}</p>;
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
                    onClick={() =>
                      setStatuses((prev) => ({
                        ...prev,
                        [index]: "answered",
                      }))
                    }
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
