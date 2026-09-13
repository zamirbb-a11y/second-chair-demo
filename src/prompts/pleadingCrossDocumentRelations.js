// Cross-document relations — conservative confirm gate, mirroring
// pleadingClaimFamilies.js's discipline exactly but across documents
// instead of within one: recall (embedding similarity, computed in
// src/lib/crossDocumentRelationMatching.js) proposes candidates from
// whatever prior pleading this document responds to; this prompt is the
// real, conservative decision — a candidate pair is textually similar
// doesn't mean it's actually the same point, actually answered, or
// actually in tension. Validated against a real complaint+defense pair
// before being wired into the pipeline.

const PARTY_LABELS = { claimant: "התובע", defendant: "הנתבע", third_party: "צד שלישי", unknown: "לא ידוע" };
const partyLabel = (party) => PARTY_LABELS[party] ?? party ?? "לא ידוע";

// Each candidate keeps its own document's party label — a candidate set
// can draw from more than one prior document (a document can respond to
// several), and those don't always share one party.
export function buildRelationConfirmPrompt({ currentFamily, currentParty, candidates }) {
  const candList = candidates.map((c) => `- ${c.id} (${partyLabel(c.party)}): "${c.text}"`).join("\n");
  return `
טענה נוכחית [${currentFamily.id}] (${currentParty}): "${currentFamily.text}"

טענות מועמדות מכתב הטענות הקודם שהמסמך הנוכחי עשוי להתייחס אליהן:
${candList}

---
לכל טענה מועמדת שיש לה קשר מהותי אמיתי לטענה הנוכחית, קבע:
- type: "responds_to" (הטענה הנוכחית עונה על הטענה הקודמת), "contradicts" (סותרת עמדה קודמת של אותו צד או טענה בעלת משמעות סותרת), "repeats" (אותו צד חוזר על אותה פרופוזיציה), "changed" (אותה טענה בסיסית אך עם שינוי מהותי - עובדה, תיאוריה משפטית, היקף)
- stance (רק עבור responds_to): קובע האם הטענה הנוכחית מסכימה עם התוצאה/המסקנה שהטענה המועמדת טוענת, או שוללת אותה — ללא קשר לאיזה צד "מרוויח" מכך:
  - "admits" — הטענה הנוכחית מסכימה עם המסקנה של הטענה המועמדת (גם אם מנוסחת אחרת)
  - "denies" — הטענה הנוכחית טוענת את ההפך ממש מהמסקנה של הטענה המועמדת
    דוגמה: טענה מועמדת "ההודעה אינה מבוססת" (כלומר: אינה תקפה) מול טענה נוכחית "ההודעה ניתנה כדין בשל הפרה יסודית"
    (כלומר: היא כן תקפה) — אלה מסקנות הפוכות, ולכן stance="denies", למרות שהטענה הנוכחית עצמה מנוסחת בחיוב.
  - "partial" — מסכימה עם חלק מהטענה המועמדת ושוללת חלק אחר
  - "talks_past" — עוסקת בנושא סמוך אך לא משיבה למסקנה עצמה
- confidence: "high" | "medium" | "low"
- rationale: משפט אחד קצר

אם אין קשר מהותי אמיתי לאף מועמד — החזר מערך ריק. אל תיצור קשר רק כי שתי טענות עוסקות באותו נושא —
הן חייבות להיות אכן קשורות מהותית (תשובה, סתירה, חזרה, שינוי).

חשוב: target_id חייב להיות בדיוק אחד המזהים שהופיעו ברשימת הטענות המועמדות למעלה (למשל "F3"),
ללא כל טקסט נוסף, סוגריים, או תיאור מצורף.

החזר JSON בלבד:
{ "relations": [ { "target_id": "F3", "type": "responds_to", "stance": "denies", "confidence": "high", "rationale": "..." } ] }
`.trim();
}

export const RELATION_CONFIRM_SYSTEM =
  "אתה עורך דין ישראלי בכיר בליטיגציה. תפקידך לזהות את הקשר בין טענה בכתב טענות נוכחי לבין טענות " +
  "שעלו בכתב טענות קודם באותו תיק. היה שמרן: אם אין קשר מהותי אמיתי, החזר מערך ריק. " +
  "החזר JSON תקין בלבד.";

export function buildNotAddressedPrompt({ candidates, currentFamiliesSummary }) {
  return `
להלן טענות מכתב הטענות הקודם שלא נמצא להן התאמה ברורה בכתב הטענות הנוכחי (בבדיקה ראשונית):
${candidates.map((c) => `- ${c.id}: "${c.text}"`).join("\n")}

להלן רשימת כל הטענות בכתב הטענות הנוכחי (לבדיקה חוזרת, למקרה שיש מענה עקיף שלא אותר):
${currentFamiliesSummary.map((c) => `- ${c.id}: "${c.text}"`).join("\n")}

לכל טענה מהרשימה הראשונה, קבע אם היא אכן ללא מענה, או שכן קיים לה מענה עקיף שלא אותר.

החזר JSON בלבד:
{ "results": [ { "id": "A5", "confirmed_not_addressed": true, "confidence": "high", "rationale": "..." } ] }
`.trim();
}

export const NOT_ADDRESSED_SYSTEM =
  "אתה עורך דין ישראלי בכיר בליטיגציה, מבצע בדיקה סופית: האם טענות מהותיות מכתב טענות קודם " +
  "נותרו ללא כל מענה בכתב הטענות הנוכחי. היה זהיר - טענה יכולה לקבל מענה עקיף או במקום לא צפוי. " +
  "החזר JSON תקין בלבד.";
