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

המטרה: להחזיר Litigation Cockpit תמציתי, מעשי ומבוסס עובדות — לא חוות דעת.

כללי עבודה:
- כתוב בעברית משפטית חדה וקצרה.
- אל תכתוב טקסט גנרי ואל תלמד את הדין.
- בצע screening שקט של עילות וסעדים; הצג רק מה שיש לו אחיזה עובדתית.
- נתח: פגם בכריתה → ביטול/ביטול חלקי → השבה/הפרדה.
- נעץ כל מסקנה בעובדות ובמסמכים.
- אל תמציא סעיפים, פסקי דין או ציטוטים.
- השתמש רק במאגר הידע שלהלן ובקלט.
- רמות סיכון: High / Medium / Low בלבד.
- הגבל פלט: עד 3 סוגיות מרכזיות, עד 6 אירועי timeline, עד 6 שורות evidence map, עד 5 פריטים בכל רשימת פעולה.

שכבות ידע פעילות:
${knowledgeText}

החזר JSON בלבד, בלי Markdown, בדיוק במבנה הבא:

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
    "smokingGuns": []
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
    "keyDocuments": []
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

חקיקה:
${(pack.statutes || [])
  .map(
    (s) =>
      `- ${s.source} ${s.section}: ${s.title} — ${s.summary}`
  )
  .join("\n")}

פסיקה:
${(pack.cases || [])
  .map(
    (c) =>
      `- ${c.name}: ${c.doctrine}. מסייע: ${c.helpsWhen} מזיק: ${c.hurtsWhen} ראייתית: ${c.evidentiaryImplication}`
  )
  .join("\n")}
`;
}
