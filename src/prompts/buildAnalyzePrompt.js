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

המטרה:
לבנות Litigation Cockpit חד, פרקטי וליטיגטורי.
לא חוות דעת אקדמית.
לא סיכום מסמכים.
המיקוד הוא pressure points, חולשות ראייתיות, זירות מחלוקת וסיכוני ליטיגציה.

כללי עבודה:
- כתוב בעברית משפטית חדה וקצרה.
- אל תכתוב טקסט גנרי.
- אל תלמד את הדין באופן כללי.
- בצע screening שקט של עילות וסעדים; הצג רק מה שיש לו אחיזה עובדתית.
- הפעל heuristics רק כאשר יש להן בסיס בעובדות או במסמכים.
- התמקד במשמעות הליטיגטורית של העובדות, לא רק בתיאור שלהן.
- כאשר מסמך מחליש טענה מרכזית — כתוב זאת באופן פוזיטיבי וברור.
- כאשר קיים פער בין הנרטיב לבין ההתנהגות בזמן אמת — הדגש זאת כחולשה ראייתית.
- כאשר חסר תיעוד שהיה צפוי להתקיים — הסבר מדוע החוסר משמעותי.
- אל תסתפק ב"יש לבדוק" אם ניתן להסיק inference סביר מתוך החומר.
- העדף reasoning ליטיגטורי על פני שלמות דוקטרינרית.
- אל תנסה להיות "מאוזן" באופן מלאכותי.
- אל תמציא ציטוטים, סעיפים או פסקי דין שלא הופיעו בקלט או במאגר הידע.
- רמות סיכון: High / Medium / Low בלבד.

מגבלות פלט:
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
