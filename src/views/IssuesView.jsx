import { useEffect, useState } from "react";

import IssueCard from "../components/issues/IssueCard";
import { mockCaseData } from "../mock/mockCaseData";
import { normalizeIssues } from "../utils/normalizeIssues";

export default function IssuesView({ analysis, onWorkspaceUpdate }) {
  const [issues, setIssues] = useState(() =>
    normalizeIssues(mockCaseData)
  );
  const [importanceFilter, setImportanceFilter] =
  useState("all");

  useEffect(() => {
    if (!analysis) {
      setIssues(normalizeIssues(mockCaseData));
      return;
    }

    const normalizedIssues = normalizeIssues(analysis);

    if (normalizedIssues.length > 0) {
      setIssues(normalizedIssues);
    }
  }, [analysis]);

  function handleUpdateIssue(updatedIssue) {
    setIssues((prevIssues) =>
      prevIssues.map((issue) =>
        issue.id === updatedIssue.id ? updatedIssue : issue
      )
    );
  }

  const centralIssues = issues.filter(
    (issue) => issue.importance === "central"
  ).length;

  const secondaryIssues = issues.filter(
    (issue) => issue.importance === "secondary"
  ).length;

  const peripheralIssues = issues.filter(
    (issue) => issue.importance === "peripheral"
  ).length;
  const filteredIssues =
  importanceFilter === "all"
    ? issues
    : issues.filter(
        (issue) =>
          issue.importance === importanceFilter
      );

  return (
    <div className="space-y-4">
   <div className="bg-white/90 border border-blue-100 rounded-2xl px-5 py-3 shadow-sm">
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
    <div className="flex items-center gap-3">
      <h2 className="text-lg font-bold text-slate-900">
        תמונת מחלוקות
      </h2>

   <div className="flex items-center gap-2 text-xs">
  <button
    type="button"
    onClick={() => setImportanceFilter("central")}
    className={`
      rounded-full px-2 py-1 transition
      ${
        importanceFilter === "central"
          ? "bg-blue-900 text-white"
          : "text-slate-600 hover:bg-blue-50"
      }
    `}
  >
    מרכזיות: {centralIssues}
  </button>

  <button
    type="button"
    onClick={() => setImportanceFilter("secondary")}
    className={`
      rounded-full px-2 py-1 transition
      ${
        importanceFilter === "secondary"
          ? "bg-blue-200 text-blue-900"
          : "text-slate-600 hover:bg-blue-50"
      }
    `}
  >
    משניות: {secondaryIssues}
  </button>

  <button
    type="button"
    onClick={() => setImportanceFilter("peripheral")}
    className={`
      rounded-full px-2 py-1 transition
      ${
        importanceFilter === "peripheral"
          ? "bg-slate-300 text-slate-900"
          : "text-slate-600 hover:bg-blue-50"
      }
    `}
  >
    שוליות: {peripheralIssues}
  </button>

  {importanceFilter !== "all" && (
    <button
      type="button"
      onClick={() => setImportanceFilter("all")}
      className="
        text-slate-500 hover:text-slate-900
        px-2 py-1
      "
    >
      נקה סינון
    </button>
  )}
</div>
    </div>

    <button
      type="button"
      className="
        rounded-xl bg-slate-900
        px-4 py-2 text-sm font-bold text-white
        hover:bg-slate-800
      "
    >
      הוסף מחלוקת
    </button>
  </div>
</div>

{filteredIssues.map((issue) => (
<IssueCard
  key={issue.id}
  issue={issue}
  onUpdateIssue={handleUpdateIssue}
  onWorkspaceUpdate={onWorkspaceUpdate}
/>
      ))}
    </div>
  );
}

function SummaryBox({ title, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-bold text-slate-500">
        {title}
      </div>

      <div className="text-2xl font-bold text-slate-900 mt-1">
        {value}
      </div>
    </div>
  );
}