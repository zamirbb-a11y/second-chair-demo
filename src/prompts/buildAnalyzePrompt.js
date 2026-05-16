export default function buildAnalyzePrompt({
  caseText,
  documentText,
  files = [],
  legalPacks,
}) {
  const MAX_DOCUMENT_CHARS = 22000;
  const MAX_CASE_CHARS = 6000;
  const MAX_FILE_CHARS = 7000;
  const MAX_TOTAL_FILES_CHARS = 26000;

  function limitText(text, maxChars) {
    if (!text) return "";

    if (text.length <= maxChars) {
      return text;
    }

    return (
      text.slice(0, maxChars) +
      "\n\n[הטקסט קוצר לצורך ניתוח הדמו. ייתכן שחלק מהמסמך לא נכלל בניתוח.]"
    );
  }

  function formatFileForPrompt(file, index) {
    const name = file?.name || `מסמך ${index + 1}`;
    const type = file?.type || "unknown";
    const status = file?.status || "unknown";
    const text = limitText(file?.text || "", MAX_FILE_CHARS);

    return `
[מסמך ${index + 1}]
שם: ${name}
סוג: ${type}
סטטוס עיבוד: ${status}

תוכן:
${text || "[לא חולץ טקסט מהמסמך]"}
`;
  }

  function buildFilesText() {
    const processedFiles = (files || []).filter((file) =>
      file?.text?.trim()
    );

    if (!processedFiles.length) {
      return limitText(documentText, MAX_DOCUMENT_CHARS);
    }

    const formatted = processedFiles
      .map((file, index) => formatFileForPrompt(file, index))
      .join("\n\n---\n\n");

    return limitText(formatted, MAX_TOTAL_FILES_CHARS);
  }

  const safeCaseText = limitText(caseText, MAX_CASE_CHARS);
  const safeDocumentsText = buildFilesText();

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
- הבחין בין inference סביר לבין עובדה מוכחת.
- כאשר המסקנה נסמכת על inference, נסח זאת בזהירות יחסית:
  "תומך בטענה", "מחזק", "מלמד", "עשוי להעיד".
- תן משקל גבוה במיוחד למסמכים ולהתנהגות בזמן אמת.
- תן משקל נמוך יותר לטענות מאוחרות, מכתבי דרישה ונרטיבים שנוצרו לאחר הסכסוך.
- אל תמציא ציטוטים, סעיפים או פסקי דין שלא הופיעו בקלט או במאגר הידע.
- רמות סיכון: High / Medium / Low בלבד.

הוראות מיוחדות לעבודה עם מסמכים:
- התייחס לכל מסמך כיחידת ראיה נפרדת.
- כאשר אתה מסתמך על מסמך, ציין ב-grounding את שם המסמך או מספר המסמך.
- אם יש סתירה בין מסמכים, הצג אותה במפורש.
- אם מסמך מסוים חזק במיוחד או חלש במיוחד, כתוב זאת.
- אם חסר המשך לשרשור, נספח, גרסה קודמת, טיוטה, אישור, פרוטוקול או תכתובת — ציין זאת.
- אל תכתוב grounding כללי כמו "מסמכים"; כתוב למשל: "SPA.pdf", "Email chain 12.3.23.eml", או "מסמך 2".
- אם מסמך מופיע ברשימה אך לא חולץ ממנו טקסט, אל תסתמך עליו עובדתית.

הוראות מיוחדות למסמכים חסרים:
- אל תכתוב רק קטגוריות כלליות כמו "מסמכי DD", "התכתבויות" או "מסמכים פנימיים".
- כאשר אתה מזהה מסמך חסר, נסה לנקוב במסמך הספציפי ככל האפשר.
- הסבר למה סביר שהמסמך קיים או אמור היה להיווצר.
- הבחין בין:
  1. מסמך שמוזכר במפורש אך לא צורף.
  2. מסמך שמתבקש מפעולה עסקית שתוארה.
  3. שרשור תקשורת שנראה חלקי או קטוע.
  4. מסמך שמתעד החלטה, אישור, בדיקה או ישיבה.
- קשר כל מסמך חסר לשאלה ליטיגטורית: מה הוא יכול להוכיח, להחליש או להפריך.
- אם אפשר, כתוב:
  "חסר [מסמך ספציפי], משום ש[אינדיקציה מתוך החומר]."

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

מסמכי התיק:
${safeDocumentsText}
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
