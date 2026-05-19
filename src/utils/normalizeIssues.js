function mapSeverityToImportance(severity) {
  if (severity === "High") return "central";
  if (severity === "Medium") return "secondary";
  if (severity === "Low") return "peripheral";

  return "secondary";
}

function normalizeCriticalIssue(issue, index) {
  return {
    id: issue.id || `critical-issue-${index + 1}`,
    title: issue.title || "מחלוקת ללא כותרת",
    description: issue.analysis || issue.description || "",

    status: issue.severity === "High" ? "מרכזית" : "דורשת בחינה",
    importance: mapSeverityToImportance(issue.severity),

    partyPositions: {
      claimant: "",
      defendant: "",
      coreDispute: issue.title || "",
    },

    legalAssessment: {
      summary: issue.analysis || "",
      relevantLaw: issue.legalBasis || issue.relevantLaw || [],
    },

    linkedEvidence: issue.grounding || [],
    linkedWitnesses: issue.witnesses || [],
    missingInfo: issue.missingInfo || issue.gaps || [],

    actionItems: {
      clientQuestions: [],
      missingEvidence: issue.missingEvidence || [],
      suggestedActions: issue.suggestedActions || [],
    },
  };
}

export function normalizeIssues(analysis) {
  const rawIssues =
    analysis?.issues ||
    analysis?.caseTheory?.issues ||
    analysis?.caseTheory?.disputes ||
    analysis?.disputes ||
    analysis?.executiveView?.criticalIssues ||
    [];

  return rawIssues.map((issue, index) => {
    if (issue.severity || issue.analysis || issue.grounding) {
      return normalizeCriticalIssue(issue, index);
    }

    return {
      id: issue.id || `issue-${index + 1}`,
      title: issue.title || issue.name || "מחלוקת ללא כותרת",
      description: issue.description || issue.summary || "",

      status: issue.status || "דורש בחינה",
      importance: issue.importance || "secondary",

      partyPositions: {
        claimant:
          issue.partyPositions?.claimant ||
          issue.claimantPosition ||
          "",
        defendant:
          issue.partyPositions?.defendant ||
          issue.defendantPosition ||
          "",
        coreDispute:
          issue.partyPositions?.coreDispute ||
          issue.coreDispute ||
          "",
      },

      legalAssessment: {
        summary:
          issue.legalAssessment?.summary ||
          issue.legalAssessment ||
          "",
        relevantLaw:
          issue.legalAssessment?.relevantLaw ||
          issue.relevantLaw ||
          [],
      },

      linkedEvidence: issue.linkedEvidence || issue.evidence || [],
      linkedWitnesses: issue.linkedWitnesses || issue.witnesses || [],
      missingInfo: issue.missingInfo || issue.gaps || [],

      actionItems: {
        clientQuestions:
          issue.actionItems?.clientQuestions ||
          issue.clientQuestions ||
          [],
        missingEvidence:
          issue.actionItems?.missingEvidence ||
          issue.missingEvidence ||
          [],
        suggestedActions:
          issue.actionItems?.suggestedActions ||
          issue.suggestedActions ||
          [],
      },
    };
  });
}