import { useState } from "react";

import Card from "./Card";
import CompactList from "./CompactList";
import GroundingInline from "./GroundingInline";
import HorizontalTimeline from "./HorizontalTimeline";
import SeverityBadge from "./SeverityBadge";

const SECTIONS = [
  { id: "case", title: "מצב התיק" },
  { id: "theory", title: "תיאוריה משפטית" },
  { id: "evidence", title: "מצב ראייתי" },
  { id: "timeline", title: "ציר זמן" },
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
  const outlook = ev?.strategicAssessment;
  const ct = analysis?.caseTheory;
  const eg = analysis?.evidenceAndGaps;
  const ac = analysis?.actionCenter;

  const parties =
    snapshot?.parties?.join(" · ") ||
    "לא זוהו צדדים";

  const dispute =
    snapshot?.coreDispute ||
    "לא זוהה מוקד מחלוקת";

  function submitFreeText() {
    if (!freeText.trim()) return;

    onAddWorkspaceUpdate?.({
      type: "עדכון חופשי",
      topic: "מידע חדש מהמשתמש",
      text: freeText,
    });

    setFreeText("");
  }

  const workstreams = [
    {
      title: "שאלות ללקוח ומידע חסר",
      items: ac?.clientQuestions || [],
      empty: "לא זוהו שאלות פתוחות.",
    },

    {
      title: "מסמכים",
      items:
        ac?.discoveryTargets ||
        eg?.missingEvidence ||
        [],
      empty: "לא זוהו מסמכים חסרים.",
    },

    {
      title: "פעולות מומלצות",
      items: ac?.nextSteps || [],
      empty: "לא זוהו פעולות מומלצות.",
    },

    {
      title: "טיוטות",
      items: [
        "רכיב טיוטות יאפשר בהמשך ליצור מכתבים, דרישות גילוי, שאלות לעדים וטיוטות כתבי טענות מתוך ניתוח התיק.",
      ],
      empty: "רכיב טיוטות טרם הופעל.",
      placeholder: true,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="bg-white border rounded-2xl shadow-sm px-5 py-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">
              {parties}
            </div>

            <div className="text-sm text-slate-600 mt-1 leading-6">
              {dispute}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <SeverityBadge
              value={snapshot?.riskLevel}
            />

            <span className="text-xs text-slate-500">
              ביטחון:{" "}
              {analysis?.confidence ||
                "Medium"}
            </span>
          </div>
        </div>
      </section>

      {(analysisDiff.length > 0 ||
        workspaceUpdates.length > 0) && (
        <section className="border rounded-2xl bg-slate-50 overflow-hidden">
          <button
            onClick={() =>
              setFeedOpen(!feedOpen)
            }
            className="w-full flex items-center justify-between px-4 py-3 text-right"
          >
            <div>
              <div className="font-semibold text-sm">
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

      <section>
        <SectionTitle title="ניתוח התיק" />

        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-4 border-b">
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
                    ? "text-right px-4 py-3 bg-slate-50 border-b-2 border-slate-700"
                    : "text-right px-4 py-3 hover:bg-slate-50 border-b-2 border-transparent"
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

          <div className="p-5 bg-slate-50/50">
            {activeSection ===
              "case" && (
              <CaseDetails
                ev={ev}
                snapshot={snapshot}
                outlook={outlook}
              />
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
              "timeline" && (
              <TimelineDetails eg={eg} />
            )}
          </div>
        </div>
      </section>

      <section>
        <SectionTitle title="מרחב עבודה" />

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {workstreams.map(
            (stream, index) => (
              <Workstream
                key={index}
                title={stream.title}
                items={stream.items}
                empty={stream.empty}
                placeholder={
                  stream.placeholder
                }
                onSelect={(item) =>
                  setSelectedItem({
                    title:
                      stream.title,
                    text: item,
                    placeholder:
                      stream.placeholder,
                  })
                }
              />
            )
          )}
        </div>

        <div className="mt-4">
          <Card
            title="הוסף מידע חדש לתיק"
            compact
          >
            <div className="space-y-3">
              <textarea
                value={freeText}
                onChange={(e) =>
                  setFreeText(
                    e.target.value
                  )
                }
                rows={4}
                placeholder="כתוב כאן מידע חדש, מחשבה, תשובת לקוח, עובדה חסרה, הערה על מסמך או כל עדכון אחר. המערכת תסווג לבד."
                className="w-full rounded-2xl border p-4 text-sm leading-6"
              />

              <div className="flex justify-between items-center gap-3">
                <div className="text-xs text-slate-500">
                  לאחר ההוספה ניתן
                  להריץ ניתוח מחדש.
                </div>

                <button
                  onClick={
                    submitFreeText
                  }
                  className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  disabled={
                    !freeText.trim()
                  }
                >
                  הוסף לתיק
                </button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {selectedItem && (
        <ItemDrawer
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

function SectionTitle({ title }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="text-lg font-bold">
        {title}
      </div>

      <div className="h-px bg-slate-200 flex-1" />
    </div>
  );
}

function getSectionSummary(
  id,
  { snapshot, ct, eg }
) {
  if (id === "case")
    return (
      snapshot?.riskLevel ||
      "סיכון ומוקד"
    );

  if (id === "theory")
    return (
      ct?.litigationBattleground
        ?.issue ||
      "עילות והגנות"
    );

  if (id === "evidence")
    return (
      eg?.missingEvidence?.[0] ||
      "ראיות וחוסרים"
    );

  if (id === "timeline")
    return "כרונולוגיה";

  return "";
}

function CaseDetails({
  ev,
  snapshot,
  outlook,
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <DetailBox title="מוקד המחלוקת">
        <p>
          {snapshot?.coreDispute ||
            "לא זוהה"}
        </p>

        <GroundingInline
          items={snapshot?.grounding}
        />
      </DetailBox>

      <DetailBox title="סוגיות מרכזיות">
        <div className="space-y-3">
          {(ev?.criticalIssues || [])
            .slice(0, 3)
            .map((item, index) => (
              <div key={index}>
                <SeverityBadge
                  value={
                    item.severity
                  }
                />

                <div className="font-medium mt-2">
                  {item.title}
                </div>

                <div className="text-sm text-slate-600 leading-6 mt-1">
                  {item.analysis}
                </div>
              </div>
            ))}
        </div>
      </DetailBox>

      <DetailBox title="הערכת מצב">
        <p className="font-medium">
          זירת הקרב המרכזית
        </p>

        <p className="mt-2">
          {outlook?.mostLikelyBattleground ||
            "לא זוהה"}
        </p>
      </DetailBox>
    </div>
  );
}

function TheoryDetails({ ct }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <DetailBox title="תיאוריית התובע">
        <p className="font-medium">
          {ct?.claimantTheory
            ?.headline ||
            "לא זוהתה"}
        </p>

        <CompactList
          items={
            ct?.claimantTheory
              ?.points
          }
          limit={4}
        />
      </DetailBox>

      <DetailBox title="תיאוריית ההגנה">
        <p className="font-medium">
          {ct?.defenseTheory
            ?.headline ||
            "לא זוהתה"}
        </p>

        <CompactList
          items={
            ct?.defenseTheory
              ?.points
          }
          limit={4}
        />
      </DetailBox>

      <DetailBox title="זירת המחלוקת המשפטית">
        <p className="font-medium">
          {ct?.litigationBattleground
            ?.issue ||
            "לא זוהתה"}
        </p>

        <p className="mt-2">
          {ct?.litigationBattleground
            ?.why || "לא זוהה"}
        </p>
      </DetailBox>
    </div>
  );
}

function EvidenceDetails({ eg }) {
  const rows =
    eg?.evidenceMap || [];

  return (
    <div className="space-y-3">
      {rows
        .slice(0, 5)
        .map((row, index) => (
          <div
            key={index}
            className="bg-white border rounded-2xl p-4 grid grid-cols-1 xl:grid-cols-[1fr_1fr_1fr_auto] gap-4"
          >
            <div>
              <div className="text-xs text-slate-500 mb-1">
                סוגיה
              </div>

              <div className="font-semibold">
                {row.issue}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-1">
                ראיה קיימת
              </div>

              <div className="text-sm leading-6">
                {
                  row.existingEvidence
                }
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-1">
                חסר / דורש השלמה
              </div>

              <div className="text-sm leading-6">
                {
                  row.missingEvidence
                }
              </div>
            </div>

            <div>
              <SeverityBadge
                value={row.risk}
              />
            </div>
          </div>
        ))}
    </div>
  );
}

function TimelineDetails({ eg }) {
  return (
    <div className="bg-white border rounded-2xl p-4">
      <HorizontalTimeline
        items={eg?.timeline}
      />
    </div>
  );
}

function DetailBox({
  title,
  children,
}) {
  return (
    <div className="bg-white border rounded-2xl p-4">
      <h3 className="font-semibold mb-3">
        {title}
      </h3>

      <div className="text-sm text-slate-700 leading-6">
        {children}
      </div>
    </div>
  );
}

function Workstream({
  title,
  items,
  empty,
  placeholder,
  onSelect,
}) {
  const rows = (items || []).slice(
    0,
    6
  );

  return (
    <section className="bg-white border rounded-2xl shadow-sm p-4 min-h-[260px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">
          {title}
        </h3>

        <span className="text-xs text-slate-400">
          {rows.length}
        </span>
      </div>

      {!rows.length ? (
        <p className="text-sm text-slate-500">
          {empty}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((item, index) => (
            <button
              key={index}
              onClick={() =>
                onSelect(item)
              }
              className={
                placeholder
                  ? "w-full text-right rounded-xl border border-dashed bg-slate-50 p-3 text-sm leading-6 text-slate-500 hover:bg-slate-100"
                  : "w-full text-right rounded-xl border bg-slate-50 p-3 text-sm leading-6 hover:bg-white hover:border-slate-300"
              }
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function ItemDrawer({
  item,
  onClose,
  onAddWorkspaceUpdate,
}) {
  const [note, setNote] =
    useState("");

  function submitNote() {
    if (!note.trim()) return;

    onAddWorkspaceUpdate?.({
      type: "עדכון לפריט עבודה",
      topic: item.title,
      text: `${item.text}\n\n${note}`,
    });

    setNote("");

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/20 flex items-end lg:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border w-full max-w-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">
              {item.title}
            </div>

            <h3 className="font-semibold leading-7">
              {item.text}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <button className="rounded-xl border px-3 py-2 bg-slate-50">
            פתוח
          </button>

          <button className="rounded-xl border px-3 py-2">
            בבדיקה
          </button>

          <button className="rounded-xl border px-3 py-2">
            הושלם
          </button>
        </div>

        <textarea
          value={note}
          onChange={(e) =>
            setNote(
              e.target.value
            )
          }
          rows={5}
          placeholder="הוסף תשובה, הערה, סטטוס, מידע משלים או הנחיה להמשך..."
          className="mt-4 w-full rounded-2xl border p-4 text-sm leading-6"
        />

        <div className="mt-3 rounded-2xl border border-dashed bg-slate-50 p-4 text-sm text-slate-500">
          העלאת קבצים לפריט
          הספציפי — רכיב להשלמה
          בשלב הבא.
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border px-4 py-2 text-sm"
          >
            סגור
          </button>

          <button
            onClick={submitNote}
            disabled={!note.trim()}
            className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            שמור עדכון
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
    return (
      <p className="text-sm text-slate-500">
        עדיין אין עדכונים.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map(
        (item, index) => (
          <div
            key={index}
            className="rounded-xl border bg-white p-3"
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
