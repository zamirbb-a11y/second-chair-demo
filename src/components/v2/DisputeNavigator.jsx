import { useState } from "react";

// Derive one-line signal from issue data
function getSignal(issue) {
  const contradiction = issue.overlays?.contradictions?.[0];
  if (contradiction?.description) return contradiction.description.slice(0, 80);

  const summary = issue.effectiveLegal?.summary;
  if (summary) {
    const sentence = summary.split(/[.!?]/)[0]?.trim();
    if (sentence && sentence.length > 8) return sentence.slice(0, 80);
  }

  return issue.description?.slice(0, 80) ?? null;
}

// Check whether latestDelta has items affecting this issue
function hasPending(issue, delta) {
  if (!delta) return false;
  const id = issue.id;
  const title = issue.title;
  return (
    delta.changedAssessments?.some(
      (a) => a.issueId === id || a.issueTitle === title
    ) ||
    delta.evidenceUpdates?.some(
      (e) => e.relatedIssueId === id || e.relatedIssueTitle === title
    ) ||
    delta.contradictions?.some(
      (c) => c.relatedIssueId === id || c.relatedIssueTitle === title
    ) ||
    delta.generatedWorkItems?.some(
      (w) => w.relatedIssueId === id || w.relatedIssueTitle === title
    )
  );
}

function IssueNavItem({ issue, selected, onSelect, delta }) {
  const pending = hasPending(issue, delta);
  const signal = getSignal(issue);

  return (
    <div
      onClick={() => onSelect(issue.id)}
      className={[
        "px-4 py-2.5 cursor-pointer border-r-[3px] transition-all",
        selected
          ? "bg-blue-50 border-blue-500"
          : "border-transparent hover:bg-slate-50",
      ].join(" ")}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span
          className={[
            "w-[6px] h-[6px] rounded-full flex-shrink-0",
            issue.importance === "central"
              ? "bg-blue-800"
              : issue.importance === "secondary"
              ? "bg-slate-400"
              : "bg-slate-300",
          ].join(" ")}
        />
        <span
          className={[
            "text-[12.5px] font-semibold truncate flex-1 leading-snug",
            selected ? "text-blue-700" : "text-slate-800",
          ].join(" ")}
        >
          {issue.title}
        </span>
        {pending && (
          <span className="w-[7px] h-[7px] rounded-full bg-amber-400 flex-shrink-0" />
        )}
      </div>
      {signal && (
        <p
          className={[
            "text-[11px] leading-[1.4] pr-[13px]",
            pending ? "text-amber-700" : "text-slate-400",
          ].join(" ")}
        >
          {signal.length > 76 ? signal.slice(0, 76) + "…" : signal}
        </p>
      )}
    </div>
  );
}

function Group({ label, issues, selectedIssueId, onSelectIssue, latestDelta }) {
  if (!issues.length) return null;
  return (
    <>
      <div className="px-4 pt-2.5 pb-1 text-[9.5px] font-bold text-slate-400 tracking-[0.07em] uppercase">
        {label}
      </div>
      {issues.map((issue) => (
        <IssueNavItem
          key={issue.id}
          issue={issue}
          selected={selectedIssueId === issue.id}
          onSelect={onSelectIssue}
          delta={latestDelta}
        />
      ))}
    </>
  );
}

export default function DisputeNavigator({
  issues = [],
  selectedIssueId,
  onSelectIssue,
  latestDelta,
  onAddUserIssue,
  caseName,
}) {
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formImportance, setFormImportance] = useState("secondary");

  const central    = issues.filter((i) => i.importance === "central");
  const secondary  = issues.filter((i) => i.importance === "secondary");
  const peripheral = issues.filter((i) => i.importance === "peripheral");

  function handleAdd() {
    if (!formTitle.trim()) return;
    onAddUserIssue?.({ title: formTitle.trim(), description: "", importance: formImportance });
    setFormTitle("");
    setFormImportance("secondary");
    setShowForm(false);
  }

  return (
    <div className="w-[280px] bg-white border-l border-slate-200 flex flex-col flex-shrink-0 h-full">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 flex-shrink-0">
        {caseName && (
          <div className="text-[11px] text-slate-400 mb-0.5 truncate">{caseName}</div>
        )}
        <div className="text-[13px] font-bold text-slate-900">מחלוקות</div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        {/* Overview */}
        <div
          onClick={() => onSelectIssue(null)}
          className={[
            "flex items-center gap-2 px-4 py-2.5 cursor-pointer border-r-[3px] transition-all text-[12.5px] font-semibold",
            selectedIssueId === null
              ? "bg-blue-50 border-blue-500 text-blue-700"
              : "border-transparent text-slate-500 hover:bg-slate-50",
          ].join(" ")}
        >
          <span className="text-slate-300 text-[13px]">◈</span>
          מבט כללי
        </div>

        <div className="h-px bg-slate-100 mx-2 my-1" />

        <Group
          label="מרכזיות"
          issues={central}
          selectedIssueId={selectedIssueId}
          onSelectIssue={onSelectIssue}
          latestDelta={latestDelta}
        />

        {central.length > 0 && secondary.length > 0 && (
          <div className="h-px bg-slate-100 mx-2 my-1" />
        )}

        <Group
          label="משניות"
          issues={secondary}
          selectedIssueId={selectedIssueId}
          onSelectIssue={onSelectIssue}
          latestDelta={latestDelta}
        />

        {(central.length > 0 || secondary.length > 0) && peripheral.length > 0 && (
          <div className="h-px bg-slate-100 mx-2 my-1" />
        )}

        <Group
          label="שוליות"
          issues={peripheral}
          selectedIssueId={selectedIssueId}
          onSelectIssue={onSelectIssue}
          latestDelta={latestDelta}
        />
      </div>

      {/* Add issue */}
      <div className="p-3 border-t border-slate-100 flex-shrink-0">
        {showForm ? (
          <div className="space-y-2">
            <input
              autoFocus
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setShowForm(false); }}
              placeholder="כותרת המחלוקת"
              className="w-full text-[12px] border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400"
            />
            <select
              value={formImportance}
              onChange={(e) => setFormImportance(e.target.value)}
              className="w-full text-[12px] border border-slate-300 rounded-lg px-2 py-1.5 bg-white outline-none"
            >
              <option value="central">מרכזית</option>
              <option value="secondary">משנית</option>
              <option value="peripheral">שולית</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!formTitle.trim()}
                className="flex-1 py-1.5 bg-slate-900 text-white rounded-lg text-[11.5px] font-bold disabled:opacity-40 cursor-pointer border-0"
              >
                הוסף
              </button>
              <button
                onClick={() => { setShowForm(false); setFormTitle(""); }}
                className="flex-1 py-1.5 border border-slate-200 rounded-lg text-[11.5px] text-slate-500 cursor-pointer bg-white"
              >
                ביטול
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-[7px] border-[1.5px] border-dashed border-slate-300 rounded-[9px] text-[11.5px] text-slate-400 hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all bg-transparent cursor-pointer"
          >
            + הוסף מחלוקת
          </button>
        )}
      </div>
    </div>
  );
}
