import { useEffect, useState } from "react";

import IssueCard from "../components/issues/IssueCard";
import { normalizeIssues } from "../utils/normalizeIssues";
import {
  getIssueEvidenceOverlays,
  getIssueWorkItems,
  getIssueContradictionOverlays,
  getIssueAssessmentOverlays,
} from "../utils/applyOverlays";

export default function IssuesView({
  analysis,
  onWorkspaceUpdate,
  overlays = [],
  acceptedWorkItems = [],
  onRollbackOverlay,
  onRemoveWorkItem,
}) {
  const [issues, setIssues] = useState([]);
  const [importanceFilter, setImportanceFilter] = useState("all");
  const [showAllIssues, setShowAllIssues] = useState(false);

  useEffect(() => {
    if (!analysis) {
      setIssues([]);
      return;
    }

    const normalizedIssues = normalizeIssues(analysis);

    if (normalizedIssues.length > 0) {
      setIssues(normalizedIssues);
    } else {
      setIssues([]);
    }

    setShowAllIssues(false);
    setImportanceFilter("all");
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

  const visibleIssues = showAllIssues
    ? filteredIssues
    : filteredIssues.filter((issue, index) => {
        if (importanceFilter !== "all") {
          return index < 5;
        }

        const centralVisible =
          filteredIssues.filter(
            (item) =>
              item.importance === "central"
          );

        const secondaryVisible =
          filteredIssues.filter(
            (item) =>
              item.importance === "secondary"
          );

        const peripheralVisible =
          filteredIssues.filter(
            (item) =>
              item.importance === "peripheral"
          );

        return (
          centralVisible
            .slice(0, 3)
            .includes(issue) ||
          secondaryVisible
            .slice(0, 3)
            .includes(issue) ||
          peripheralVisible
            .slice(0, 2)
            .includes(issue)
        );
      });

  const hiddenCount =
    filteredIssues.length - visibleIssues.length;

  const caseKey =
    analysis?.executiveView?.caseSnapshot?.parties?.join(
      "-"
    ) || "case";

  return (
    <div
      id="evidence-gaps"
      className="space-y-4"
    >
      <div className="bg-white/90 border border-blue-100 rounded-2xl px-5 py-3 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">
              תמונת מחלוקות
            </h2>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setImportanceFilter(
                    "central"
                  );
                  setShowAllIssues(false);
                }}
                className={`
                  rounded-full px-2 py-1 transition
                  ${
                    importanceFilter ===
                    "central"
                      ? "bg-blue-900 text-white"
                      : "text-slate-600 hover:bg-blue-50"
                  }
                `}
              >
                מרכזיות: {centralIssues}
              </button>

              <button
                type="button"
                onClick={() => {
                  setImportanceFilter(
                    "secondary"
                  );
                  setShowAllIssues(false);
                }}
                className={`
                  rounded-full px-2 py-1 transition
                  ${
                    importanceFilter ===
                    "secondary"
                      ? "bg-blue-200 text-blue-900"
                      : "text-slate-600 hover:bg-blue-50"
                  }
                `}
              >
                משניות: {secondaryIssues}
              </button>

              <button
                type="button"
                onClick={() => {
                  setImportanceFilter(
                    "peripheral"
                  );
                  setShowAllIssues(false);
                }}
                className={`
                  rounded-full px-2 py-1 transition
                  ${
                    importanceFilter ===
                    "peripheral"
                      ? "bg-slate-300 text-slate-900"
                      : "text-slate-600 hover:bg-blue-50"
                  }
                `}
              >
                שוליות: {peripheralIssues}
              </button>

              {importanceFilter !==
                "all" && (
                <button
                  type="button"
                  onClick={() => {
                    setImportanceFilter(
                      "all"
                    );
                    setShowAllIssues(false);
                  }}
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

      {filteredIssues.length === 0 && (
        <div className="bg-white/90 border border-blue-100 rounded-2xl p-6 text-sm text-slate-600 shadow-sm">
          לאחר ניתוח התיק, יופיעו כאן
          המחלוקות המרכזיות שזוהו.
        </div>
      )}

      {visibleIssues.map(
        (issue, index) => (
          <IssueCard
            key={`${caseKey}-${issue.id}-${index}`}
            issue={issue}
            onUpdateIssue={handleUpdateIssue}
            onWorkspaceUpdate={onWorkspaceUpdate}
            evidenceOverlays={getIssueEvidenceOverlays(overlays, issue.id, issue.title)}
            workItemOverlays={getIssueWorkItems(acceptedWorkItems, issue.id, issue.title)}
            contradictionOverlays={getIssueContradictionOverlays(overlays, issue.id, issue.title)}
            assessmentOverlays={getIssueAssessmentOverlays(overlays, issue.id, issue.title)}
            onRollbackOverlay={onRollbackOverlay}
            onRemoveWorkItem={onRemoveWorkItem}
          />
        )
      )}

      {hiddenCount > 0 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() =>
              setShowAllIssues(true)
            }
            className="
              rounded-xl border border-slate-200 bg-white
              px-5 py-2 text-sm font-bold text-slate-700
              shadow-sm hover:bg-slate-50
            "
          >
            הצג עוד {hiddenCount} מחלוקות
          </button>
        </div>
      )}

      {showAllIssues &&
        filteredIssues.length >
          visibleIssues.length && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() =>
                setShowAllIssues(false)
              }
              className="text-sm text-slate-500 hover:text-slate-900"
            >
              צמצם תצוגה
            </button>
          </div>
        )}
    </div>
  );
}