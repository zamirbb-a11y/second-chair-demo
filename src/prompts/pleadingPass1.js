// Pass 1 — document skeleton: theory of case + level-1 claims only.
// No QA, no sub-claims. Fast pass so the UI can render structure early.

const DOC_TYPE_LABELS = {
  statement_of_claim:   "כתב תביעה",
  statement_of_defense: "כתב הגנה",
  reply:                "כתב תשובה",
  motion:               "בקשה",
  response:             "תגובה",
  other:                "כתב טענות",
};

const PARTY_LABELS = {
  claimant:    "התובע",
  defendant:   "הנתבע",
  third_party: "צד שלישי",
  unknown:     "לא ידוע",
};

export function buildPass1Prompt({ pleadingText, docType, party }) {
  const docLabel = DOC_TYPE_LABELS[docType] ?? DOC_TYPE_LABELS.other;
  const partyLabel = PARTY_LABELS[party] ?? PARTY_LABELS.unknown;

  return `
אתה מפרק ${docLabel} שהוגש מטעם ${partyLabel} למפת טענות מובנית.

**המסמך המלא:**
${pleadingText}

---

המשימה — שלב ראשון בלבד (שלד):
1. זהה את תיאוריית המקרה: מה כתב הטענות מנסה לבסס, ב-2-3 משפטים.
2. חלץ את כל הטענות הראשיות (level 1) — טענות מהותיות בלבד, לא כותרות פרקים ולא רקע דיוני.
3. לכל טענה: ניסוח מנורמל, ציטוט מקור, סיווג, ומיקום במסמך.

כללים חיוניים:
- כיסוי מלא: עבור פסקה-פסקה. אף טענה מהותית לא נשמטת.
- דה-דופליקציה: אם אותה טענה מופיעה בכמה מקומות במסמך — צור צומת אחד עם כמה source_spans, לא כמה צמתים.
- טענות חלופיות: אם המסמך אומר "לחלופין" / "גם אם ייקבע ש..." — סמן relationship_type: "alternative" וציין ב-related_ids את הטענה שהיא חלופה לה.
- verbatim: ציטוט ישיר או פרפרזה צמודה השומרת על הניסוח המקורי.
- excerpt ב-source_spans: טקסט אמיתי מהמסמך, מילה במילה — לא פרפרזה. עד 300 תווים לקטע.
- התייחס לכל טענה עובדתית כנטענת, לא כמוכחת.

סיווג node_kind — התפקיד המשפטי-פונקציונלי של הצומת (בנוסף ל-type). בחר את הערך הספציפי ביותר:
- "main_claim" — עילת תביעה/הגנה מרכזית שהמסמך בנוי סביבה
- "factual_allegation" — טענה עובדתית
- "legal_proposition" — קביעה משפטית (פרשנות דין, הלכה)
- "contractual_interpretation" — פרשנות הוראה חוזית
- "denial" — הכחשה של טענת הצד שכנגד
- "remedy" — סעד מבוקש ("אשר על כן מתבקש...")
- "damages" — כימות נזק
- "procedural" — טענת סף או טענה דיונית
- "alternative" — טענה חלופית ("לחלופין")
- "background" — רקע שאינו טענה מהותית
- "conclusion" — סיכום
חשוב: פסקת סעד (remedy) ורקע (background) אינם טענות רגילות — סווג אותם נכון כדי שלא יעברו ביקורת ראייתית מלאה.

החזר JSON בלבד במבנה הבא:

{
  "document": {
    "type": "${docType}",
    "party": "${party}",
    "title": "כותרת המסמך כפי שמופיעה בו, או null"
  },
  "theory_of_case": "2-3 משפטים",
  "claims": [
    {
      "id": "C1",
      "level": 1,
      "parent_id": null,
      "related_ids": [],
      "relationship_type": null,
      "text": "ניסוח מנורמל של הטענה",
      "verbatim": "ציטוט/פרפרזה צמודה",
      "type": "factual | legal | mixed",
      "node_kind": "main_claim | factual_allegation | legal_proposition | contractual_interpretation | denial | remedy | damages | procedural | alternative | background | conclusion",
      "what_it_establishes": "מה הוכחת הטענה משיגה במארג הטיעון הכולל",
      "source_spans": [
        { "excerpt": "טקסט מדויק מהמסמך", "section_label": "שם הפרק/הסעיף או null", "paragraph": 12, "is_primary": true }
      ]
    }
  ],
  "coverage_notes": "חלקים במסמך שהיו עמומים או קשים למיפוי, או null"
}
`.trim();
}

export const PASS1_SYSTEM =
  "אתה עורך דין ישראלי בכיר בליטיגציה. אתה מפרק כתבי טענות למפת טענות מובנית, מדויקת וממוסמכת. החזר JSON תקין בלבד.";
