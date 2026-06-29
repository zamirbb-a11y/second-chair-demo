const litigationHeuristics = [
  {
    id: "no-contemporaneous-evidence",
    group: "documentary-pressure",
    title: "No Contemporaneous Evidence",
    hebrewTitle: "היעדר תיעוד מזמן אמת",
    pattern:
      "הטענה המרכזית אינה נתמכת במסמך מזמן אמת.",
    judicialReasoning:
      "כאשר טענה מהותית מופיעה רק בדיעבד, בית המשפט עשוי לראות בה גרסה חלשה או self-serving.",
    lookFor: [
      "אימיילים מזמן אמת",
      "פרוטוקולים",
      "הערות לטיוטות",
      "שאלות DD",
      "מכתבי הסתייגות או התראה"
    ],
    litigationUse:
      "להצביע על חולשה ראייתית בטענה המרכזית ולדרוש ראיות contemporaneous.",
    outputHint:
      "אם מזוהה, שקף זאת בסוגיות המרכזיות ובמפת הראיות.",
    tags: [
      "universal",
      "commercial-civil",
      "documentary-pressure",
      "evidence-gap"
    ]
  },

  {
    id: "silence-against-interest",
    group: "documentary-pressure",
    title: "Silence Against Interest",
    hebrewTitle: "שתיקה בזמן אמת בניגוד לאינטרס",
    pattern:
      "צד שטוען כיום שהנושא היה מהותי לא הזכיר אותו בזמן אמת, אף שהיה מצופה שיעשה זאת.",
    judicialReasoning:
      "שתיקה בזמן אמת ביחס לנושא שהוצג בדיעבד כקריטי עשויה ללמד שהנושא לא נתפס כמהותי בזמן אמת.",
    lookFor: [
      "היעדר תלונה",
      "היעדר הסתייגות",
      "היעדר escalation",
      "היעדר פנייה לצד השני",
      "היעדר אזכור בפרוטוקולים"
    ],
    litigationUse:
      "לתקוף מהותיות, הסתמכות, קשר סיבתי או אמינות גרסה מאוחרת.",
    outputHint:
      "אם יש פער בין החשיבות הנטענת כיום לבין שתיקה בזמן אמת, הדגש זאת כנקודת לחץ.",
    tags: [
      "universal",
      "commercial-civil",
      "documentary-pressure",
      "credibility",
      "materiality"
    ]
  },

  {
    id: "contradictory-documents",
    group: "documentary-pressure",
    title: "Contradictory Documents",
    hebrewTitle: "סתירה בין מסמכים",
    pattern:
      "מסמך אחד תומך בנרטיב, אך מסמך אחר מחליש, מסייג או סותר אותו.",
    judicialReasoning:
      "סתירה במסמכים עשויה לפגוע בקוהרנטיות של התיאוריה העובדתית ולחייב הסבר ראייתי משכנע.",
    lookFor: [
      "פער בין הסכם להתכתבות",
      "פער בין DD report למצגים",
      "פער בין מכתב התראה לכתב טענות",
      "פער בין פרוטוקולים לגרסת עד"
    ],
    litigationUse:
      "לזהות attack vector נגד הנרטיב או להצביע על צורך בהסבר משלים.",
    outputHint:
      "אם מזוהה, הצג את הסתירה במפת הראיות ובזירת המחלוקת.",
    tags: [
      "universal",
      "commercial-civil",
      "documentary-pressure",
      "contradiction",
      "credibility"
    ]
  },

  {
    id: "litigation-driven-narrative",
    group: "documentary-pressure",
    title: "Litigation-Driven Narrative",
    hebrewTitle: "גרסה שנולדה לצורך הסכסוך",
    pattern:
      "הגרסה המלאה או הטענה המרכזית מופיעה לראשונה רק לאחר פרוץ הסכסוך.",
    judicialReasoning:
      "גרסה שמופיעה לראשונה לאחר שהסכסוך התגבש עלולה להיתפס כשחזור בדיעבד ולא כתיאור אותנטי של מצב הדברים בזמן אמת.",
    lookFor: [
      "מכתב דרישה ראשון",
      "כתב טענות",
      "תצהיר",
      "פער מול התכתבויות קודמות",
      "היעדר אזכור לפני dispute date"
    ],
    litigationUse:
      "לתקוף אמינות, causal story ומהותיות.",
    outputHint:
      "אם הטענה מופיעה רק במסמכי סכסוך, סמן זאת כסיכון ליטיגטורי.",
    tags: [
      "universal",
      "commercial-civil",
      "documentary-pressure",
      "credibility",
      "post-hoc"
    ]
  },

  {
    id: "drafting-history-pressure",
    group: "documentary-pressure",
    title: "Drafting History Pressure",
    hebrewTitle: "לחץ מטיוטות ומשא ומתן",
    pattern:
      "טיוטות ההסכם או מסמכי המו״מ מראים שהנושא נדון, סומן, הוסר, צומצם או הוקצה במפורש.",
    judicialReasoning:
      "כאשר ההיסטוריה החוזית מלמדת שהצדדים עסקו בנושא, קשה יותר לטעון להפתעה, אי־ידיעה או הסתמכות תמימה.",
    lookFor: [
      "טיוטות הסכם",
      "track changes",
      "הערות עורכי דין",
      "רשימות נושאים פתוחים",
      "סעיפים שנמחקו או שונו"
    ],
    litigationUse:
      "לתקוף טענות של אי־ידיעה או לחזק טענה שהסיכון הוקצה במודע.",
    outputHint:
      "אם יש drafting history רלוונטית, קשר אותה לטענות הסתמכות, נטילת סיכון והקצאת סיכונים.",
    tags: [
      "commercial-civil",
      "documentary-pressure",
      "contracts",
      "risk-allocation",
      "due-diligence"
    ]
  },

  {
    id: "disclosure-conflict",
    group: "documentary-pressure",
    title: "Disclosure Conflict",
    hebrewTitle: "התנגשות עם גילוי קיים",
    pattern:
      "מידע שנטען שהוסתר הופיע בפועל בנספחים, disclosure schedules, data room או חומרי DD.",
    judicialReasoning:
      "כאשר המידע היה גלוי או נגיש במסגרת ההתקשרות, נחלשות טענות ההטעיה, ההסתמכות ואי־הגילוי.",
    lookFor: [
      "disclosure schedules",
      "נספחים להסכם",
      "data room index",
      "DD materials",
      "מענה לשאלות DD"
    ],
    litigationUse:
      "לתמוך בטענת הגנה של גילוי, נגישות מידע, נטילת סיכון או העדר הסתמכות.",
    outputHint:
      "אם המידע הופיע בחומרי הגילוי, הצג זאת כטענת הגנה מרכזית.",
    tags: [
      "commercial-civil",
      "documentary-pressure",
      "contracts",
      "misrepresentation",
      "non-disclosure",
      "due-diligence"
    ]
  },

  {
    id: "expected-documentary-footprint",
    group: "documentary-pressure",
    title: "Expected Documentary Footprint",
    hebrewTitle: "היעדר עקבות מסמכיים מתבקשים",
    pattern:
      "אם הנרטיב נכון, היה מצופה לראות סוג מסוים של תיעוד טבעי — אך התיעוד הזה אינו קיים.",
    judicialReasoning:
      "היעדר תיעוד שהיה צפוי להיווצר במהלך עסקים רגיל עשוי להחליש את הסבירות העובדתית של הנרטיב.",
    lookFor: [
      "מצג מהותי שלא נכנס להסכם",
      "DD נטען ללא שאלות DD",
      "טענה לסיכון מהותי ללא פרוטוקול או memo",
      "טענה להסתייגות ללא reservation בכתב",
      "החלטה עסקית מהותית ללא תיעוד פנימי"
    ],
    litigationUse:
      "להראות שהסיפור העובדתי אינו מותיר את העקבות המסמכיות שהיה מצופה לראות.",
    outputHint:
      "אם מזוהה פער בין הנרטיב לבין התיעוד המתבקש, הצג אותו כפער ראייתי איכותי ולא רק כחוסר ראיה.",
    tags: [
      "universal",
      "commercial-civil",
      "documentary-pressure",
      "evidence-gap",
      "business-records"
    ]
  },

  {
    id: "good-faith-pressure",
    group: "substantive-reasoning",
    title: "Good Faith / Bad Faith Pressure",
    hebrewTitle: "תום לב וחוסר תום לב",
    pattern:
      "התנהלות אחד הצדדים עשויה ללמד על הסתרה, התחמקות, ניצול יתרון מידע, שינוי גרסה או הצדקה בדיעבד.",
    judicialReasoning:
      "בדיני חוזים וליטיגציה אזרחית, דפוסי התנהגות של חוסר תום לב עשויים להשפיע על פרשנות, אחריות, סעד, אמינות ומשקל ראייתי.",
    lookFor: [
      "פער בין מצגים מוקדמים להתנהגות מאוחרת",
      "הסתרת מידע מהותי",
      "מסירת מידע חלקי או עמום",
      "שינוי גרסה לאחר פרוץ הסכסוך",
      "ניצול יתרון מידע",
      "התחמקות ממענה ברור",
      "post-hoc justification"
    ],
    litigationUse:
      "לזהות טענות אפשריות של חוסר תום לב, להפעיל לחץ פרשני וראייתי, ולחזק דרישות לגילוי מסמכים פנימיים והתכתבויות מזמן אמת.",
    outputHint:
      "אם מזוהה דפוס של הסתרה, עמימות או שינוי גרסה, הצג אותו כיוריסטיקה עצמאית וקשר אותו למסמכים ולעובדות הספציפיים.",
    tags: [
      "universal",
      "commercial-civil",
      "contracts",
      "good-faith",
      "bad-faith",
      "credibility",
      "interpretation"
    ]
  },

  {
    id: "power-asymmetry",
    group: "substantive-reasoning",
    title: "Power Asymmetry",
    hebrewTitle: "פערי כוחות",
    pattern:
      "קיים פער בין הצדדים בשליטה במידע, מומחיות, כוח מיקוח, תלות כלכלית, ניסוח ההסכם או גישה למסמכים.",
    judicialReasoning:
      "פערי כוחות עשויים להצדיק בחינה ביקורתית יותר של התנהלות הצד החזק, להשפיע על פרשנות החוזה ועל הערכת הסתמכות, גילוי והוגנות.",
    lookFor: [
      "מי ניסח את ההסכם",
      "מי שלט במידע או במסמכים",
      "פער מומחיות מקצועית",
      "פער כלכלי או תלות עסקית",
      "חוזה אחיד או תנאים שלא נוהלו",
      "יחסי אמון או הסתמכות",
      "גישה לא שווה לנתונים בזמן אמת"
    ],
    litigationUse:
      "לחדד טענות הסתמכות, גילוי, פרשנות נגד המנסח, ניצול יתרון מידע ודרישות גילוי ממוקדות כלפי הצד החזק.",
    outputHint:
      "אם מזוהה פער כוחות, ציין מי הצד החזק, מה מקור היתרון, ואיך הדבר משפיע על התיאוריה המשפטית או הראייתית.",
    tags: [
      "universal",
      "commercial-civil",
      "contracts",
      "power-asymmetry",
      "information-asymmetry",
      "contra-proferentem",
      "fairness"
    ]
  },

  {
    id: "contract-interpretation-section-25",
    group: "substantive-reasoning",
    title: "Contract Interpretation / Section 25",
    hebrewTitle: "פרשנות חוזית / סעיף 25 לחוק החוזים",
    pattern:
      "לשון ההסכם, נסיבות הכריתה, תכלית ההתקשרות או התנהגות הצדדים עשויים לתמוך ביותר מקריאה פרשנית אחת.",
    judicialReasoning:
      "סעיף 25 לחוק החוזים מכוון לפרשנות חוזה לפי אומד דעת הצדדים, כפי שהוא משתמע מלשון החוזה ומנסיבות העניין, תוך בחינת התכלית וההקשר.",
    lookFor: [
      "סעיף עמום או מונח לא מוגדר",
      "פער בין לשון החוזה להתנהגות הצדדים",
      "טיוטות קודמות או track changes",
      "סעיפים שנמחקו או שונו במשא ומתן",
      "התנהגות לאחר כריתת ההסכם",
      "שימוש עקבי או לא עקבי במונחים",
      "שאלה מי ניסח את הסעיף"
    ],
    litigationUse:
      "לפתח כיווני פרשנות, לזהות מסמכים רלוונטיים לפרשנות, ולבחון אם קיימת טענה לפרשנות נגד המנסח או לפי התנהגות הצדדים בפועל.",
    outputHint:
      "אם מזוהה שאלה פרשנית, אל תסתפק באמירה כללית. הצג את הקריאות האפשריות, המסמכים שיכולים להכריע ביניהן, והקשר לסעיף 25.",
    tags: [
      "commercial-civil",
      "contracts",
      "interpretation",
      "section-25",
      "drafting-history",
      "contra-proferentem",
      "purpose"
    ]
  }
];

export default litigationHeuristics;
