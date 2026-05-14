const cases = [
  {
    id: "gmhl",
    type: "case",
    name: "ג.מ.ח.ל.",
    doctrine: "הטעיה, הסתמכות וקשר סיבתי",
    summary:
      "רלוונטי לבחינת עילת הטעיה כאשר יש מחלוקת אם הייתה הסתמכות בפועל וקשר סיבתי בין המצג או אי־הגילוי לבין ההתקשרות.",
    helpsWhen:
      "יש ראיה שהצד המתקשר הסתמך על מצג או אי־גילוי מהותי בעת ההתקשרות.",
    hurtsWhen:
      "חסרים הסתמכות, קשר סיבתי, או כאשר העובדות מצביעות על נטילת סיכון מודעת.",
    evidentiaryImplication:
      "דרושות ראיות בזמן אמת לשאלה מה ידע הצד המתקשר ומה השפיע עליו לפני החתימה.",
    tags: [
      "contracts",
      "formation-defects",
      "misrepresentation",
      "reliance",
      "causation"
    ]
  },
  {
    id: "abu-rakia",
    type: "case",
    name: "אבו רקיה",
    doctrine: "אי־גילוי וחובת גילוי מוגברת",
    summary:
      "רלוונטי כאשר נטען שהצד השני הסתיר מידע מהותי, במיוחד בהקשרים של פערי מידע, יחסי אמון, ניגוד עניינים או חובת גילוי מוגברת.",
    helpsWhen:
      "יש הסתרת פרט מהותי, יחסי אמון, ניגוד עניינים או פער מידע משמעותי.",
    hurtsWhen:
      "המידע היה גלוי, נגיש, או שניתן היה לבררו בבדיקת נאותות רגילה.",
    evidentiaryImplication:
      "חשוב לאתר מסמכים שמראים ידיעה של הצד המסתיר ומרכזיות המידע שהוסתר.",
    tags: [
      "contracts",
      "formation-defects",
      "misrepresentation",
      "non-disclosure",
      "duty-to-disclose"
    ]
  },
  {
    id: "psagot",
    type: "case",
    name: "פסגות",
    doctrine: "נטילת סיכון, טעות בכדאיות וסופיות הסכמות",
    summary:
      "רלוונטי לטענות הגנה של נטילת סיכון, טעות בכדאיות העסקה, בדיקת נאותות, והקצאת סיכונים חוזית.",
    helpsWhen:
      "יש צורך להגן על הסכם מפני ניסיון לפתוח מחדש סיכון עסקי שהתממש.",
    hurtsWhen:
      "קיימת הסתרה אקטיבית או אי־גילוי של מידע מהותי שלא היה חלק מהסיכון הרגיל.",
    evidentiaryImplication:
      "חשוב לבדוק הקצאת סיכונים בהסכם, בדיקת נאותות, מצגים, חריגים וגילויים.",
    tags: [
      "contracts",
      "formation-defects",
      "mistake",
      "risk-allocation",
      "business-risk",
      "due-diligence"
    ]
  }
];

export default cases;
