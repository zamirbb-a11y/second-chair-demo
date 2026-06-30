"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = buildAnalyzePrompt;
var _successAssessmentPrompt = require("../lib/successAssessmentPrompt.js");
function buildAnalyzePrompt({
  caseText,
  documentText,
  files = [],
  legalPacks = [],
  precedents = [],
  clientName = ""
}) {
  const MAX_DOCUMENT_CHARS = 22000;
  const MAX_CASE_CHARS = 6000;
  const MAX_TOTAL_FILES_CHARS = 26000;
  const MAX_CHUNKS_PER_FILE = 3;
  const MAX_CHUNK_CHARS = 1600;
  const MAX_PRECEDENTS = 8;
  const MAX_PRECEDENT_TEXT_CHARS = 1800;
  function limitText(text, maxChars) {
    if (!text) return "";
    if (text.length <= maxChars) {
      return text;
    }
    return text.slice(0, maxChars) + "\n\n[הטקסט קוצר לצורך ניתוח הדמו.]";
  }
  function formatFileForPrompt(file, index) {
    const profile = file?.documentProfile || {};
    const chunks = (file?.chunks || []).slice(0, MAX_CHUNKS_PER_FILE).map(chunk => {
      return `
[Chunk ${chunk.index}]
Chunk ID: ${chunk.id}

${limitText(chunk.text, MAX_CHUNK_CHARS)}
`;
    }).join("\n\n");
    return `
====================
מסמך ${index + 1}
====================

File ID:
${file?.id || "unknown"}

שם מסמך:
${file?.name || "unknown"}

סוג:
${file?.type || "unknown"}

סטטוס:
${file?.status || "unknown"}

תפקיד ראייתי:
${profile.documentRole || "לא זוהה"}

משקל ראייתי:
${profile.evidenceWeight || "Unknown"}

תקציר:
${limitText(profile.summary || "", 900) || "לא זוהה"}

תאריכים מרכזיים:
${profile?.keyDates?.join(", ") || "לא זוהו"}

אנשים / גורמים:
${profile?.keyPeople?.join(", ") || "לא זוהו"}

סימני סיכון:
${profile?.riskSignals?.length ? profile.riskSignals.map(s => `- ${s}`).join("\n") : "לא זוהו"}

אינדיקציות למסמכים חסרים:
${profile?.missingAttachmentSignals?.length ? profile.missingAttachmentSignals.map(s => `- ${s}`).join("\n") : "לא זוהו"}

Preview:
${limitText(file?.preview || "", 900)}

Chunks:
${chunks || "[אין chunks זמינים]"}
`;
  }
  function buildFilesText() {
    const processedFiles = (files || []).filter(file => file?.text?.trim());
    if (!processedFiles.length) {
      return limitText(documentText, MAX_DOCUMENT_CHARS);
    }
    const formatted = processedFiles.map((file, index) => formatFileForPrompt(file, index)).join("\n\n-----------------------------------\n\n");
    return limitText(formatted, MAX_TOTAL_FILES_CHARS);
  }
  function formatPrecedentsForPrompt() {
    if (!precedents?.length) {
      return "לא נטענה פסיקה מהמאגר.";
    }
    return precedents.slice(0, MAX_PRECEDENTS).map((p, index) => {
      return `
====================
פסק דין ${index + 1}
====================

ID:
${p.id || "unknown"}

מספר הליך:
${p.caseNumber || "לא ידוע"}

שם:
${p.title || p.shortName || "ללא שם"}

שם קצר:
${p.shortName || "לא זוהה"}

ערכאה:
${p.court || "לא זוהתה"}

חקיקה:
${p.statutes?.length ? p.statutes.map(s => `- ${s}`).join("\n") : "לא זוהתה"}

סוגיות:
${p.issues?.length ? p.issues.map(issue => `- ${issue}`).join("\n") : "לא זוהו"}

מיני-רציו / תקציר:
${limitText(p.miniRatio || p.rawPreview || "", MAX_PRECEDENT_TEXT_CHARS)}

סטטוס חילוץ:
${p.extractionStatus || "unknown"}
`;
    }).join("\n\n");
  }
  const safeCaseText = limitText(caseText, MAX_CASE_CHARS);
  const safeDocumentsText = buildFilesText();
  const knowledgeText = legalPacks.map(pack => formatLegalPack(pack)).join("\n\n");
  const precedentsText = formatPrecedentsForPrompt();
  return `
אתה עורך דין ליטיגציה מסחרית בכיר בישראל.

המטרה:
לבנות Litigation Cockpit חד, פרקטי וליטיגטורי.
לא חוות דעת אקדמית.
לא סיכום מסמכים.
המיקוד הוא:
pressure points,
חולשות ראייתיות,
סתירות,
משמעות ליטיגטורית,
וסיכוני ליטיגציה.

עקרון יסוד:
כל מסמך הוא יחידת ראיה.

כללי עבודה:
- כתוב בעברית משפטית חדה וקצרה.
- אל תכתוב טקסט גנרי.
- התמקד במשמעות ליטיגטורית.
- אל תלמד את הדין באופן כללי.
- תן משקל גבוה למסמכים בזמן אמת.
- תן משקל נמוך לנרטיבים מאוחרים.
- כאשר קיימת סתירה בין מסמכים — כתוב אותה במפורש.
- כאשר מסמך מחליש טענה — כתוב זאת באופן ברור.
- כאשר חסר מסמך צפוי — הסבר למה היה צפוי שיתקיים.
- השתמש ב-grounding ספציפי:
  File ID / Chunk ID / שם מסמך.
- אל תכתוב grounding כללי כמו "המסמכים".
- כאשר inference אינו ודאי:
  כתוב "עשוי להעיד",
  "מחזק",
  "תומך",
  "מלמד".

שימוש בפסיקה:
- לצורך בדיקת הדמו בלבד: חובה להחזיר בפלט פסקי דין מתוך המאגר.
- תחת השדה caseLaw.retrievedPrecedents החזר את כל פסקי הדין שמופיעים תחת "פסיקה רלוונטית מתוך המאגר", עד 6 פסקי דין.
- בחר רק פסקי דין בעלי רלוונטיות ממשית לעובדות התיק — אל תכלול פסקי דין בשל התאמה שטחית בלבד.
- בשדה helps של כל פסיקה: ציין "Claimant" אם הפסיקה מסייעת לצד התובע בתיק הזה, "Defense" אם מסייעת לצד הנתבע, "Mixed" אם מאוזנת בין הצדדים.
- בחר את פסקי הדין הרלוונטיים ביותר לעובדות ולסוגיות.
- העדף פסקי דין עם התאמה עובדתית גבוהה גם כאשר ההתאמה המשפטית אינה מלאה.
- חובה: בשדה caseNumber החזר את מספר ההליך המדויק כפי שמופיע תחת "מספר הליך" בנתוני הפסיקה. אל תמציא מספר הליך — אם לא קיים, השאר ריק.
- בשדה relatedIssueIds: כלול רק id-ים שמופיעים במפורש במערך issues שאתה מחזיר באותה תגובה. אל תמציא id-ים. אל תשתמש בכותרות issues במקום id-ים. אם אין issue ספציפי שהפסיקה רלוונטית לו בבירור — החזר מערך ריק. אל תקשר פסיקה לכל ה-issues אלא אם היא אכן רלוונטית לכולם.

- תן משקל גבוה לדמיון ב:
  1. מבנה העסקה
  2. סוג מערכת היחסים
  3. דפוסי ההתנהגות
  4. סוג הראיות
  5. סוג הסעד המבוקש

- כאשר קיימים פסקי דין בכיוונים מנוגדים — הצג את המתח ביניהם במקום לבחור רק צד אחד.

- אל תעדיף פסק דין רק משום שהוא עוסק באותו סעיף חוק.

- תן עדיפות לפסקי דין שמסייעים להבנת:
  - זירת הקרב המרכזית
  - חולשות ראייתיות
  - טענות נגד צפויות
  - סיכוני הבחנה
  - התאמת הסעד לעובדות
- לכל פסק דין ציין:
  1. שם פסק הדין
  2. למה הוא רלוונטי לתיק
  3. האם הוא מחזק את התובע, מחזק את ההגנה, או מעורב
  4. איך להשתמש בו ליטיגטורית
- אל תמציא פסקי דין.
- השתמש רק בפסקי הדין שמופיעים תחת "פסיקה רלוונטית מתוך המאגר".

הוראות מיוחדות:
- הבחן בין:
  1. חוזים חתומים
  2. אימיילים בזמן אמת
  3. הודעות פנימיות
  4. טיוטות
  5. כתבי טענות מאוחרים
- אם email או WhatsApp סותרים מסמך חוזי —
  נתח את המשמעות הליטיגטורית.
- זהה את סוג המחלוקת המרכזי לפני בחירת מסגרת הניתוח: כריתה, פגם בכריתה, פרשנות, הפרה, תרופות, תום לב, סיכול, חוזה אחיד או סוגיה חוזית אחרת.

- אל תניח שהמחלוקת היא הטעיה, אי־גילוי או פגם בכריתה רק מפני שקיימים מסמכים חסרים, טיוטות או פערים עובדתיים. תחילה בדוק האם העובדות מתאימות טוב יותר לפרשנות, הפרה, סעד חוזי, תום לב או קו טיעון אחר.

- כאשר קיימים סעיפים חוזיים בעלי משמעות מיוחדת — כגון no-reliance, הגבלת אחריות, מנגנון הודעה, תנאי מתלה, תניית ביטול, מנגנון פיצוי, waiver, entire agreement או מנגנון יישוב סכסוכים — נתח את השפעתם על טענות הצדדים ועל הסעדים.

- כאשר קיימים פערי מידע, שרשראות חלקיות, מסמכים חסרים, טיוטות, התכתבויות פנימיות, שינויי גרסה או סתירות בין מסמכים — נתח אותם כעניין ראייתי וליטיגטורי, ורק לאחר מכן קבע האם הם תומכים בהטעיה, פרשנות, הפרה, תום לב, שיהוי, ויתור או טענה אחרת.

- כאשר הסעד המבוקש אינו תואם במדויק את העילה החזקה ביותר, הצף זאת במפורש והצע התאמה בין עילה, ראיות וסעד.
- כאשר קיימות אינדיקציות חריגות במסמכים — כגון פערי תיעוד, שרשראות חלקיות, שינויי גרסה, אי־עקביות בין מסמכים, מסמכים חסרים, טיוטות או אינדיקציות להסתרה — נתח את משמעותן הראייתית והליטיגטורית בהתאם לסוג המחלוקת המרכזי בתיק.

היקף הפלט:
- החזר את כל המחלוקות שיש להן משמעות ליטיגטורית ממשית.
- דרג כל מחלוקת לפי חשיבות: central / secondary / peripheral.
- אל תדחוס מחלוקות שונות לתוך מחלוקת אחת רק כדי לקצר.
- אל תיצור מחלוקות כפולות או מלאכותיות.
- החזר timeline מלא במידה סבירה, אך העדף אירועים שיש להם משמעות משפטית או ראייתית.
- החזר evidence map מלא במידה סבירה, עם דגש על ראיות וחוסרים המשפיעים על אסטרטגיית התיק.
- ברשימות פעולה, החזר פריטים ממוקדים ולא גנריים; אין צורך למלא רשימות ארוכות אם אין לכך ערך.

- השתמש רק בשכבות הידע הרלוונטיות לעובדות התיק.
- אל תניח שכל עילה או שכבת ידע רלוונטית רק מפני שהיא קיימת במאגר.
- העדף התאמה עובדתית וליטיגטורית על פני כיסוי משפטי רחב.

שכבות ידע פעילות:
${knowledgeText}

פסיקה רלוונטית מתוך המאגר:
${precedentsText}
${_successAssessmentPrompt.successAssessmentPrompt}
בנוסף למבנים הקיימים, החזר גם מערך issues.
כל issue צריך להיות יחידת מחלוקת עצמאית.
יש למפות לכל issue:
- עמדות הצדדים הרלוונטיות
- המשמעות המשפטית
- הראיות הרלוונטיות
- החוסרים הראייתיים
- שאלות ללקוח
- צעדים ליטיגטוריים ממוקדים

לשדה legalAssessment.strength: הערכת סיכויי הטענה מנקודת מבטו של הלקוח שלנו — עד כמה טובה עמדתו במחלוקת זו. השתמש בסקלה: very_strong / strong / medium_strong / medium / medium_weak / weak / very_weak / unclear. השאר null אם אין מספיק מידע להערכה.
${clientName ? `לשדה clientRole: הלקוח שלנו הוא ${clientName}. קבע האם ${clientName} הוא הצד שיזם את ההליך ("claimant") או הצד המגיב ("defendant") על פי חומר התיק. אין לנחש — הסתמך על שם הצד בחומר. אם לא ניתן לקבוע בוודאות — בחר לפי ההגיון המשפטי.` : `לשדה clientRole: זהה מי הצד שאנחנו מייצגים על פי הצגת התיק — אם הלקוח הוא זה שיזם את ההליך/הגיש את התביעה → "claimant". אם הלקוח הוא הצד המגיב → "defendant". אם לא ברור → "claimant".`}
לשדה caseSnapshot.parties: רשום את שמות הצדדים האמיתיים כפי שמופיעים בחומר התיק (שמות פרטיים, שמות חברות, גופים) — לא "תובע"/"נתבע". דוגמה: ["חברת ABC בע\"מ", "יוסי כהן"]. אם השמות אינם ידועים — השאר מערך ריק.
לשדה partyPositions: כתוב עמדות בשפה עובדתית ישירה. הימנע ממילים "תובע" ו"נתבע" — השתמש בשם הצד או ב"הצד הראשון"/"הצד השני".
לשדה challengePoints: רשימה של הטיעונים, הסיכונים והאתגרים המרכזיים שהצד שכנגד יעלה כנגד המחלוקת הזו — ראיות, עובדות, טענות או חוסרים שמחלישים את עמדת הלקוח. לא גנריים, ספציפיים לעובדות התיק. לדוגמה: "חוסר בחתימה על ההסכם", "העד המרכזי בעל ניגוד עניינים". מחרוזות קצרות לכל פריט.
אין ליצור issues כפולים.
החזר JSON בלבד, בלי Markdown, בדיוק במבנה הבא:

{
  "source": "OpenAI GPT-4.1-mini",
  "confidence": "High/Medium/Low",
  "clientRole": "claimant | defendant",
"issues": [
  {
    "id": "",
    "title": "",
    "description": "",
    "status": "",
    "importance": "central/secondary/peripheral",

    "partyPositions": {
      "claimant": "",
      "defendant": "",
      "coreDispute": ""
    },

    "legalAssessment": {
      "summary": "",
      "strength": "very_strong | strong | medium_strong | medium | medium_weak | weak | very_weak | unclear | null",
      "relevantLaw": []
    },

    "linkedEvidence": [],
    "linkedWitnesses": [],

    "challengePoints": [],

    "missingInfo": [],

    "actionItems": {
      "clientQuestions": [],
      "missingEvidence": [],
      "suggestedActions": []
    }
  }
],
  "executiveView": {
    "caseSnapshot": {
      "parties": [],
      "coreDispute": "",
      "riskLevel": "High/Medium/Low",
      "issueFocus": "",
      "grounding": []
    },


"successAssessment": {
  "level": "גבוה מאוד/גבוה/בינוני-גבוה/בינוני/בינוני-נמוך/נמוך/נמוך מאוד",
  "summary": "",
  "disputeFocus": "",
  "reservation": "",
  "additionalInformationNeeded": []
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
    "caseLaw": {
    "retrievedPrecedents": [
      {
        "caseNumber": "",
        "name": "",
        "relevance": "",
        "helps": "Claimant/Defense/Mixed",
        "useInLitigation": "",
        "relatedIssueIds": []
      }
    ]
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
${(pack.reasoningRules || []).map(rule => `- ${rule}`).join("\n")}

חקיקה:
${(pack.statutes || []).map(s => `- ${s.source} ${s.section}: ${s.title} — ${s.summary}`).join("\n")}

פסיקה:
${(pack.cases || []).map(c => `- ${c.name}: ${c.doctrine}. מסייע: ${c.helpsWhen} מזיק: ${c.hurtsWhen}`).join("\n")}

יוריסטיקות:
${(pack.heuristics || []).map(h => `- ${h.hebrewTitle}: ${h.pattern} שימוש: ${h.litigationUse}`).join("\n")}
`;
}
//# sourceMappingURL=buildAnalyzePrompt.js.map