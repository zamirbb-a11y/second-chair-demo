import Card from "./Card";

export default function CaseTheory({ analysis }) {
  const ct = analysis?.caseTheory;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TheoryCard
          title="תיאוריית התובע"
          headline={ct?.claimantTheory?.headline}
          points={ct?.claimantTheory?.points}
          grounding={ct?.claimantTheory?.grounding}
        />

        <TheoryCard
          title="תיאוריית ההגנה"
          headline={ct?.defenseTheory?.headline}
          points={ct?.defenseTheory?.points}
          grounding={ct?.defenseTheory?.grounding}
        />
      </div>

      <Card title="זירת המחלוקת" compact>
        <div className="rounded-xl border bg-slate-50 p-4">
          <div className="font-semibold">
            {ct?.litigationBattleground?.issue || "זירת מחלוקת"}
          </div>

          <div className="mt-2 text-sm text-slate-700 leading-6">
            {ct?.litigationBattleground?.why || "לא זוהה"}
          </div>

          <Footnotes items={ct?.litigationBattleground?.grounding} />
        </div>
      </Card>
    </div>
  );
}

function TheoryCard({ title, headline, points, grounding }) {
  return (
    <Card title={title} compact>
      <h3 className="font-semibold mb-3 text-slate-800">
        {headline || "לא זוהתה תיאוריה"}
      </h3>

      {!points || !points.length ? (
        <p className="text-slate-500 text-sm">לא זוהה.</p>
      ) : (
        <ul className="list-disc pr-5 space-y-2">
          {points.map((point, index) => (
            <li key={index} className="leading-6 text-[15px]">
              {point}
              {grounding?.[index] && (
                <span className="mr-2 text-[11px] text-slate-400">
                  [{grounding[index]}]
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Footnotes({ items }) {
  if (!items || !items.length) return null;

  return (
    <div className="mt-2 text-[11px] text-slate-400 leading-4">
      {items.map((item, index) => (
        <span key={index}>
          [{item}]
          {index < items.length - 1 ? " · " : ""}
        </span>
      ))}
    </div>
  );
}
