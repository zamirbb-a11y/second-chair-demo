const packs = {
  contractFormationDefects: {
    id: "contractFormationDefects",

    title: "פגמים בכריתת חוזה, ביטול והשבה",

    includeTags: [
      "formation-defects",
      "cancellation",
      "restitution",
      "severability"
    ],

    includeHeuristics: [
      "no-contemporaneous-evidence",
      "silence-against-interest",
      "contradictory-documents",
      "litigation-driven-narrative",
      "drafting-history-pressure",
      "disclosure-conflict",
      "expected-documentary-footprint"
    ],

    reasoningRules: [
      "בצע screening שקט של כל העילות, אך הצג רק עילות שיש להן אחיזה עובדתית ממשית.",

      "אל תציג עילה רק מפני שהיא קיימת בחוק.",

      "הבחן בין עילה מרכזית לבין עילה חלופית או חלשה.",

      "נתח תחילה את הפגם בכריתה, ורק לאחר מכן את התוצאה: ביטול, ביטול חלקי, השבה, הפרדה או סעד אחר.",

      "בדוק בכל מקרה של ביטול אם נמסרה הודעת ביטול, אם הביטול נעשה בתוך זמן סביר, ואם קיימת התנהגות המלמדת על ויתור או שיהוי.",

      "אל תניח שביטול מוביל אוטומטית להשבה פשוטה; נתח את סעיף 21 כזירת מחלוקת עצמאית כאשר הסעד הוא ביטול והשבה.",

      "בדוק תמיד טענות נגד צפויות: טעות בכדאיות, נטילת סיכון, בדיקת נאותות, ידיעה בפועל, שיהוי, ויתור, העדר הסתמכות וקשר סיבתי.",

      "כאשר קיימת מערכת עובדתית שיכולה לתמוך גם בעילות שאינן חוזיות, סמן זאת רק אם יש לכך חשיבות ליטיגטורית ממשית.",

      "הפעל heuristics של Documentary Pressure כאשר קיימים פערים, סתירות, שתיקות או דפוסי תיעוד חריגים במסמכים."
    ]
  },
  contractInterpretation: {
  id: "contractInterpretation",

  title: "פרשנות חוזה",

  includeTags: [
    "interpretation"
  ],

  includeHeuristics: [
    "contradictory-documents",
    "drafting-history-pressure",
    "expected-documentary-footprint"
  ],

  reasoningRules: [
    "בדוק האם המחלוקת נוגעת ללשון החוזה, תכליתו או התנהגות הצדדים לאחר הכריתה.",

    "בחוזים מסחריים מתוחכמים תן משקל משמעותי ללשון ההסכם.",

    "בדוק אם קיימת היסטוריית טיוטות, משא ומתן או ביצוע בפועל שמשפיעים על הפרשנות.",

    "הבחן בין פרשנות לגיטימית לבין ניסיון לשכתב את ההסכם בדיעבד."
  ]
},

contractBreach: {
  id: "contractBreach",

  title: "הפרת חוזה",

  includeTags: [
    "breach",
    "contracts"
  ],

  includeHeuristics: [
    "expected-documentary-footprint",
    "contradictory-documents"
  ],

  reasoningRules: [
    "זהה את החיובים המרכזיים של הצדדים ואת ההפרות הנטענות.",

    "הבחן בין הפרה יסודית לבין הפרה שאינה יסודית.",

    "בדוק קשר סיבתי בין ההפרה לנזק הנטען.",

    "בדוק האם קיימות טענות של ויתור, מניעות, קיזוז או אשם תורם חוזי."
  ]
},

contractRemedies: {
  id: "contractRemedies",

  title: "תרופות חוזיות",

  includeTags: [
    "remedies",
    "cancellation",
    "restitution"
  ],

  includeHeuristics: [
    "expected-documentary-footprint"
  ],

  reasoningRules: [
    "הבחן בין אכיפה, ביטול, השבה ופיצויים.",

    "בדוק התאמה בין העילה לבין הסעד המבוקש.",

    "בדוק האם קיימת מניעה מעשית או משפטית לאכיפה.",

    "בדוק האם חישוב הנזק נתמך בתשתית ראייתית מספקת."
  ]
},
};


export default packs;

