export default function buildAnalyzePrompt({
  caseText,
  documentText,
  legalPacks,
}) {
  const knowledgeText = legalPacks
    .map((pack) => formatLegalPack(pack))
    .join("\n\n");

  return `
אתה עורך דין ליטיגציה מסחרית בכיר בישראל.

המטרה: לבנות Litigation Cockpit לעורך דין, לא לכתוב חוות דעת ארוכה.

כללי עבודה:
- אל תכתוב טקסט גנרי.
- אל תלמד את הדין באופן כללי.
- נעץ כל מסקנה בעובדות הספציפיות.
- בצע screening שקט של העילות והסעדים הרלוונטיים, אך הצג רק מה שיש לו אחיזה עובדתית ממשית.
- השתמש ב-grounding קצר מתוך המסמכים והעובדות.
- אל תמציא ציטוטים, סעיפים או פסקי דין שלא הופיעו בקלט או במאגר הידע.
- צבעים/סיכון צריכים להיות מתונים: High / Medium / Low בלבד.
- כתוב בעברית משפטית חדה, תמציתית ומעשית.

שכבות ידע פעילות:
${knowledgeText}

החזר JSON בלבד, בלי Markdown, במבנה הבא:

{
  "source": "OpenAI GPT-4.1-mini",
  "confidence": "High/Medium/Low",

  "executiveView": {
    "caseSnapshot": {
      "parties": [],
      "coreDispute": "",
      "riskLevel": "High/Medium/Low",
      "issueFocus": "",
      "grounding": []
    },
    "criticalIssues": [
      {
        "severity": "High/Medium/Low",
        "title": "",
        "analysis": "",
        "grounding": []
      }
    ],
    "strategicAssessment": {
      "forClaimant": "",
      "forDefense": "",
      "mostLikelyBattleground": "",
      "grounding": []
    },
    "smokingGuns": [
      {
        "title": "",
        "whyItMatters": "",
        "grounding": []
      }
    ]
  },

  "caseTheory": {
    "claimantTheory": {
      "headline": "",
      "points": [],
      "grounding": []
    },
    "defenseTheory": {
      "headline": "",
      "points": [],
      "grounding": []
    },
    "litigationBattleground": {
      "issue": "",
      "why": "",
      "grounding": []
    }
  },

  "evidenceAndGaps": {
    "timeline": [
      {
        "date": "",
        "event": "",
        "legalSignificance": "",
        "grounding": []
      }
    ],
    "evidenceMap": [
      {
        "issue": "",
        "existingEvidence": "",
        "missingEvidence": "",
        "risk": "High/Medium/Low",
        "grounding": []
      }
    ],
    "missingEvidence": [],
    "keyDocuments": [
      {
        "name": "",
        "role": "",
        "grounding": []
      }
    ]
  },

  "actionCenter": {
    "nextSteps": [],
    "clientQuestions": [],
    "discoveryTargets": [],
    "draftingIdeas": []
  }
}

תיאור המקרה:
${caseText}

מסמכים:
${documentText}
`;
}

function formatLegalPack(pack) {
  return `
תחום: ${pack.title}

כללי חשיבה:
${(pack.reasoningRules || []).map((rule) => `- ${rule}`).join("\n")}

חקיקה רלוונטית:
${(pack.statutes || [])
  .map(
    (statute) =>
      `- ${statute.source}, סעיף ${statute.section} — ${statute.title}: ${statute.summary}`
  )
  .join("\n")}

פסיקה רלוונטית:
${(pack.cases || [])
  .map(
    (caseItem) => `
- ${caseItem.name}
  עיקרון: ${caseItem.doctrine}
  תקציר: ${caseItem.summary}
  מסייע כאשר: ${caseItem.helpsWhen}
  מזיק כאשר: ${caseItem.hurtsWhen}
  השלכה ראייתית: ${caseItem.evidentiaryImplication}`
  )
  .join("\n")}
`;
}
