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
    const assessmentOverlays = getIssueAssessmentOverlays(overlays, issue.id, issue.title);
    const evidenceOverlays = getIssueEvidenceOverlays(overlays, issue.id, issue.title);
    const contradictionOverlays = getIssueContradictionOverlays(overlays, issue.id, issue.title);
    const workItems = getIssueWorkItems(acceptedWorkItems, issue.id, issue.title);

    const effectiveLegal = { ...issue.legalAssessment };
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
      ...issue,
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
