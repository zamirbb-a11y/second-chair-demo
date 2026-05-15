export default function StrategicWorkspace({ analysis }) {
  const questions = analysis?.actionCenter?.clientQuestions || [];
  const missingEvidence = analysis?.evidenceAndGaps?.missingEvidence || [];

  return (
    <aside className="bg-white border rounded-2xl shadow-sm p-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold">מרחב עבודה</h2>
        <p className="text-xs text-slate-500 mt-1">
          שאלות, חוסרים וקלט נוסף שיכולים לשנות את הערכת התיק.
        </p>
      </div>

      <WorkspaceSection title="שאלות שעשויות לשנות את הניתוח">
        <CompactItems items={questions} empty="לא זוהו שאלות מהותיות." />
      </WorkspaceSection>

      <WorkspaceSection title="מסמכים / ראיות חסרים">
        <CompactItems items={missingEvidence} empty="לא זוהו חוסרים מרכזיים." />
      </WorkspaceSection>

      <WorkspaceSection title="הוסף מידע או שאלה">
        <textarea
          placeholder="לדוגמה: יש לנו מייל DD נוסף שבו הרוכשים שאלו על עסקת הבנק..."
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
          לאחר הוספת מידע חדש, כאן יוצגו שינויים בהערכת הסיכון, בתיאוריות התיק ובפערים הראייתיים.
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

function CompactItems({ items, empty }) {
  const shown = (items || []).slice(0, 4);

  if (!shown.length) {
    return <p className="text-sm text-slate-500">{empty}</p>;
  }

  return (
    <ul className="list-disc pr-5 space-y-1.5">
      {shown.map((item, index) => (
        <li key={index} className="text-sm leading-6">
          {item}
        </li>
      ))}
    </ul>
  );
}
