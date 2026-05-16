import { useState } from "react";

import Card from "./Card";
import CompactList from "./CompactList";
import GroundingInline from "./GroundingInline";
import HorizontalTimeline from "./HorizontalTimeline";
import SeverityBadge from "./SeverityBadge";

const SECTIONS = [
  {
    id: "case",
    title: "מצב התיק",
    color: "border-blue-500",
  },

  {
    id: "timeline",
    title: "ציר זמן",
    color: "border-violet-500",
  },

  {
    id: "theory",
    title: "תיאוריה משפטית",
    color: "border-indigo-500",
  },

  {
    id: "evidence",
    title: "מצב ראייתי",
    color: "border-emerald-500",
  },

  {
    id: "cases",
    title: "פסיקה",
    color: "border-amber-500",
  },
];

export default function AnalysisWorkspace({
  analysis,
  workspaceUpdates = [],
  analysisDiff = [],
  onAddWorkspaceUpdate,
}) {
  const [activeSection, setActiveSection] =
    useState("case");

  const [feedOpen, setFeedOpen] =
    useState(true);

  const [selectedItem, setSelectedItem] =
    useState(null);

  const [freeText, setFreeText] =
    useState("");

  const ev = analysis?.executiveView;
  const snapshot = ev?.caseSnapshot;
  const ct = analysis?.caseTheory;
  const eg = analysis?.evidenceAndGaps;
  const ac = analysis?.actionCenter;

  const parties =
    snapshot?.parties?.join(" · ") ||
    "לא זוהו צדדים";

  const dispute =
    snapshot?.coreDispute ||
    "לא זוהה מוקד מחלוקת";

  const workstreams = [
    {
      title: "שאלות ללקוח ומידע חסר",
      items: ac?.clientQuestions || [],
      empty: "לא זוהו שאלות פתוחות.",
      color: "border-blue-200",
    },

    {
      title: "מסמכים",
      items:
        ac?.discoveryTargets ||
        eg?.missingEvidence ||
        [],
      empty: "לא זוהו מסמכים חסרים.",
      color: "border-emerald-200",
    },

    {
      title: "פעולות מומלצות",
      items: ac?.nextSteps || [],
      empty: "לא זוהו פעולות מומלצות.",
      color: "border-amber-200",
    },

    {
      title: "בדיקת כתבי טענות",
      items: [
        "רכיב עתידי שיאפשר בדיקת כתבי טענות, זיהוי חסרים, סתירות וטענות שלא גובו במסמכים או בפסיקה.",
      ],
      placeholder: true,
      color: "border-violet-200",
    },
  ];

  function submitFreeText() {
    if (!freeText.trim()) return;

    onAddWorkspaceUpdate?.({
      type: "עדכון חופשי",
      topic: "מידע חדש",
      text: freeText,
    });

    setFreeText("");
  }

  return (
    <div className="space-y-8">
      <section className="bg-white border border-slate-200 rounded-3xl shadow-sm px-6 py-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-800">
              {parties}
            </div>

            <div className="text-base text-slate-700 mt-2 leading-7">
              {dispute}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500">
              רמת סיכון
            </div>

            <SeverityBadge
              value={snapshot?.riskLevel}
            />
          </div>
        </div>
      </section>

      {(analysisDiff.length > 0 ||
        workspaceUpdates.length > 0) && (
        <section className="bg-blue-50 border border-blue-100 rounded-2xl overflow-hidden">
          <button
            onClick={() =>
              setFeedOpen(!feedOpen)
            }
            className="w-full px-5 py-4 flex items-center justify-between text-right"
          >
            <div>
              <div className="font-semibold text-slate-800">
                עדכוני תיק
              </div>

              <div className="text-xs text-slate-500 mt-1">
                שינויים, מידע חדש והשפעה
                אפשרית על הניתוח
              </div>
            </div>

            <div className="text-xs text-slate-500">
              {feedOpen ? "סגור" : "פתח"}
            </div>
          </button>

          {feedOpen && (
            <div className="px-4 pb-4">
              <Feed
                workspaceUpdates={
                  workspaceUpdates
                }
                analysisDiff={analysisDiff}
              />
            </div>
          )}
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="text-xl font-bold text-slate-900">
            ניתוח התיק
          </div>

          <div className="h-px bg-slate-300 flex-1" />
        </div>

        <div className="bg-slate-100 border border-slate-200 rounded-3xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-5 border-b border-slate-200">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() =>
                  setActiveSection(
                    section.id
                  )
                }
                className={
                  activeSection ===
                  section.id
                    ? `text-right px-5 py-4 bg-white border-t-4 ${section.color}`
                    : "text-right px-5 py-4 hover:bg-white/60 border-t-4 border-transparent"
                }
              >
                <div className="font-semibold text-sm">
                  {section.title}
                </div>

                <div className="text-xs text-slate-500 mt-1">
                  {getSectionSummary(
                    section.id,
                    {
                      snapshot,
                      ct,
                      eg,
                    }
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeSection ===
              "case" && (
              <CaseDetails
                ev={ev}
                snapshot={snapshot}
              />
            )}

            {activeSection ===
              "timeline" && (
              <TimelineDetails eg={eg} />
            )}

            {activeSection ===
              "theory" && (
              <TheoryDetails ct={ct} />
            )}

            {activeSection ===
              "evidence" && (
              <EvidenceDetails eg={eg} />
            )}

            {activeSection ===
              "cases" && (
              <CasesPlaceholder />
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="text-xl font-bold text-slate-900">
            מרחב עבודה
          </div>

          <div className="h-px bg-slate-300 flex-1" />
        </div>

        <div className="bg-amber-50/40 border border-amber-100 rounded-3xl p-5">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            {workstreams.map(
              (stream, index) => (
                <Workstream
                  key={index}
                  title={stream.title}
                  items={stream.items}
                  empty={stream.empty}
                  color={stream.color}
                  placeholder={
                    stream.placeholder
                  }
                  onSelect={(item) =>
                    setSelectedItem({
                      title:
                        stream.title,
                      text: item,
                    })
                  }
                />
              )
            )}
          </div>

          <div className="mt-5">
            <Card
              title="הוסף מידע חדש"
              compact
            >
              <div className="space-y-4">
                <textarea
                  value={freeText}
                  onChange={(e) =>
                    setFreeText(
                      e.target.value
                    )
                  }
                  rows={4}
                  placeholder="הוסף מידע חדש, הערת לקוח, מחשבה אסטרטגית, מסמך חסר או כל עדכון אחר..."
                  className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6"
                />

                <div className="rounded-2xl border border-dashed bg-white px-4 py-5 text-sm text-slate-500">
                  העלאת קבצים — רכיב
                  להשלמה
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-xs text-slate-500">
                    המערכת תסווג את
                    המידע באופן אוטומטי.
                  </div>

                  <button
                    onClick={
                      submitFreeText
                    }
                    className="rounded-xl bg-slate-900 text-white px-5 py-2.5 text-sm font-semibold"
                  >
                    עדכן את הניתוח
                  </button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {selectedItem && (
        <SmallItemDrawer
          item={selectedItem}
          onClose={() =>
            setSelectedItem(null)
          }
          onAddWorkspaceUpdate={
            onAddWorkspaceUpdate
          }
        />
      )}
    </div>
  );
}

function getSectionSummary(
  id,
  { snapshot, ct, eg }
) {
  if (id === "case") {
    return (
      snapshot?.riskLevel ||
      "מוקד וסיכון"
    );
  }

  if (id === "timeline") {
    return "כרונולוגיה";
  }

  if (id === "theory") {
    return (
      ct?.litigationBattleground
        ?.issue ||
      "עילות והגנות"
    );
  }

  if (id === "evidence") {
    return (
      eg?.missingEvidence?.[0] ||
      "חוסרים ופערים"
    );
  }

  if (id === "cases") {
    return "פסיקה רלוונטית";
  }

  return "";
}

function CaseDetails({
  ev,
  snapshot,
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <InfoCard title="מוקד המחלוקת">
        <p>
          {snapshot?.coreDispute ||
            "לא זוהה"}
        </p>
      </InfoCard>

      <InfoCard title="מחלוקות נוספות">
        <div className="space-y-3">
          {(ev?.criticalIssues || [])
            .slice(0, 2)
            .map((item, index) => (
              <div key={index}>
                <div className="font-medium">
                  {item.title}
                </div>

                <div className="text-sm text-slate-600 leading-6 mt-1">
                  {item.analysis}
                </div>
              </div>
            ))}
        </div>
      </InfoCard>

      <InfoCard title="הערכת מצב">
        <p>
          {snapshot?.issueFocus ||
            "לא זוהה"}
        </p>

        <GroundingInline
          items={snapshot?.grounding}
        />
      </InfoCard>
    </div>
  );
}

function TheoryDetails({ ct }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <InfoCard title="תיאוריית התובע">
        <CompactList
          items={
            ct?.claimantTheory
              ?.points
          }
        />
      </InfoCard>

      <InfoCard title="תיאוריית ההגנה">
        <CompactList
          items={
            ct?.defenseTheory
              ?.points
          }
        />
      </InfoCard>
    </div>
  );
}

function EvidenceDetails({ eg }) {
  return (
    <div className="space-y-3">
      {(eg?.evidenceMap || [])
        .slice(0, 4)
        .map((row, index) => (
          <div
            key={index}
            className="bg-white border border-emerald-100 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold">
                {row.issue}
              </div>

              <SeverityBadge
                value={row.risk}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4 text-sm">
              <div>
                <div className="text-xs text-slate-500 mb-1">
                  ראיה קיימת
                </div>

                <div>
                  {
                    row.existingEvidence
                  }
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1">
                  חסר / דורש השלמה
                </div>

                <div>
                  {
                    row.missingEvidence
                  }
                </div>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}

function TimelineDetails({ eg }) {
  return (
    <div className="bg-white border border-violet-100 rounded-2xl p-5">
      <HorizontalTimeline
        items={eg?.timeline}
      />
    </div>
  );
}

function CasesPlaceholder() {
  return (
    <div className="bg-white border border-amber-100 rounded-2xl p-6">
      <div className="font-semibold">
        פסיקה רלוונטית
      </div>

      <div className="mt-3 text-sm text-slate-600 leading-7">
        רכיב זה יציג בהמשך:
        <br />
        • פסקי דין רלוונטיים
        <br />
        • הבחנות אפשריות
        <br />
        • עקרונות מובילים
        <br />• תקדימים שסותרים או
        מחזקים את התיק
      </div>
    </div>
  );
}

function InfoCard({
  title,
  children,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <h3 className="font-semibold mb-3">
        {title}
      </h3>

      <div className="text-sm text-slate-700 leading-7">
        {children}
      </div>
    </div>
  );
}

function Workstream({
  title,
  items,
  empty,
  color,
  placeholder,
  onSelect,
}) {
  const rows = (items || []).slice(
    0,
    5
  );

  return (
    <section
      className={`bg-white border rounded-2xl p-4 ${color}`}
    >
      <div className="font-semibold mb-4">
        {title}
      </div>

      {!rows.length ? (
        <div className="text-sm text-slate-500">
          {empty}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((item, index) => (
            <button
              key={index}
              onClick={() =>
                onSelect(item)
              }
              className="w-full text-right rounded-xl border border-slate-200 bg-slate-50 hover:bg-white p-3 text-sm leading-6 transition"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function SmallItemDrawer({
  item,
  onClose,
  onAddWorkspaceUpdate,
}) {
  const [answer, setAnswer] =
    useState("");

  function submitAnswer() {
    if (!answer.trim()) return;

    onAddWorkspaceUpdate?.({
      type: "עדכון לפריט עבודה",
      topic: item.title,
      text: `${item.text}\n\n${answer}`,
    });

    setAnswer("");

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/20 flex items-center justify-center p-4">
      <div className="bg-white border rounded-2xl shadow-xl w-full max-w-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500">
              {item.title}
            </div>

            <div className="font-semibold mt-1 leading-7">
              {item.text}
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400"
          >
            ✕
          </button>
        </div>

        <textarea
          value={answer}
          onChange={(e) =>
            setAnswer(
              e.target.value
            )
          }
          rows={4}
          placeholder="הוסף תשובה או מידע..."
          className="mt-4 w-full rounded-2xl border border-slate-200 p-4 text-sm"
        />

        <div className="mt-3 rounded-2xl border border-dashed p-4 text-sm text-slate-500">
          צירוף קבצים — רכיב להשלמה
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border px-4 py-2 text-sm"
          >
            סגור
          </button>

          <button
            onClick={submitAnswer}
            className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold"
          >
            שמור
          </button>
        </div>
      </div>
    </div>
  );
}

function safeText(value) {
  if (value == null) return "";

  if (typeof value === "string")
    return value;

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map(safeText)
      .join(" · ");
  }

  if (typeof value === "object") {
    return (
      value.text ||
      value.summary ||
      value.title ||
      value.message ||
      JSON.stringify(
        value,
        null,
        2
      )
    );
  }

  return String(value);
}

function Feed({
  workspaceUpdates,
  analysisDiff,
}) {
  const items = [
    ...analysisDiff.map(
      (item) => ({
        type: "עדכון ניתוח",
        text: safeText(
          item?.text || item
        ),
      })
    ),

    ...workspaceUpdates.map(
      (item) => ({
        type: safeText(
          item?.type || "עדכון"
        ),
        text: safeText(
          item?.text
        ),
        topic: safeText(
          item?.topic
        ),
      })
    ),
  ].slice(0, 5);

  if (!items.length) {
    return null;
  }

  return (
    <div className="space-y-2">
      {items.map(
        (item, index) => (
          <div
            key={index}
            className="rounded-xl border border-blue-100 bg-white p-3"
          >
            <div className="text-xs text-slate-500 mb-1">
              {item.type}

              {item.topic
                ? ` · ${item.topic}`
                : ""}
            </div>

            <div className="text-sm leading-6 text-slate-700 whitespace-pre-wrap">
              {item.text}
            </div>
          </div>
        )
      )}
    </div>
  );
}
