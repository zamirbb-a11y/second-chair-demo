function fallbackAnalysis(errorMessage = "Analysis failed") {
  return {
    source: "Fallback",
    confidence: "Low",

    executiveView: {
      caseSnapshot: {
        parties: [],
        coreDispute: "הניתוח נכשל טכנית. יש לבדוק את הלוג.",
        riskLevel: "Low",
        issueFocus: errorMessage,
        grounding: [],
      },
      criticalIssues: [],
      strategicAssessment: {
        forClaimant: "",
        forDefense: "",
        mostLikelyBattleground: "",
        grounding: [],
      },
      smokingGuns: [],
    },

    caseTheory: {
      claimantTheory: {
        headline: "",
        points: [],
        grounding: [],
      },
      defenseTheory: {
        headline: "",
        points: [],
        grounding: [],
      },
      litigationBattleground: {
        issue: "",
        why: "",
        grounding: [],
      },
    },

    evidenceAndGaps: {
      timeline: [],
      evidenceMap: [],
      missingEvidence: [],
      keyDocuments: [],
    },

    actionCenter: {
      nextSteps: [],
      clientQuestions: [],
      discoveryTargets: [],
      draftingIdeas: [],
    },
  };
}
