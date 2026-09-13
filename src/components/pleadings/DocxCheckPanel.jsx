// Displays the opt-in .docx check (formal/צורני + legal-writing
// consistency) — a side-check, separate from the per-claim QA, so it
// gets its own compact panel rather than being folded into the claim
// list. Only rendered when the record actually has a stored result.

function Section({ title, items, render }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-3">
      <h5 className="text-xs font-bold text-slate-600 mb-1.5">{title} ({items.length})</h5>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-slate-700 leading-relaxed border-r-2 border-amber-300 pr-2">
            {render(item)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DocxCheckPanel({ docxCheck }) {
  if (!docxCheck) return null;
  const { formatFindings = [], consistencyFindings } = docxCheck;
  const hasAny =
    formatFindings.length > 0 ||
    consistencyFindings?.inconsistent_terms?.length > 0 ||
    consistencyFindings?.broken_cross_references?.length > 0 ||
    consistencyFindings?.ambiguous_referents?.length > 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 mt-3 max-w-[680px]">
      <h4 className="text-xs font-bold text-slate-600 mb-2">בדיקה צורנית ועקביות לשונית (טיוטת וורד)</h4>
      {!hasAny && <p className="text-xs text-slate-500">לא נמצאו ממצאים בבדיקה זו.</p>}

      <Section title="צורני" items={formatFindings} render={(f) => f} />
      <Section
        title="כינויים לא עקביים"
        items={consistencyFindings?.inconsistent_terms}
        render={(t) => (
          <>
            <span className="font-semibold">"{t.term_a}"</span> לעומת <span className="font-semibold">"{t.term_b}"</span>
            {t.explanation && <span className="text-slate-500"> — {t.explanation}</span>}
          </>
        )}
      />
      <Section
        title="הפניות פנימיות שגויות"
        items={consistencyFindings?.broken_cross_references}
        render={(r) => (
          <>
            <span className="font-semibold">"{r.reference_text}"</span>
            {r.problem && <span className="text-slate-500"> — {r.problem}</span>}
          </>
        )}
      />
      <Section
        title="כינויי גוף מעורפלים"
        items={consistencyFindings?.ambiguous_referents}
        render={(a) => (
          <>
            <span className="font-semibold">"{a.quote}"</span>
            {a.explanation && <span className="text-slate-500"> — {a.explanation}</span>}
          </>
        )}
      />
    </div>
  );
}
