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

  const hiddenIssueIds = new Set(
    overlays.filter(o => o.type === "issue_hidden").map(o => o.patch.issueId)
  );

  const aiIssues = normalizeIssues(analysis);
  const allIssues = [...aiIssues, ...userIssues].filter(i => !hiddenIssueIds.has(i.id));

  const issues = allIssues.map((issue) => {
    // Apply all issue_updated overlays in order; each patches only the fields it contains.
    const issueEditOverlays = overlays.filter(
      (o) => o.type === "issue_updated" && o.patch.issueId === issue.id
    );
    const baseIssue = issueEditOverlays.reduce((acc, o) => ({
      ...acc,
      ...(o.patch.title !== undefined ? { title: o.patch.title } : {}),
      ...(o.patch.description !== undefined ? { description: o.patch.description } : {}),
      ...(o.patch.importance !== undefined ? { importance: o.patch.importance } : {}),
      ...(o.patch.partyPositions
        ? { partyPositions: { ...acc.partyPositions, ...o.patch.partyPositions } }
        : {}),
    }), issue);

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

    const answeredQuestions = new Set(
      overlays
        .filter((o) => o.type === "question_answered" && o.patch.issueId === baseIssue.id)
        .map((o) => o.patch.questionText)
    );

    return {
      ...baseIssue,
      effectiveLegal,
      updatedLegalFields,
      answeredQuestions,
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
