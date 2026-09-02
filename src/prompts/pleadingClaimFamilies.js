// Claim Families — conservative merge confirmation. Given a small candidate
// group of claim nodes flagged as textually similar (embedding recall,
// computed client-side — see src/lib/claimFamilyClustering.js), decide
// whether they actually assert the SAME substantive proposition, restated
// or reworded, versus merely related, topically adjacent, or logically
// connected claims that must stay distinct. Recall casts a wide net; this
// pass is the real gate, and it is deliberately conservative: when
// uncertain, keep claims apart rather than merge them.

export function buildFamilyConfirmPrompt({ members }) {
  const memberList = members
    .map((m) => `- ${m.id} [${m.node_kind ?? "?"}]: ${m.text}${m.verbatim ? `\n  ציטוט: ${m.verbatim}` : ""}`)
    .join("\n");

  return `
להלן קבוצת טענות שסומנו כדומות מבחינה טקסטואלית (על סמך embedding). תפקידך: לקבוע אילו מהן הן למעשה
אותה טענה מהותית שחוזרת או מנוסחת מחדש, ואילו הן טענות נפרדות שיש להשאיר נבדלות.

**הטענות:**
${memberList}

---

כללים — היה שמרן, בספק אל תמזג:
- מזג רק כאשר הטענות טוענות את אותה פרופוזיציה מהותית, גם אם בניסוח שונה — לא רק אותו נושא.
  לדוגמה: "ההסכם הופר באי-תשלום" ו-"ההסכם הופר באיחור במסירה" הן טענות שונות, גם אם שתיהן "הפרת הסכם".
- אל תמזג טענות שהן תנאי-מוקדם או תוצאה זו של זו, גם אם קשורות עובדתית.
- שתי טענות הנשענות על אותן עובדות אך מבססות עילות או תיאוריות משפטיות שונות — אינן אותה טענה.
- node_kind הופק על-ידי אותו מודל וייתכן שאינו עקבי — node_kind שונה בין שתי טענות הוא סימן נגד מיזוג,
  אך לא סיבה מספקת כשלעצמה שלא למזג. מבחן הפרופוזיציה המהותית שלעיל הוא הקובע: אם שתי טענות אכן
  טוענות את אותה פרופוזיציה מהותית חרף node_kind שונה — מזג אותן, וציין זאת ב-rationale.
- כאשר קיים ספק סביר — אל תמזג. עדיף להשאיר טענה נפרדת מלמזג טענות שאינן זהות במהותן.

עבור הקבוצה שסופקה, חלק אותה למשפחות: כל טענה משתייכת למשפחה אחת בדיוק (גם אם היא לבדה במשפחה משלה).
כל מזהה טענה מהקלט חייב להופיע פעם אחת בדיוק במשפחות שתחזיר.
עבור כל משפחה, נמק בקצרה (rationale) — משפט אחד — מדוע חברי המשפחה הם אותה טענה (או, למשפחה בת יחיד
מתוך קבוצה, מדוע היא נשארה נפרדת מהאחרות בקבוצה).

החזר JSON בלבד:
{
  "families": [
    { "member_ids": ["C3", "C9"], "canonical_text": "ניסוח מנורמל אחד המייצג את הטענה המשותפת", "rationale": "משפט אחד קצר" }
  ]
}
`.trim();
}

export const FAMILY_CONFIRM_SYSTEM =
  "אתה עורך דין ישראלי בכיר בליטיגציה. תפקידך לקבוע אילו טענות בכתב טענות הן למעשה אותה טענה " +
  "מהותית שחוזרת, לעומת טענות נפרדות שדומות רק על פני השטח. היה שמרן — בספק, אל תמזג. " +
  "החזר JSON תקין בלבד.";
