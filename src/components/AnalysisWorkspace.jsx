import { useState } from "react";

import Card from "./Card";
import CompactList from "./CompactList";
import GroundingInline from "./GroundingInline";
import SeverityBadge from "./SeverityBadge";

const ANALYSIS_SECTIONS = [
  {
    id: "case",
    title: "מצב התיק",
  },
  {
    id: "theory",
    title: "תיאוריה משפטית",
  },
  {
    id: "evidence",
    title: "מצב ראייתי",
  },
  {
    id: "actions",
    title: "פעולות מיידיות",
  },
];

export default function AnalysisWorkspace({
  analysis,
  workspaceUpdates = [],
  analysisDiff = [],
  onAddWorkspaceUpdate,
}) {
  const [activeSection, setActiveSection] =
    useState("actions");

  const [feedOpen, setFeedOpen] = useState(true);

  const [updateType, setUpdateType] =
    useState("מידע חדש");

  const [updateTopic, setUpdateTopic] =
    useState("");

  const [updateText, setUpdateText] =
    useState("");

  const ev = analysis?.executiveView;
  const snapshot = ev?.caseSnapshot;
  const ct = analysis?.caseTheory;
  const eg = analysis?.evidenceAndGaps;
  const ac = analysis?.actionCenter;

  function submitUpdate() {
    if (!updateText.trim()) return;

    onAddWorkspaceUpdate?.({
      type: updateType,
      topic: updateTopic || "עדכון חדש",
      text: updateText,
    });

    setUpdateTopic("");
    setUpdateText("");
  }

  return (
    <div className="space-y-5">
      <section className="bg-white border rounded-2xl shadow-sm p-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SummaryBlock
            label="צדדים"
            value={
              snapshot?.parties?.join(" · ") ||
              "לא זוהו צדדים"
            }
          />

          <SummaryBlock
            label="מוקד מחלוקת"
            value={
              snapshot?.coreDispute ||
              "לא זוהה מוקד מחלוקת"
            }
          />

          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-slate-500 mb-1">
                רמת סיכון
              </div>

              <SeverityBadge
                value={snapshot?.riskLevel}
              />
            </div>

            <div className="text-sm text-slate-500">
              ביטחון:{" "}
              {analysis?.confidence || "Medium"}
            </div>
          </div>
        </div>
      </section>

      {(analysisDiff.length > 0 ||
        workspaceUpdates.length > 0) && (
        <section className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
          <button
            onClick={() => setFeedOpen(!feedOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-right"
          >
            <div className="font-semibold">
              Case Intelligence Feed
            </div>

            <div className="text-sm text-slate-500">
              {feedOpen ? "סגור" : "פתח"}
            </div>
          </button>

          {feedOpen && (
            <div className="px-4 pb-4 space-y-2">
              <Feed
                workspaceUpdates={workspaceUpdates}
                analysisDiff={analysisDiff}
              />
            </div>
          )}
        </section>
      )}

      <section className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-lg font-bold">
            AI Analysis
          </div>

          <div className="h-px bg-slate-200 flex-1" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          <AnalysisCard
            active={activeSection === "case"}
            onClick={() =>
              setActiveSection("case")
            }
            title="מצב התיק"
            summary={
              snapshot?.coreDispute ||
              "לא זוהה מוקד מחלוקת"
            }
            badge={snapshot?.riskLevel}
          />

          <AnalysisCard
            active={activeSection === "theory"}
            onClick={() =>
              setActiveSection("theory")
            }
            title="תיאוריה משפטית"
            summary={
              ct?.claimantTheory?.headline ||
              "לא זוהתה תיאוריה"
            }
          />

          <AnalysisCard
            active={activeSection === "evidence"}
            onClick={() =>
              setActiveSection("evidence")
            }
            title="מצב ראייתי"
            summary={
              eg?.missingEvidence?.[0] ||
              "לא זוהו חוסרים"
            }
          />

          <AnalysisCard
            active={activeSection === "actions"}
            onClick={() =>
              setActiveSection("actions")
            }
            title="פעולות מיידיות"
            summary={
              ac?.nextSteps?.[0] ||
              "לא זוהו פעולות"
            }
          />
        </div>

        <div className="mt-4">
          {activeSection === "case" && (
            <Card title="מצב התיק" compact>
              <CompactList
                items={
                  ev?.criticalIssues?.map(
                    (i) => i.title
                  ) || []
                }
              />
            </Card>
          )}

          {activeSection === "theory" && (
            <Card title="תיאוריה משפטית" compact>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TheoryBox
                  title="תובע"
                  text={
                    ct?.claimantTheory
                      ?.headline
                  }
                />

                <TheoryBox
                  title="הגנה"
                  text={
                    ct?.defenseTheory
                      ?.headline
                  }
                />
              </div>
            </Card>
          )}

          {activeSection === "evidence" && (
            <Card title="פערים ראייתיים" compact>
              <ActionList
                items={
                  eg?.missingEvidence
                }
              />
            </Card>
          )}

          {activeSection === "actions" && (
            <Card title="פעולות מיידיות" compact>
              <ActionList
                items={ac?.nextSteps}
              />
            </Card>
          )}
        </div>
      </section>

      <section className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-lg font-bold">
            Litigation Workspace
          </div>

          <div className="h-px bg-slate-200 flex-1" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card title="פעולות קריטיות" compact>
            <ActionList
              items={ac?.nextSteps}
            />
          </Card>

          <Card title="גילוי ומסמכים חסרים" compact>
            <ActionList
              items={
                ac?.discoveryTargets ||
                eg?.missingEvidence
              }
            />
          </Card>

          <Card title="שאלות ללקוח / עדים" compact>
            <ActionList
              items={ac?.clientQuestions}
            />
          </Card>
        </div>

        <div className="mt-4">
          <Card
            title="הוסף מידע / מחשבה / עדכון"
            compact
          >
            <div className="space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <select
                  value={updateType}
                  onChange={(e) =>
                    setUpdateType(
                      e.target.value
                    )
                  }
                  className="rounded-xl border bg-white px-3 py-2 text-sm"
                >
                  <option>
                    מידע חדש
                  </option>

                  <option>
                    מחשבה אסטרטגית
                  </option>

                  <option>
                    שאלה ללקוח
                  </option>

                  <option>
                    נקודת חולשה
                  </option>

                  <option>
                    ראיה חדשה
                  </option>
                </select>

                <input
                  value={updateTopic}
                  onChange={(e) =>
                    setUpdateTopic(
                      e.target.value
                    )
                  }
                  placeholder="נושא"
                  className="rounded-xl border px-3 py-2 text-sm"
                />

                <button
                  onClick={submitUpdate}
                  className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold"
                >
                  הוסף לעדכוני התיק
                </button>
              </div>

              <textarea
                value={updateText}
                onChange={(e) =>
                  setUpdateText(
                    e.target.value
                  )
                }
                rows={5}
                placeholder="הכנס מידע חופשי, מחשבות, שאלות, הערות, תובנות או מסמכים חסרים..."
                className="w-full rounded-2xl border p-4 text-sm leading-6"
              />
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

function SummaryBlock({
  label,
  value,
}) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">
        {label}
      </div>

      <div className="font-medium leading-6">
        {value}
      </div>
    </div>
  );
}

function AnalysisCard({
  title,
  summary,
  badge,
  active,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "text-right bg-slate-900 text-white rounded-2xl p-4 shadow-sm"
          : "text-right bg-white border rounded-2xl p-4 hover:border-slate-300"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="font-semibold">
          {title}
        </div>

        {badge && (
          <SeverityBadge value={badge} />
        )}
      </div>

      <div
        className={
          active
            ? "mt-3 text-sm leading-6 text-slate-200"
            : "mt-3 text-sm leading-6 text-slate-600"
        }
      >
        {summary}
      </div>

      <div
        className={
          active
            ? "mt-4 text-xs text-slate-300"
            : "mt-4 text-xs text-slate-400"
        }
      >
        לחץ לפירוט
      </div>
    </button>
  );
}

function TheoryBox({
  title,
  text,
}) {
  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <div className="text-xs text-slate-500 mb-2">
        {title}
      </div>

      <div className="text-sm leading-6">
        {text || "לא זוהה"}
      </div>
    </div>
  );
}

function ActionList({
  items,
}) {
  const rows = (items || []).slice(
    0,
    5
  );

  if (!rows.length) {
    return (
      <p className="text-sm text-slate-500">
        לא זוהו פעולות.
      </p>
    );
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
              value={
                index < 2
                  ? "High"
                  : index < 4
                  ? "Medium"
                  : "Low"
              }
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

function Feed({
  workspaceUpdates,
  analysisDiff,
}) {
  return (
    <div className="space-y-2">
      {analysisDiff
        .slice(0, 4)
        .map((item, index) => (
          <div
            key={`diff-${index}`}
            className="rounded-xl border bg-white p-3"
          >
            <div className="text-xs text-slate-500 mb-1">
              עדכון ניתוח
            </div>

            <div className="text-sm leading-6">
              {item.text || item}
            </div>
          </div>
        ))}

      {workspaceUpdates
        .slice(0, 4)
        .map((item, index) => (
          <div
            key={`work-${index}`}
            className="rounded-xl border bg-white p-3"
          >
            <div className="text-xs text-slate-500 mb-1">
              {item.type}
            </div>

            <div className="font-medium text-sm">
              {item.topic}
            </div>

            <div className="text-sm leading-6 text-slate-700 mt-1">
              {item.text}
            </div>
          </div>
        ))}
    </div>
  );
}
