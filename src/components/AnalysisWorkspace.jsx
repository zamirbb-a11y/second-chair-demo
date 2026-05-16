import Card from "./Card";
import CompactList from "./CompactList";
import GroundingInline from "./GroundingInline";
import SeverityBadge from "./SeverityBadge";

export default function AnalysisWorkspace({
  analysis,
  workspaceUpdates = [],
  analysisDiff = [],
}) {
  const ev = analysis?.executiveView;
  const snapshot = ev?.caseSnapshot;
  const outlook = ev?.strategicAssessment;
  const ct = analysis?.caseTheory;
  const eg = analysis?.evidenceAndGaps;
  const ac = analysis?.actionCenter;

  const primaryFocus =
    outlook?.mostLikelyBattleground ||
    snapshot?.issueFocus ||
    snapshot?.coreDispute ||
    "לא זוהה מוקד מרכזי";

  return (
    <div className="space-y-4">
      <section className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm">
        <div className="text-xs text-slate-300 mb-2">
          מוקד ניהולי מרכזי
        </div>
        <h2 className="text-xl font-bold leading-8">
          {primaryFocus}
        </h2>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
          <span>סיכון: {snapshot?.riskLevel || "לא זוהה"}</span>
          <span>·</span>
          <span>ביטחון: {analysis?.confidence || "Medium"}</span>
          <span>·</span>
          <span>קבצי ניתוח פעילים</span>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        <CockpitCard title="מצב התיק">
          <p className="text-sm leading-6 text-slate-700">
            {snapshot?.coreDispute || "לא זוהה מוקד מחלוקת."}
          </p>
          <div className="mt-3">
            <SeverityBadge value={snapshot?.riskLevel} />
          </div>
          <GroundingInline items={snapshot?.grounding} />
        </CockpitCard>

        <CockpitCard title="תיאוריה משפטית">
          <div className="space-y-3">
            <MiniBlock
              title="תובע"
              text={ct?.claimantTheory?.headline}
            />
            <MiniBlock
              title="הגנה"
              text={ct?.defenseTheory?.headline}
            />
          </div>
        </CockpitCard>

        <CockpitCard title="מצב ראייתי">
          <div className="text-sm text-slate-700 leading-6">
            {(eg?.evidenceMap || []).slice(0, 3).map((row, index) => (
              <div key={index} className="border-b last:border-b-0 py-2">
                <div className="font-medium">{row.issue}</div>
                <div className="text-slate-500">
                  חסר: {row.missingEvidence || "לא זוהה"}
                </div>
              </div>
            ))}
          </div>
        </CockpitCard>

        <CockpitCard title="פעולות מיידיות">
          <CompactList items={(ac?.nextSteps || []).slice(0, 4)} numbered />
        </CockpitCard>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="מרחב עבודה — פעולות קריטיות" compact>
          <ActionList items={ac?.nextSteps} />
        </Card>

        <Card title="גילוי ומסמכים חסרים" compact>
          <ActionList items={ac?.discoveryTargets || eg?.missingEvidence} />
        </Card>

        <Card title="שאלות ללקוח / לעדים" compact>
          <ActionList items={ac?.clientQuestions} />
        </Card>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="זירת המחלוקת" compact>
          <div className="rounded-xl border bg-slate-50 p-4">
            <div className="font-semibold">
              {ct?.litigationBattleground?.issue || "לא זוהתה"}
            </div>
            <p className="mt-2 text-sm text-slate-700 leading-6">
              {ct?.litigationBattleground?.why || "לא זוהה נימוק."}
            </p>
          </div>
        </Card>

        <Card title="Case Intelligence Feed" compact>
          <Feed
            workspaceUpdates={workspaceUpdates}
            analysisDiff={analysisDiff}
          />
        </Card>
      </section>
    </div>
  );
}

function CockpitCard({ title, children }) {
  return (
    <section className="bg-white border rounded-2xl shadow-sm p-4 min-h-[190px]">
      <h3 className="font-semibold mb-3">{title}</h3>
      {children}
    </section>
  );
}

function MiniBlock({ title, text }) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">{title}</div>
      <div className="text-sm leading-6 text-slate-700">
        {text || "לא זוהה"}
      </div>
    </div>
  );
}

function ActionList({ items }) {
  const rows = (items || []).slice(0, 5);

  if (!rows.length) {
    return <p className="text-sm text-slate-500">לא זוהו פעולות.</p>;
  }

  return (
    <div className="space-y-2">
      {rows.map((item, index) => (
        <div
          key={index}
          className="flex gap-3 rounded-xl border bg-slate-50 p-3"
        >
          <div className="mt-0.5">
            <SeverityBadge
              value={index < 2 ? "High" : index < 4 ? "Medium" : "Low"}
            />
          </div>

          <div className="text-sm leading-6 text-slate-700">
            {item}
          </div>
        </div>
      ))}
    </div>
  );
}

function Feed({ workspaceUpdates, analysisDiff }) {
  const hasUpdates = workspaceUpdates.length || analysisDiff.length;

  if (!hasUpdates) {
    return (
      <p className="text-sm text-slate-500">
        עדיין אין עדכונים. לאחר הוספת מידע והרצת ניתוח מחדש, יופיעו כאן שינויים ותובנות חדשות.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {analysisDiff.slice(0, 4).map((item, index) => (
        <div key={`diff-${index}`} className="rounded-xl border bg-slate-50 p-3">
          <div className="text-xs text-slate-500 mb-1">עדכון ניתוח</div>
          <div className="text-sm leading-6">{item.text || item}</div>
        </div>
      ))}

      {workspaceUpdates.slice(0, 4).map((item, index) => (
        <div key={`work-${index}`} className="rounded-xl border bg-slate-50 p-3">
          <div className="text-xs text-slate-500 mb-1">
            עדכון ממרחב העבודה · {item.type}
          </div>
          <div className="font-medium text-sm">{item.topic}</div>
          <div className="text-sm leading-6 text-slate-700 mt-1">
            {item.text}
          </div>
        </div>
      ))}
    </div>
  );
}
