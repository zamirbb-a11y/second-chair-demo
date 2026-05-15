export default function buildAnalyzePrompt({
  caseText,
  documentText,
  legalPacks,
}) {
  const MAX_DOCUMENT_CHARS = 22000;
  const MAX_CASE_CHARS = 6000;

  function limitText(text, maxChars) {
    if (!text) return "";

    if (text.length <= maxChars) {
      return text;
    }

    return (
      text.slice(0, maxChars) +
      "\n\n[הטקסט קוצר לצורך ניתוח הדמו. ייתכן שחלק מהמסמכים לא נכללו בניתוח.]"
    );
  }

  const safeCaseText = limitText(caseText, MAX_CASE_CHARS);
  const safeDocumentText = limitText(documentText, MAX_DOCUMENT_CHARS);

  const knowledgeText = legalPacks
    .map((pack) => formatLegalPack(pack))
    .join("\n\n");

  return `
אתה עורך דין ליטיגציה מסחרית בכיר בישראל.

המטרה: לבנות Litigation Cockpit תמציתי ומעשי לעורך דין, לא חוות דעת.

כללי עבודה:
- כתוב בעברית משפטית חדה וקצרה.
- אל תכתוב טקסט גנרי ואל תלמד את הדין.
- בצע screening שקט של עילות וסעדים; הצג רק מה שיש לו אחיזה עובדתית.
- הפעל heuristics רק כשיש בסיס בעובדות או במסמכים.
- נעץ כל מסקנה בעובדות ובמסמכים.
- אל תמציא ציטוטים, סעיפים או פסקי דין שלא הופיעו בקלט או במאגר הידע.
- רמות סיכון: High / Medium / Low בלבד.
- הגבל פלט:
  - עד 3 סוגיות מרכזיות
  - עד 6 אירועי timeline
  - עד 6 שורות evidence map
  - עד 5 פריטים בכל רשימת פעולה

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
${safeCaseText}

מסמכים:
${safeDocumentText}
`;
}

function formatLegalPack(pack) {
  return `
תחום: ${pack.title}

כללי חשיבה:
${(pack.reasoningRules || [])
  .map((rule) => `- ${rule}`)
  .join("\n")}

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
      `- ${c.name}: ${c.doctrine}. מסייע: ${c.helpsWhen} מזיק: ${c.hurtsWhen}`
  )
  .join("\n")}

יוריסטיקות:
${(pack.heuristics || [])
  .map(
    (h) =>
      `- ${h.hebrewTitle}: ${h.pattern} שימוש: ${h.litigationUse}`
  )
  .join("\n")}
`;
}
