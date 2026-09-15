// תקציר tab — the landing view once analysis finishes. Everything here is
// derived (buildPleadingSummary, src/lib/pleadingSummary.js) from data the
// pipeline already computed, never a new AI call, so it can never drift
// from the full claim-by-claim breakdown it links out to.

const TONE_CLASSES = {
  red: "bg-red-50 border-red-200 text-red-800",
  amber: "bg-amber-50 border-amber-200 text-amber-800",
};

function SectionLabel({ children }) {
  return <p className="text-xs font-bold text-slate-500 mb-2">{children}</p>;
}

function EmptyNote({ children }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

function IssueRow({ tone, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={[
        "w-full flex items-center gap-2.5 text-right rounded-xl border px-3 py-2.5 text-sm leading-relaxed",
        TONE_CLASSES[tone] ?? TONE_CLASSES.amber,
        onClick ? "cursor-pointer hover:brightness-95" : "cursor-default",
      ].join(" ")}
    >
      <span className="flex-1 font-medium">{label}</span>
      {onClick && <span aria-hidden="true" className="flex-shrink-0 text-xs opacity-70">←</span>}
    </button>
  );
}

function ItemCard({ text, meta, onClick, toneClass = "bg-slate-50 hover:bg-slate-100" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-right rounded-xl px-3 py-2.5 cursor-pointer ${toneClass}`}
    >
      <p className="text-sm text-slate-800 leading-relaxed">{text}</p>
      {meta && <p className="text-xs text-slate-500 mt-1">{meta}</p>}
    </button>
  );
}

export default function PleadingSummary({ summary, respondsTo = [], onSelectFamily, onViewClaims }) {
  if (!summary) return null;

  const failedStructural = summary.structural.filter((c) => !c.ok);
  const hasCrossDocContext = respondsTo.length > 0;

  return (
    <div className="flex-1 overflow-y-auto px-7 py-5" dir="rtl">
      <p className="text-xs text-slate-500 mb-5">
        תצוגה מתומצתת של הניתוח.{" "}
        <button type="button" onClick={onViewClaims} className="text-blue-700 hover:text-blue-800 bg-transparent border-0 cursor-pointer p-0 font-semibold">
          לכל הטענות עם הביקורת המלאה על כל אחת ←
        </button>
      </p>

      {summary.mainClaims.length > 0 && (
        <div className="mb-6">
          <SectionLabel>שלוש הטענות העיקריות</SectionLabel>
          <div className="space-y-1.5">
            {summary.mainClaims.map((c, i) => (
              <div key={c.id} className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5">
                <span className="text-xs font-bold text-blue-700 flex-shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-sm text-slate-800 leading-relaxed">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.remedies.length > 0 && (
        <div className="mb-6">
          <SectionLabel>הסעדים העיקריים המבוקשים</SectionLabel>
          <div className="space-y-1.5">
            {summary.remedies.map((r, i) => (
              <div key={r.id} className="flex items-start gap-2.5 rounded-xl bg-blue-50 px-3 py-2.5">
                <span className="text-xs font-bold text-blue-700 flex-shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-sm text-blue-900 leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <SectionLabel>מה חשוב לדעת</SectionLabel>
        {summary.topIssues.length === 0 ? (
          <EmptyNote>לא נמצאו ממצאים בעלי חומרה גבוהה במסמך זה.</EmptyNote>
        ) : (
          <div className="space-y-1.5">
            {summary.topIssues.map((item, i) => (
              <IssueRow
                key={i}
                tone={item.tone}
                label={item.label}
                onClick={item.family ? () => onSelectFamily(item.family.id) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {failedStructural.length + summary.structural.filter((c) => c.ok).length > 0 && (
        <div className="mb-6">
          <SectionLabel>בדיקות צורניות</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {summary.structural.map((c, i) => (
              <span
                key={i}
                className={[
                  "text-xs font-medium px-2.5 py-1.5 rounded-lg",
                  c.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
                ].join(" ")}
              >
                {c.ok ? "✓ " : "✕ "}{c.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasCrossDocContext && (
        <div className="mb-6">
          <SectionLabel>סתירות ובעיות בין-מסמכיות</SectionLabel>
          {summary.alerts.length === 0 ? (
            <EmptyNote>לא נמצאו סתירות או בעיות מול המסמכים שסומנו כמענה.</EmptyNote>
          ) : (
            <div className="space-y-1.5">
              {summary.alerts.map((a, i) => (
                <IssueRow key={i} tone={a.tone} label={a.label} onClick={() => onSelectFamily(a.family.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-5 mb-6">
        <div>
          <SectionLabel>חולשות</SectionLabel>
          {summary.weaknesses.length === 0 ? (
            <EmptyNote>לא נמצאו חולשות משמעותיות.</EmptyNote>
          ) : (
            <div className="space-y-1.5">
              {summary.weaknesses.map((w, i) => (
                <ItemCard key={i} text={w.text} onClick={() => onSelectFamily(w.family.id)} />
              ))}
            </div>
          )}
        </div>
        <div>
          <SectionLabel>פערים</SectionLabel>
          {summary.gaps.length === 0 ? (
            <EmptyNote>לא נמצאו פערים ראייתיים או באסמכתאות.</EmptyNote>
          ) : (
            <div className="space-y-1.5">
              {summary.gaps.map((g, i) => (
                <ItemCard key={i} text={g.text} onClick={() => onSelectFamily(g.family.id)} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <SectionLabel>נקודות חוזקה</SectionLabel>
        {summary.strengths.length === 0 ? (
          <EmptyNote>לא נמצאו טענות מרכזיות נקיות מחולשה או פער בבדיקה זו.</EmptyNote>
        ) : (
          <div className="space-y-1.5">
            {summary.strengths.map((s, i) => (
              <ItemCard
                key={i}
                text={s.text}
                toneClass="bg-emerald-50 hover:bg-emerald-100"
                onClick={() => onSelectFamily(s.family.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-center pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onViewClaims}
          className="text-sm font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg px-4 py-2 bg-white hover:bg-slate-50 cursor-pointer"
        >
          עבור לפירוט המלא של כל הטענות ←
        </button>
      </div>
    </div>
  );
}
