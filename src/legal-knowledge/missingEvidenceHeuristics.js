const missingEvidenceHeuristics = [
  {
    id: "mentioned-but-missing",
    group: "missing-evidence",
    title: "Mentioned But Missing",
    hebrewTitle: "מסמך שמוזכר אך אינו נמצא בחומר",
    pattern:
      "החומר מאזכר מסמך, נספח, קובץ, תכתובת או פעולה שממנה משתמע שקיים תיעוד נוסף שלא צורף.",
    lookFor: [
      "ראו מצ״ב",
      "מצורף",
      "כפי שנשלח",
      "בהמשך לשיחתנו",
      "לפי הדוח",
      "בהתאם למצגת",
      "נספח",
      "attachment",
      "attached",
      "as discussed"
    ],
    expectedDocuments: [
      "קובץ מצורף",
      "נספח",
      "דוח",
      "מצגת",
      "שרשור מיילים מלא",
      "התכתבות וואטסאפ מלאה"
    ],
    outputHint:
      "ציין איזה מסמך כנראה חסר, מה בחומר מצביע על קיומו, ולמה הוא חשוב לתיק.",
    tags: [
      "missing-evidence",
      "specific-document",
      "attachments",
      "document-reference"
    ]
  },

  {
    id: "expected-business-record",
    group: "missing-evidence",
    title: "Expected Business Record",
    hebrewTitle: "מסמך עסקי מתבקש",
    pattern:
      "תוארה פעולה עסקית שבדרך כלל אמורה לייצר תיעוד, אך התיעוד אינו מופיע בחומר.",
    lookFor: [
      "עסקה",
      "בדיקת נאותות",
      "ישיבת דירקטוריון",
      "אישור",
      "החלטה",
      "מו״מ",
      "בדיקה",
      "פנייה ליועץ",
      "הצעת מחיר",
      "שירות",
      "תיקון"
    ],
    expectedDocuments: [
      "פרוטוקול",
      "מצגת",
      "טיוטות",
      "מיילים פנימיים",
      "חוות דעת",
      "אישור בכתב",
      "דוח בדיקה",
      "הצעת מחיר"
    ],
    outputHint:
      "אל תכתוב רק שחסרים מסמכים כלליים. נסה לנקוב במסמך הספציפי שהיה צפוי להיווצר.",
    tags: [
      "missing-evidence",
      "business-records",
      "expected-footprint"
    ]
  },

  {
    id: "missing-communication-chain",
    group: "missing-evidence",
    title: "Missing Communication Chain",
    hebrewTitle: "שרשור תקשורת חסר",
    pattern:
      "קיימת אינדיקציה לכך שהתכתובת שהוצגה חלקית, קטועה או חסרה הקשר.",
    lookFor: [
      "תגובה ללא הודעה קודמת",
      "forward חלקי",
      "צילום מסך חלקי",
      "פער כרונולוגי",
      "בהמשך לשיחה",
      "כפי שכתבתי",
      "כפי שסיכמנו",
      "missing attachment"
    ],
    expectedDocuments: [
      "שרשור מיילים מלא",
      "הודעות וואטסאפ קודמות",
      "קבצים מצורפים",
      "הודעה מקורית",
      "התכתבות המשך"
    ],
    outputHint:
      "אם נראה שהוצג רק חלק מהשרשור, בקש את השרשור המלא וציין מה חסר בהקשר.",
    tags: [
      "missing-evidence",
      "communications",
      "email-thread",
      "whatsapp"
    ]
  },

  {
    id: "decision-footprint",
    group: "missing-evidence",
    title: "Decision Footprint",
    hebrewTitle: "עקבות של החלטה",
    pattern:
      "נטען שהתקבלה החלטה, בוצע אישור או נערכה בדיקה מהותית, אך חסרים המסמכים שאמורים לתעד זאת.",
    lookFor: [
      "הוחלט",
      "אושר",
      "נבחן",
      "בוצעה בדיקה",
      "התקבלה החלטה",
      "אישור דירקטוריון",
      "ועדה",
      "המלצה",
      "סיכום ישיבה"
    ],
    expectedDocuments: [
      "פרוטוקול ישיבה",
      "החלטת דירקטוריון",
      "סיכום ישיבה",
      "memo פנימי",
      "מצגת",
      "דוח בדיקה",
      "אישור חתום"
    ],
    outputHint:
      "קשר בין ההחלטה הנטענת לבין המסמך שהיה צפוי לתעד אותה.",
    tags: [
      "missing-evidence",
      "decision-making",
      "corporate-records"
    ]
  }
];

export default missingEvidenceHeuristics;
