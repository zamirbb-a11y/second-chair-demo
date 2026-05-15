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
          className="w-full min-h-28 rounded-xl border p-3 text-sm leading-6"
        />

        <div className="flex gap-2 mt-2">
          <button className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold">
            הוסף לתיק
          </button>

          <button className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-slate-50">
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

  if (!shown.length) {
    return <p className="text-sm text-slate-500">{empty}</p>;
  }

  return (
    <div className="space-y-2">
      {shown.map((item, index) => {
        const isOpen = openIndex === index;

        return (
          <div key={index} className="rounded-xl border bg-white overflow-hidden">
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="w-full text-right p-3 hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm leading-6 font-medium">{item}</span>
                <span className="text-xs text-slate-400 mt-1">
                  {isOpen ? "סגור" : "פתח"}
                </span>
              </div>
            </button>

            {isOpen && (
              <div className="border-t bg-slate-50 p-3 space-y-3">
                <p className="text-xs text-slate-500 leading-5">
                  {type === "question"
                    ? "ענה כאן אם המידע כבר ידוע לך. בהמשך התשובה תעדכן את מודל התיק ואת הערכת הסיכון."
                    : "העלה או תאר כאן את הראיה החסרה. בהמשך המערכת תבדוק כיצד היא משנה את הניתוח."}
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
                      ? "כתוב תשובה קצרה לשאלה..."
                      : "תאר את המסמך או הראיה שיש בידך..."
                  }
                  className="w-full min-h-24 rounded-xl border p-3 text-sm leading-6 bg-white"
                />

                <div className="flex flex-wrap gap-2">
                  <button className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold">
                    הוסף לתיק
                  </button>

                  <button className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-slate-50">
                    העלה מסמך
                  </button>

                  <button className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-slate-50">
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
