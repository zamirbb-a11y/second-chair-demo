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

function IssueNavItem({ issue, selected, onSelect, onRemove, delta }) {
  const [confirming, setConfirming] = useState(false);
  const pending = hasPending(issue, delta);
  const signal = getSignal(issue);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={selected || undefined}
      className={[
        "group relative px-4 py-2.5 cursor-pointer border-r-[3px] transition-all",
        selected
          ? "bg-blue-50 border-blue-500"
          : "border-transparent hover:bg-slate-50",
      ].join(" ")}
      onClick={() => { if (!confirming) onSelect(issue.id); }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !confirming && e.target === e.currentTarget) {
          e.preventDefault();
          onSelect(issue.id);
        }
      }}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span
          aria-hidden="true"
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
            "text-sm font-semibold flex-1 leading-snug",
            selected ? "text-blue-700" : "text-slate-800",
          ].join(" ")}
        >
          {issue.title}
        </span>
        {pending && !confirming && (
          <span className="w-[7px] h-[7px] rounded-full bg-amber-400 flex-shrink-0">
            <span className="sr-only">עדכונים ממתינים לאישור</span>
          </span>
        )}
        {!confirming && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
            title="מחק מחלוקת"
            aria-label={`מחק מחלוקת: ${issue.title}`}
            className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity text-slate-500 hover:text-red-400 text-sm leading-none ml-1 flex-shrink-0"
          >
            ×
          </button>
        )}
      </div>

      {confirming && (
        <div
          className="mt-1.5 flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-xs text-slate-500 flex-1">למחוק מחלוקת?</span>
          <button
            type="button"
            onClick={() => { onRemove?.(issue.id, issue.title); setConfirming(false); }}
            className="px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-md border-0 cursor-pointer hover:bg-red-600"
          >
            מחק
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="px-2.5 py-1 bg-white text-slate-500 text-xs border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50"
          >
            ביטול
          </button>
        </div>
      )}

      {signal && !confirming && (
        <p
          className={[
            "text-xs leading-[1.4] pr-[13px]",
            pending ? "text-amber-700" : "text-slate-500",
          ].join(" ")}
        >
          {signal.length > 76 ? signal.slice(0, 76) + "…" : signal}
        </p>
      )}
    </div>
  );
}

function Group({ label, issues, selectedIssueId, onSelectIssue, onRemoveIssue, latestDelta }) {
  if (!issues.length) return null;
  return (
    <>
      <div className="px-4 pt-2.5 pb-1 text-xs font-semibold text-slate-500">
        {label}
      </div>
      {issues.map((issue) => (
        <IssueNavItem
          key={issue.id}
          issue={issue}
          selected={selectedIssueId === issue.id}
          onSelect={onSelectIssue}
          onRemove={onRemoveIssue}
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
  onRemoveIssue,
  latestDelta,
  onAddUserIssue,
  onUploadFile,
  caseName,
}) {
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formImportance, setFormImportance] = useState("secondary");
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const [uploading, setUploading] = useState(false);

  const central    = issues.filter((i) => i.importance === "central");
  const secondary  = issues.filter((i) => i.importance === "secondary");
  const peripheral = issues.filter((i) => i.importance === "peripheral");
  const pendingCount = latestDelta
    ? issues.filter((i) => hasPending(i, latestDelta)).length
    : 0;

  async function handleFileChange(e) {
    if (!e.target.files?.length || !onUploadFile) return;
    setUploading(true);
    setUploadedFileName(e.target.files[0].name);
    await onUploadFile(e);
    setUploading(false);
  }

  function handleAdd() {
    if (!formTitle.trim()) return;
    onAddUserIssue?.({ title: formTitle.trim(), description: formDescription.trim(), importance: formImportance });
    setFormTitle("");
    setFormDescription("");
    setFormImportance("secondary");
    setUploadedFileName(null);
    setShowForm(false);
  }

  return (
    <div className="w-[320px] bg-[#f8f9fb] border-l border-slate-200 flex flex-col flex-shrink-0 h-full">
      {/* Header — h-12 matches the top bar height */}
      <div className="px-4 h-12 border-b border-slate-100 flex-shrink-0 flex items-center">
        <div className="text-sm font-bold text-slate-900">מחלוקות</div>
        <span aria-live="polite" className="sr-only">
          {pendingCount > 0
            ? `עדכונים ממתינים לאישור ב-${pendingCount} מחלוקות`
            : ""}
        </span>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        {/* Overview */}
        <button
          type="button"
          onClick={() => onSelectIssue(null)}
          aria-current={selectedIssueId === null || undefined}
          className={[
            "w-full text-right flex items-center gap-2 px-4 py-2.5 cursor-pointer border-r-[3px] transition-all text-sm font-semibold",
            selectedIssueId === null
              ? "bg-blue-50 border-blue-500 text-blue-700"
              : "border-transparent text-slate-500 hover:bg-slate-50",
          ].join(" ")}
        >
          <span aria-hidden="true" className="text-slate-300 text-[13px]">◈</span>
          מבט כללי
        </button>

        <div className="h-px bg-slate-100 mx-2 my-1" />

        <Group
          label="מרכזיות"
          issues={central}
          selectedIssueId={selectedIssueId}
          onSelectIssue={onSelectIssue}
          onRemoveIssue={onRemoveIssue}
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
          onRemoveIssue={onRemoveIssue}
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
          onRemoveIssue={onRemoveIssue}
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
              onKeyDown={(e) => { if (e.key === "Escape") setShowForm(false); }}
              placeholder="כותרת המחלוקת"
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400"
            />
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="פרט את המחלוקת (אופציונלי)…"
              rows={3}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400 resize-none leading-relaxed"
            />
            <select
              value={formImportance}
              onChange={(e) => setFormImportance(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white outline-none"
            >
              <option value="central">מרכזית</option>
              <option value="secondary">משנית</option>
              <option value="peripheral">שולית</option>
            </select>
            {onUploadFile && (
              <label className={[
                "flex items-center gap-2 px-3 py-1.5 border rounded-lg cursor-pointer transition-colors text-xs",
                uploading
                  ? "border-slate-200 bg-slate-50 text-slate-400"
                  : uploadedFileName
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-600",
              ].join(" ")}>
                <span>{uploading ? "מעלה…" : uploadedFileName ? `✓ ${uploadedFileName}` : "+ צרף קובץ"}</span>
                <input
                  type="file"
                  accept=".docx,.txt,.pdf"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleFileChange}
                />
              </label>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!formTitle.trim() || uploading}
                className="flex-1 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer border-0"
              >
                הוסף
              </button>
              <button
                onClick={() => { setShowForm(false); setFormTitle(""); setFormDescription(""); setUploadedFileName(null); }}
                className="flex-1 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-500 cursor-pointer bg-white"
              >
                ביטול
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-[7px] border-[1.5px] border-dashed border-slate-300 rounded-[9px] text-xs text-slate-500 hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all bg-transparent cursor-pointer"
          >
            + הוסף מחלוקת
          </button>
        )}
      </div>
    </div>
  );
}
