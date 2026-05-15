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
  }
};

export default packs;
