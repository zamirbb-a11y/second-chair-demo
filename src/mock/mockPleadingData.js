// Bundle = אגד of related pleadings (e.g. main pleadings, summaries)
// Pleading = one document within a bundle
// Claim = one argument within a pleading
//
// status: "pending" = not yet uploaded, "analyzed" = uploaded + AI analyzed
// side: "opposing" | "ours"
// docType: the specific document name in Hebrew

const mockPleadingBundles = [
  {
    id: "bundle-main",
    label: "כתבי טענות ראשיים",
    pleadings: [
      {
        id: "opp-complaint",
        bundleId: "bundle-main",
        side: "opposing",
        docType: "כתב תביעה",
        filedBy: "ד\"ר ליאור ברק",
        filedAt: "2026-05-12",
        status: "analyzed",
        summary: 'טענות להפרת הסכם העסקה, הוצאת לשון הרע ופגיעה במוניטין. סעדים: פיצויי פיטורין, פיצוי בגין היעדר הודעה מוקדמת ופיצויי לשון הרע.',
        claims: [
          {
            id: "opp-c1",
            side: "opposing",
            pleadingId: "opp-complaint",
            title: "הפרת הסכם העסקה",
            type: "main",
            parentId: null,
            importance: "central",
            strength: "medium",
            qa: {
              question: "כמה חזקה טענת הפרת ההסכם?",
              answer: 'מצרפים הסכם עם תקופת העסקה מינימלית של 24 חודשים. הפיטורין לאחר 11 חודשים לכאורה מפרים אותו, אך סעיף 14 ("שינוי מהותי בנסיבות") — ניסוח דו-משמעי שיכריע את התיק.',
            },
            sourceSpans: [
              { text: "הנתבעת התחייבה להעסיק את התובע לתקופה של לא פחות מ-24 חודשים", paragraph: 8 },
              { text: "בניגוד מפורש להוראות ההסכם, פוטר התובע לאחר 11 חודשים בלבד", paragraph: 9 },
            ],
            weaknesses: [
              "סעיף 14 — 'שינוי מהותי בנסיבות' — הרפורמה המבנית של המפלגה תשמש טיעון נגדי",
              "התובע לא עמד ביעדי הביצוע שבנספח ב'",
              "אין פרוטוקולים שיוכיחו שרירותיות — חולשה ראייתית",
            ],
            contradictions: [
              "סעיף 8 טוען שלא ניתנה הודעה מוקדמת — אך נספח ג' שצירף התובע עצמו הוא מכתב ההודעה המוקדמת",
            ],
            missingResponses: [
              "לא מתייחסים לאימיילים הפנימיים שצורפו לתגובתנו",
              "ישיבת השימוע מיום 15.3.26 — חסרה לחלוטין",
            ],
            authorities: [
              { name: "ע\"ע (ארצי) 1185/00 שמעון בלום נ' מדינת ישראל", type: "case_law", side: "supports_them", relevance: "כיבוד הסכמים בדיני עבודה" },
              { name: "חוק פיצויי פיטורים, תשכ\"ג-1963, סעיף 1", type: "statute", side: "neutral", relevance: "תנאי הזכאות לפיצויים" },
            ],
          },
          {
            id: "opp-c1-1",
            side: "opposing",
            pleadingId: "opp-complaint",
            title: "אי-תשלום שכר מלא",
            type: "sub",
            parentId: "opp-c1",
            importance: "secondary",
            strength: "strong",
            qa: {
              question: "כמה חזקה הטענה על קיזוז השכר?",
              answer: "תלושי שכר מראים קיזוז של 3,200 ₪ לחודש ב-3 חודשים ללא הסבר. הטענה מגובה בתיעוד — חשיפה ממשית.",
            },
            sourceSpans: [{ text: "בחודשים פברואר, מרץ ואפריל 2026 קוזז סכום של 3,200 ₪ מדי חודש שלא כדין", paragraph: 12 }],
            weaknesses: ["ניתן לטעון שהקיזוז כנגד הוצאות נסיעה שהוחזרו ביתר — יש לתעד"],
            contradictions: [],
            missingResponses: ["לא הגישו בקשה לפיצויי הלנת שכר — מצמצם חשיפה"],
            authorities: [{ name: "חוק הגנת השכר, תשי\"ח-1958, סעיף 17", type: "statute", side: "supports_them", relevance: "פיצויי הלנת שכר" }],
          },
          {
            id: "opp-c1-2",
            side: "opposing",
            pleadingId: "opp-complaint",
            title: "פיטורין בלא שימוע",
            type: "sub",
            parentId: "opp-c1",
            importance: "central",
            strength: "medium",
            qa: {
              question: "האם טענת השימוע הפגום עומדת?",
              answer: "טוענים שהשימוע מיום 15.3.26 היה פיקטיבי. אין פרוטוקול, אין עדים — ניתנת להפרכה.",
            },
            sourceSpans: [{ text: "השימוע שנערך היה פיקטיבי בלבד — מסקנתו נקבעה מראש", paragraph: 17 }],
            weaknesses: ["טענת 'שימוע פיקטיבי' מחייבת הוכחת כוונה — נטל כבד", "אין עד שנכח בשימוע"],
            contradictions: [],
            missingResponses: ["חייבים לצרף פרוטוקול השימוע", "אין הסבר מדוע לא הוגשה השגה מיידית"],
            authorities: [{ name: "ע\"ע (ארצי) 164/99 מרחב נ' פרנקל", type: "case_law", side: "supports_them", relevance: "דרישות שימוע הוגן" }],
          },
          {
            id: "opp-c2",
            side: "opposing",
            pleadingId: "opp-complaint",
            title: "הוצאת לשון הרע",
            type: "main",
            parentId: null,
            importance: "central",
            strength: "medium",
            qa: {
              question: "כמה חזקה עילת לשון הרע?",
              answer: "הפוסט הציבורי ב-X (120K עוקבים) — חשיפה ממשית. ההודעה הפנימית — הגנת 'פרסום מותר' אפשרית. שתי חזיתות, שונות בעוצמה.",
            },
            sourceSpans: [
              { text: "ביום 20.4.26 פורסם פוסט רשמי בחשבון ה-X: 'ד\"ר ברק הפר את אמון חברי המפלגה'", paragraph: 25 },
            ],
            weaknesses: [
              "הגנת 'אמת דיברתי' — אם הפרת האמון תוכח, הפרסום מוגן",
              "הגנת 'תום לב' — ההודעה הפנימית עשויה ליהנות מסעיף 15 לחוק",
            ],
            contradictions: [],
            missingResponses: ["אין ראיה לנזק מוניטיני בפועל — לא הוצגו עסקאות שנכשלו ולא חוות דעת מומחה"],
            authorities: [
              { name: "חוק איסור לשון הרע, תשכ\"ה-1965, סעיפים 1, 14, 15", type: "statute", side: "neutral", relevance: "הגדרת לשון הרע והגנות" },
              { name: "ע\"א 89/04 נודלמן נ' שרנסקי", type: "case_law", side: "supports_them", relevance: "פרסום ברשת כ'פרסום' לצורך החוק" },
            ],
          },
        ],
      },
      {
        id: "our-defense",
        bundleId: "bundle-main",
        side: "ours",
        docType: "כתב הגנה",
        filedBy: "מפלגת \"העתיד המתקדם\"",
        filedAt: "2026-06-15",
        status: "analyzed",
        summary: "מכחיש את טענות ההפרה ומסתמך על סעיף 14 להסכם, ביצועי הנתבע הלקויים, ועל הגנות חוק איסור לשון הרע.",
        claims: [
          {
            id: "our-c1",
            side: "ours",
            pleadingId: "our-defense",
            title: "הסכם הופסק כדין — סעיף 14",
            type: "main",
            parentId: null,
            importance: "central",
            strength: "medium",
            qa: {
              question: "עד כמה עמידה טענת הפסקת ההסכם כדין?",
              answer: 'הטענה מתבססת על סעיף 14 ("שינוי מהותי בנסיבות") — ניסוח רחב שמאפשר הפסקה בשל רפורמה מבנית. העוצמה תלויה בפרשנות שיפוטית.',
            },
            sourceSpans: [{ text: "הרפורמה המבנית שעברה המפלגה בינואר 2026 הצדיקה ארגון מחדש מקיף של המטה", paragraph: 5 }],
            weaknesses: ["ניסוח סעיף 14 אינו מפרט 'שינוי מהותי' — פתוח לתקיפה", "אין תיעוד פנימי מלא של ההחלטה העסקית"],
            contradictions: [],
            missingResponses: ["לצרף פרוטוקולי הנהלה המתעדים את הרפורמה", "להמציא חוות דעת משפטית פנימית"],
            authorities: [
              { name: "ע\"ע (ארצי) 300274/98 פרנקל נ' מגדל", type: "case_law", side: "supports_us", relevance: "פרשנות מרחיבה לסעיפי סיום בנסיבות" },
              { name: "חוק פיצויי פיטורים, תשכ\"ג-1963, סעיף 11", type: "statute", side: "neutral", relevance: "פיטורין מוצדקים" },
            ],
          },
          {
            id: "our-c2",
            side: "ours",
            pleadingId: "our-defense",
            title: "הפרסומים מוגנים — אמת ותום לב",
            type: "main",
            parentId: null,
            importance: "central",
            strength: "strong",
            qa: {
              question: "האם הגנות לשון הרע מחזיקות?",
              answer: "שתי הגנות: (1) 'אמת דיברתי' — אם יוכח שהפר אמון; (2) 'פרסום מותר' — ההודעה הפנימית לחברי מפלגה עומדת בסעיף 15. הפוסט — חזק פחות אך גם שם קיימת הגנת אמת.",
            },
            sourceSpans: [{ text: "הפרסומים נועדו ליידע את חברי המפלגה על שינוי בכיר ולא לפגוע בפרסונה הציבורית", paragraph: 18 }],
            weaknesses: ["הגנת 'אמת' דורשת הוכחה — צריך עדים ותיעוד להפרת האמון", "הפוסט נוסח בצורה חדה — פרסום מרוכך יותר היה מוריד סיכון"],
            contradictions: [],
            missingResponses: ["לאסוף עדויות חברי מפלגה שנפגעו", "להכין רשימת אירועים ספציפיים המוכיחים הפרת אמון"],
            authorities: [
              { name: "חוק איסור לשון הרע, תשכ\"ה-1965, סעיף 14", type: "statute", side: "supports_us", relevance: "הגנת אמת דיברתי" },
              { name: "חוק איסור לשון הרע, תשכ\"ה-1965, סעיף 15(2)", type: "statute", side: "supports_us", relevance: "הגנת פרסום לגוף בעל עניין" },
            ],
          },
        ],
      },
      {
        id: "opp-reply",
        bundleId: "bundle-main",
        side: "opposing",
        docType: "כתב תשובה",
        filedBy: null,
        filedAt: null,
        status: "pending",
        summary: null,
        claims: [],
      },
    ],
  },
  {
    id: "bundle-interim",
    label: "הליכים מקדמיים",
    pleadings: [],
  },
  {
    id: "bundle-affidavits",
    label: "תצהירים",
    pleadings: [],
  },
  {
    id: "bundle-summaries",
    label: "סיכומים",
    pleadings: [
      { id: "sum-claimant",  bundleId: "bundle-summaries", side: "opposing", docType: "סיכומי תובע",   filedBy: null, filedAt: null, status: "pending", summary: null, claims: [] },
      { id: "sum-defendant", bundleId: "bundle-summaries", side: "ours",     docType: "סיכומי נתבע",   filedBy: null, filedAt: null, status: "pending", summary: null, claims: [] },
      { id: "sum-reply",     bundleId: "bundle-summaries", side: "opposing", docType: "סיכומי תשובה",  filedBy: null, filedAt: null, status: "pending", summary: null, claims: [] },
    ],
  },
];

export default mockPleadingBundles;
