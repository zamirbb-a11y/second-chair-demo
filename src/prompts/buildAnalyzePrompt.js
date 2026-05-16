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
  const MAX_CHUNKS_PER_FILE = 3;
  const MAX_CHUNK_CHARS = 1600;

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
    const name =
      file?.name || `מסמך ${index + 1}`;

    const type =
      file?.type || "unknown";

    const status =
      file?.status || "unknown";

    const profile =
      file?.documentProfile || {};

    const chunks = (
      file?.chunks || []
    )
      .slice(0, MAX_CHUNKS_PER_FILE)
      .map((chunk) => {
        return `
[Chunk ${chunk.index}]
Chunk ID: ${chunk.id}
טווח תווים: ${chunk.start}-${chunk.end}

${limitText(
  chunk.text,
  MAX_CHUNK_CHARS
)}
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
${name}

סוג:
${type}

סטטוס:
${status}

תפקיד ראייתי:
${
  profile.documentRole ||
  "לא זוהה"
}

משקל ראייתי:
${
  profile.evidenceWeight ||
  "Unknown"
}

תקציר:
${
  limitText(
    profile.summary || "",
    900
  ) || "לא זוהה"
}

תאריכים מרכזיים:
${
  profile?.keyDates
    ?.join(", ") || "לא זוהו"
}

אנשים / גורמים:
${
  profile?.keyPeople?.join(
    ", "
  ) || "לא זוהו"
}

סימני סיכון:
${
  profile?.riskSignals?.length
    ? profile.riskSignals
        .map((s) => `- ${s}`)
        .join("\n")
    : "לא זוהו"
}

אינדיקציות למסמכים חסרים:
${
  profile
    ?.missingAttachmentSignals
    ?.length
    ? profile.missingAttachmentSignals
        .map((s) => `- ${s}`)
        .join("\n")
    : "לא זוהו"
}

Preview:
${limitText(
  file?.preview || "",
  900
)}

Chunks:
${chunks || "[אין chunks זמינים]"}

טקסט מלא:
${limitText(
  file?.text || "",
  MAX_FILE_CHARS
)}
`;
  }

  function buildFilesText() {
    const processedFiles = (
      files || []
    ).filter((file) =>
      file?.text?.trim()
    );

    if (!processedFiles.length) {
      return limitText(
        documentText,
        MAX_DOCUMENT_CHARS
      );
    }

    const formatted =
      processedFiles
        .map((file, index) =>
          formatFileForPrompt(
            file,
            index
          )
        )
        .join(
          "\n\n-----------------------------------\n\n"
        );

    return limitText(
      formatted,
      MAX_TOTAL_FILES_CHARS
    );
  }

  const safeCaseText = limitText(
    caseText,
    MAX_CASE_CHARS
  );

  const safeDocumentsText =
    buildFilesText();

  const knowledgeText =
    legalPacks
      .map((pack) =>
        formatLegalPack(pack)
      )
      .join("\n\n");

  return `
אתה עורך דין ליטיגציה מסחרית בכיר בישראל.

המטרה:
לבנות Litigation Cockpit חד, פרקטי וליטיגטורי.
לא חוות דעת אקדמית.
לא סיכום מסמכים.
המיקוד הוא pressure points, חולשות ראייתיות, זירות מחלוקת וסיכוני ליטיגציה.

עקרון יסוד:
המסמכים אינם "טקסט".
כל מסמך הוא יחידת ראיה בעלת:
- תפקיד ראייתי
- משקל ראייתי
- הקשר כרונולוגי
- פוטנציאל סתירה
- משמעות ליטיגטורית

כללי עבודה:
- כתוב בעברית משפטית חדה וקצרה.
- אל תכתוב טקסט גנרי.
- אל תלמד את הדין באופן כללי.
- בצע screening שקט של עילות וסעדים; הצג רק מה שיש לו אחיזה עובדתית.
- התמקד במשמעות הליטיגטורית של העובדות.
- אל תנסה להיות "מאוזן" באופן מלאכותי.
- תן משקל גבוה למסמכים בזמן אמת.
- תן משקל נמוך לנרטיבים מאוחרים.
- כאשר קיימת סתירה בין מסמכים — כתוב אותה באופן ישיר וברור.
- כאשר מסמך מסוים פוגע מהותית בנרטיב — הדגש זאת.
- כאשר קיימת אינדיקציה להסתרה, אי-גילוי או ידיעה מוקדמת — כתוב זאת.
- כאשר חסר מסמך צפוי — כתוב למה היה צפוי שיתקיים.
- השתמש ב-grounding ספציפי:
  שם מסמך, File ID או Chunk ID.
- אל תכתוב grounding כללי כמו "המסמכים".
- כאשר אתה מסתמך על inference — נסח בזהירות יחסית:
  "עשוי להעיד", "מחזק", "תומך", "מלמד".

הוראות מיוחדות לניתוח מסמכים:
- הבחן בין:
  1. חוזים חתומים
  2. אימיילים בזמן אמת
  3. הודעות פנימיות
  4. טיוטות
  5. כתבי טענות מאוחרים
- אם קיימים:
  no-reliance clauses,
  disclaimers,
  internal admissions,
  concealment indicators,
  missing attachments,
  partial email chains,
  references to meetings or decks —
  הדגש אותם במפורש.
- כאשר email או WhatsApp סותרים מסמך חוזי — נתח את המשמעות הליטיגטורית.
- כאשר מסמך נראה "בדיעבד" או defensive — כתוב זאת.

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
