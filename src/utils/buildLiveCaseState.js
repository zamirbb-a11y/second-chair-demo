import { normalizeIssues } from "./normalizeIssues";
import {
  getIssueEvidenceOverlays,
  getIssueWorkItems,
  getIssueContradictionOverlays,
  getIssueAssessmentOverlays,
} from "./applyOverlays";

/**
 * Derives the current renderable case state from immutable inputs.
 * Does not mutate analysis, overlays, userIssues, or acceptedWorkItems.
 * Returns null when no analysis is present.
 *
 * Shape:
 *   { issues, successAssessment, meta }
 *
 * Each issue carries:
 *   effectiveLegal    — legalAssessment with accepted assessment overlays applied
 *   updatedLegalFields — string[] of fields that differ from the original
 *   overlays          — per-type overlay arrays pre-grouped for rendering
 */
export function buildLiveCaseState({
  analysis,
  overlays = [],
  userIssues = [],
  acceptedWorkItems = [],
}) {
  if (!analysis) return null;

  const aiIssues = normalizeIssues(analysis);
  const allIssues = [...aiIssues, ...userIssues];

  const issues = allIssues.map((issue) => {
    // Apply latest issue_updated overlay (user edits). Latest wins.
    const issueEditOverlays = overlays.filter(
      (o) => o.type === "issue_updated" && o.patch.issueId === issue.id
    );
    const latestEdit = issueEditOverlays.at(-1);
    const baseIssue = latestEdit
      ? {
          ...issue,
          title: latestEdit.patch.title ?? issue.title,
          description: latestEdit.patch.description ?? issue.description,
          importance: latestEdit.patch.importance ?? issue.importance,
        }
      : issue;

    const assessmentOverlays = getIssueAssessmentOverlays(overlays, baseIssue.id, baseIssue.title);
    const evidenceOverlays = getIssueEvidenceOverlays(overlays, baseIssue.id, baseIssue.title);
    const contradictionOverlays = getIssueContradictionOverlays(overlays, baseIssue.id, baseIssue.title);
    const workItems = getIssueWorkItems(acceptedWorkItems, baseIssue.id, baseIssue.title);

    const effectiveLegal = { ...baseIssue.legalAssessment };
    const updatedLegalFields = [];

    for (const o of assessmentOverlays) {
      if (o.patch.field === "legalAssessment.summary" && o.patch.newValue != null) {
        effectiveLegal.summary = o.patch.newValue;
        if (!updatedLegalFields.includes("summary")) updatedLegalFields.push("summary");
      }
      if (o.patch.field === "legalAssessment.strength" && o.patch.newValue != null) {
        effectiveLegal.strength = o.patch.newValue;
        if (!updatedLegalFields.includes("strength")) updatedLegalFields.push("strength");
      }
    }

    return {
      ...baseIssue,
      effectiveLegal,
      updatedLegalFields,
      overlays: {
        evidence: evidenceOverlays,
        contradictions: contradictionOverlays,
        workItems,
        assessmentChanges: assessmentOverlays,
      },
    };
  });

  const rawAssessment = analysis?.executiveView?.successAssessment ?? null;
  const caseAssessmentOverlays = overlays.filter((o) => o.type === "case_assessment");
  const latestCaseOverlay = caseAssessmentOverlays.at(-1) ?? null;

  const successAssessment = rawAssessment
    ? {
        ...rawAssessment,
        level: latestCaseOverlay?.patch.newLevel ?? rawAssessment.level,
        summary: latestCaseOverlay?.patch.newSummary || rawAssessment.summary,
        _overlay: latestCaseOverlay,
      }
    : null;

  return {
    issues,
    successAssessment,
    meta: {
      issueCount: issues.length,
      aiIssueCount: aiIssues.length,
      userIssueCount: userIssues.length,
    },
  };
}
