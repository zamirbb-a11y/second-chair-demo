// Internal coverage audit — verifies the claim-based output did not miss
// substantive material. Not a UI feature: the mapping table is logged,
// only warnings surface via coverage_notes.
//
// Also the one place in the pipeline that reads the document as a WHOLE
// rather than one claim at a time (Pass 2 never sees more than the
// section around one claim) — so it's the natural place for structural
// checks the research memo flagged as whole-document, not per-claim:
// missing jurisdictional facts, a remedy with no factual basis anywhere
// in the body (or vice versa), and inconsistency between the summary and
// detailed sections. Scoped to complaint/defense (pleading-stage docs) —
// the underlying rules (תקנה 11, the tripartite structure) are specific
// to that stage; see docs/stage2-document-type-rules.md §1-2.

const STRUCTURAL_CHECK_DOC_TYPES = new Set(["statement_of_claim", "statement_of_defense", "reply"]);

function buildStructuralCheckBlock(docType) {
  const isOriginatingComplaint = docType === "statement_of_claim";
  return `
**בדיקה מבנית נוספת (בנוסף למיפוי הכיסוי):**
${isOriginatingComplaint ? `1. עובדות סמכות שיפוט (עניינית/מקומית) — האם המסמך מציין עובדות המבססות את סמכות בית המשפט? אם לא — ציין זאת ב-warnings.\n` : ""}2. התאמת סעדים לתשתית עובדתית — עבור כל טענה מסוג remedy (סעד מבוקש), האם קיימת בגוף המסמך טענה עובדתית התומכת בו? האם יש טענה עובדתית המצביעה על סעד שלא נמנה כלל? ציין אי-התאמות ב-warnings.
3. עקביות פנימית — האם קיימת סתירה של ממש בין חלקים שונים של המסמך (עובדות או ציר זמן שונים המתוארים באופן לא עקבי)? ציין רק סתירות ממשיות, לא ניסוחים שונים של אותו דבר.
**אל תציין מספר תקנה בניסוח האזהרה** — תאר את הפער במילים בלבד; ציטוט מספר תקנה שגוי גרוע יותר מאי-ציון מספר כלל.
`;
}

export function buildCoverageAuditPrompt({ pleadingText, nodes, docType }) {
  const nodeIndex = nodes
    .map((n) => `${n.id} [${n.node_kind ?? n.kind ?? "?"}] ${n.text?.slice(0, 100) ?? n.label ?? ""}`)
    .join("\n");
  const structuralBlock = STRUCTURAL_CHECK_DOC_TYPES.has(docType) ? buildStructuralCheckBlock(docType) : "";

  return `
בוצע פירוק של כתב הטענות הבא למפת טענות ואסמכתאות. תפקידך: ביקורת כיסוי — לוודא שלא נשמט חומר מהותי.

**המסמך המלא:**
${pleadingText}

**הצמתים שחולצו (טענות, אסמכתאות, ראיות):**
${nodeIndex}

---

המשימה:
1. מפה את המסמך: זהה את כל הפרקים/הסעיפים והפסקאות הממוספרות.
2. לכל מקטע — קבע לאילו צמתים הוא ממופה (לפי תוכן, לא רק לפי ציטוט).
3. אתר מקטעים עם חומר מהותי שלא שויך לאף צומת (טענה, אסמכתא או ראיה).
4. בדוק אם צומת שסווג כ-background או remedy מכיל בפועל טענה מהותית שראויה לצומת נפרד.
${structuralBlock}
כללים:
- "חומר מהותי" = טענה, עובדה נטענת, אסמכתא, ראיה או כימות שיש להם משמעות משפטית. כותרות, פרטי צדדים ונוסחאות סיום אינם מהותיים.
- אל תמציא: אם המסמך מכוסה היטב — החזר מערכים ריקים.
- warnings: משפטים קצרים בעברית, מנוסחים לעורך דין.

החזר JSON בלבד:

{
  "section_map": [
    { "section": "פרק ב — הפרת חובת תום הלב", "paragraphs": "4-7", "mapped_node_ids": ["C4", "A2"], "substantive": true }
  ],
  "unmapped_substantive": [
    { "section": "", "paragraphs": "", "excerpt": "טקסט קצר מהמקטע שלא מופה", "reason": "מדוע זה חומר מהותי" }
  ],
  "misclassification_flags": [
    { "claim_id": "C9", "current_kind": "background", "note": "מדוע ייתכן שמדובר בטענה מהותית" }
  ],
  "warnings": ["אזהרה קצרה בעברית, רק אם רלוונטית"]
}
`.trim();
}

export const AUDIT_SYSTEM =
  "אתה מבצע ביקורת כיסוי פנימית על פירוק של כתב טענות. אתה בודק שלמות מיפוי, לא מנתח מחדש. דייק, אל תמציא, והחזר JSON תקין בלבד.";

// Targeted recheck: bounded follow-up extraction over the unmapped
// sections only. Returns claims in the Pass 1 shape, ids continuing
// from the existing sequence.
export function buildCoverageRecheckPrompt({ pleadingText, unmapped, existingClaims, nextIdNumber }) {
  const unmappedDesc = unmapped
    .map((u) => `- ${u.section ?? ""} פסקאות ${u.paragraphs ?? "?"}: ${u.excerpt ?? ""} (${u.reason ?? ""})`)
    .join("\n");
  const existing = existingClaims.map((c) => `${c.id}: ${c.text}`).join("\n");

  return `
בביקורת כיסוי של פירוק כתב טענות זוהו מקטעים עם חומר מהותי שלא שויך לאף טענה. חלץ את הטענות החסרות מאותם מקטעים בלבד.

**המסמך המלא (להקשר):**
${pleadingText}

**המקטעים שלא מופו:**
${unmappedDesc}

**טענות שכבר חולצו (אל תשכפל אותן):**
${existing}

כללים:
- חלץ טענות רק מהמקטעים שלא מופו. אם החומר שם כבר מכוסה על ידי טענה קיימת — אל תחזיר דבר.
- מזהים: התחל מ-C${nextIdNumber} והמשך ברצף.
- אותו מבנה, אותם כללים כמו בחילוץ המקורי, כולל node_kind ו-source_spans עם ציטוטים מדויקים.

החזר JSON בלבד:
{
  "claims": [
    {
      "id": "C${nextIdNumber}",
      "level": 1,
      "parent_id": null,
      "related_ids": [],
      "relationship_type": null,
      "text": "",
      "verbatim": "",
      "type": "factual | legal | mixed",
      "node_kind": "main_claim | factual_allegation | legal_proposition | contractual_interpretation | denial | remedy | damages | procedural | alternative | background | conclusion",
      "what_it_establishes": "",
      "source_spans": [ { "excerpt": "", "section_label": null, "paragraph": null, "is_primary": true } ]
    }
  ]
}

אם אין טענות חסרות — החזר {"claims": []}.
`.trim();
}
