export default function buildAnalyzePrompt({
  caseText,
  documentText,
  files = [],
  legalPacks = [],
  precedents = [],
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

    return (
      text.slice(0, maxChars) +
      "\n\n[הטקסט קוצר לצורך ניתוח הדמו.]"
    );
  }

  function formatFileForPrompt(file, index) {
    const profile = file?.documentProfile || {};

    const chunks = (file?.chunks || [])
      .slice(0, MAX_CHUNKS_PER_FILE)
      .map((chunk) => {
        return `
[Chunk ${chunk.index}]
Chunk ID: ${chunk.id}

${limitText(chunk.text, MAX_CHUNK_CHARS)}
`;
      })
      .join("\n\n");

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
${
  profile?.riskSignals?.length
    ? profile.riskSignals.map((s) => `- ${s}`).join("\n")
    : "לא זוהו"
}

אינדיקציות למסמכים חסרים:
${
  profile?.missingAttachmentSignals?.length
    ? profile.missingAttachmentSignals.map((s) => `- ${s}`).join("\n")
    : "לא זוהו"
}

Preview:
${limitText(file?.preview || "", 900)}

Chunks:
${chunks || "[אין chunks זמינים]"}
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
      .join("\n\n-----------------------------------\n\n");

    return limitText(formatted, MAX_TOTAL_FILES_CHARS);
  }

  function formatPrecedentsForPrompt() {
    if (!precedents?.length) {
      return "לא נטענה פסיקה מהמאגר.";
    }

    return precedents
      .slice(0, MAX_PRECEDENTS)
      .map((p, index) => {
        return `
====================
פסק דין ${index + 1}
====================

ID:
${p.id || "unknown"}

שם:
${p.title || p.shortName || "ללא שם"}

שם קצר:
${p.shortName || "לא זוהה"}

ערכאה:
${p.court || "לא זוהתה"}

חקיקה:
${
  p.statutes?.length
    ? p.statutes.map((s) => `- ${s}`).join("\n")
    : "לא זוהתה"
}

סוגיות:
${
  p.issues?.length
    ? p.issues.map((issue) => `- ${issue}`).join("\n")
    : "לא זוהו"
}

מיני-רציו / תקציר:
${limitText(p.miniRatio || p.rawPreview || "", MAX_PRECEDENT_TEXT_CHARS)}

סטטוס חילוץ:
${p.extractionStatus || "unknown"}
`;
      })
      .join("\n\n");
  }

  const safeCaseText = limitText(caseText, MAX_CASE_CHARS);
  const safeDocumentsText = buildFilesText();

  const knowledgeText = legalPacks
    .map((pack) => formatLegalPack(pack))
    .join("\n\n");

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
- תחת השדה caseLaw.retrievedPrecedents החזר לפחות 3 פסקי דין, אם קיימים במאגר.
- בחר את פסקי הדין הרלוונטיים ביותר לעובדות ולסוגיות.
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
- אם קיים no-reliance clause —
  נתח את משקלו מול הראיות האחרות.
- אם קיימת אינדיקציה להסתרה,
  אי-גילוי,
  ידיעה מוקדמת,
  partial chain,
  missing attachment,
  deck חסר,
  או טיוטה —
  הדגש זאת.

מגבלות פלט:
- עד 3 סוגיות מרכזיות
- עד 6 אירועי timeline
- עד 6 שורות evidence map
- עד 5 פריטים בכל רשימת פעולה

שכבות ידע פעילות:
${knowledgeText}

פסיקה רלוונטית מתוך המאגר:
${precedentsText}

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
    "caseLaw": {
    "retrievedPrecedents": [
      {
        "name": "",
        "relevance": "",
        "helps": "Claimant/Defense/Mixed",
        "useInLitigation": ""
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
${(pack.reasoningRules || []).map((rule) => `- ${rule}`).join("\n")}

חקיקה:
${(pack.statutes || [])
  .map((s) => `- ${s.source} ${s.section}: ${s.title} — ${s.summary}`)
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
  .map((h) => `- ${h.hebrewTitle}: ${h.pattern} שימוש: ${h.litigationUse}`)
  .join("\n")}
`;
}
