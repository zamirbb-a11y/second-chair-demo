import Card from "./Card";
import CompactList from "./CompactList";
import GroundingInline from "./GroundingInline";
import SeverityBadge from "./SeverityBadge";

export default function ExecutiveView({ analysis }) {
  const ev = analysis?.executiveView;
  const snapshot = ev?.caseSnapshot;
  const outlook = ev?.strategicAssessment;

  return (
    <div className="space-y-4">
      <Card title="תמונת מצב" compact>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <h3 className="font-semibold mb-2">בעלי עניין</h3>
            <CompactList items={snapshot?.parties} />
          </div>

          <div className="lg:col-span-2">
            <h3 className="font-semibold mb-2">מוקד המחלוקת</h3>
            <p className="text-[15px] leading-6 text-slate-700">
              {snapshot?.coreDispute || "לא זוהה"}
            </p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
              <span>סיכון: {snapshot?.riskLevel || "לא זוהה"}</span>
              <span>·</span>
              <span>ביטחון: {analysis?.confidence || "Medium"}</span>
              <span>·</span>
              <span>מוקד: {snapshot?.issueFocus || "לא זוהה"}</span>
            </div>

            <GroundingInline items={snapshot?.grounding} />
          </div>
        </div>
      </Card>

      <Card title="סוגיות מרכזיות" compact>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {(ev?.criticalIssues || []).map((item, index) => (
            <div
              key={index}
              className="border rounded-xl bg-white p-4"
            >
              <SeverityBadge value={item.severity} />
              <h3 className="font-semibold mt-3 mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-slate-700 leading-6">
                {item.analysis}
              </p>
              <GroundingInline items={item.grounding} />
            </div>
          ))}
        </div>
      </Card>

      <Card title="הערכת מצב" compact>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <OutlookBox title="לתובע / מבקש הביטול">
            {outlook?.forClaimant || "לא זוהה"}
          </OutlookBox>

          <OutlookBox title="זירת הקרב המרכזית" emphasized>
            {outlook?.mostLikelyBattleground || "לא זוהה"}
          </OutlookBox>

          <OutlookBox title="לנתבע / הצד שכנגד">
            {outlook?.forDefense || "לא זוהה"}
          </OutlookBox>
        </div>

        <GroundingInline items={outlook?.grounding} />
      </Card>
    </div>
  );
}

function OutlookBox({ title, children, emphasized }) {
  return (
    <div
      className={
        emphasized
          ? "rounded-xl border bg-slate-100 p-4"
          : "rounded-xl border bg-slate-50 p-4"
      }
    >
      <h3 className="font-semibold mb-2">{title}</h3>
      <div className="text-sm text-slate-700 leading-6">
        {children}
      </div>
    </div>
  );
}
