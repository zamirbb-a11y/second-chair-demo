import Card from "./Card";
import CompactList from "./CompactList";
import GroundingInline from "./GroundingInline";
import HorizontalTimeline from "./HorizontalTimeline";
import SeverityBadge from "./SeverityBadge";

export default function EvidenceGaps({ analysis }) {
  const eg = analysis?.evidenceAndGaps;

  return (
    <div className="space-y-4">
      <Card title="לוח זמנים עיקרי" compact>
        <HorizontalTimeline items={eg?.timeline} />
      </Card>

      <Card title="מפת ראיות" compact>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-2.5 text-right">סוגיה</th>
                <th className="p-2.5 text-right">ראיה קיימת</th>
                <th className="p-2.5 text-right">ראיה חסרה</th>
                <th className="p-2.5 text-right w-24">סיכון</th>
                <th className="p-2.5 text-right w-32">מקור</th>
              </tr>
            </thead>

            <tbody>
              {(eg?.evidenceMap || []).map((row, index) => (
                <tr key={index} className="border-b align-top">
                  <td className="p-2.5 font-medium leading-6">
                    {row.issue}
                  </td>

                  <td className="p-2.5 text-slate-700 leading-6">
                    {row.existingEvidence}
                  </td>

                  <td className="p-2.5 text-slate-700 leading-6">
                    {row.missingEvidence}
                  </td>

                  <td className="p-2.5">
                    <SeverityBadge value={row.risk} />
                  </td>

                  <td className="p-2.5">
                    <GroundingInline items={row.grounding} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="חוסרים ראייתיים" compact>
        <CompactList items={eg?.missingEvidence} />
      </Card>
    </div>
  );
}
