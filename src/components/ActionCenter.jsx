import Card from "./Card";
import CompactList from "./CompactList";
import SeverityBadge from "./SeverityBadge";

export default function ActionCenter({ analysis }) {
  const ac = analysis?.actionCenter;

  return (
    <div className="space-y-4">
      <Card title="סדר עדיפויות מיידי" compact>
        <PrioritiesTable items={ac?.nextSteps} />
      </Card>

      <Card title="מהלכי עבודה" compact>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Workstream title="שאלות ללקוח" items={ac?.clientQuestions} />
          <Workstream title="יעדי גילוי" items={ac?.discoveryTargets} />
        </div>
      </Card>
    </div>
  );
}

function PrioritiesTable({ items }) {
  const rows = (items || []).slice(0, 5);

  if (!rows.length) {
    return <p className="text-slate-500 text-sm">לא זוהו פעולות מיידיות.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-100">
            <th className="p-2.5 text-right w-24">עדיפות</th>
            <th className="p-2.5 text-right">פעולה</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((item, index) => (
            <tr key={index} className="border-b align-top">
              <td className="p-2.5">
                <SeverityBadge
                  value={index < 2 ? "High" : index < 4 ? "Medium" : "Low"}
                />
              </td>

              <td className="p-2.5 font-medium leading-6">
                {item}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Workstream({ title, items }) {
  return (
    <section className="rounded-xl border bg-slate-50 p-4">
      <h3 className="font-semibold mb-3">{title}</h3>
      <CompactList items={items} numbered limit={5} />
    </section>
  );
}
