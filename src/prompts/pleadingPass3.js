// Pass 3 — deduplicate and normalize authorities, evidence refs, and
// quotations collected across all Pass 2 calls, merging claim_ids.

export function buildPass3Prompt({ rawAuthorities, rawEvidenceRefs, rawQuotations }) {
  return `
לפניך אסמכתאות, ראיות וציטוטים שחולצו מכתב טענות בכמה ריצות נפרדות (אחת לכל טענה ראשית). אותה אסמכתא עשויה להופיע כמה פעמים — פעם לכל טענה שציטטה אותה.

**אסמכתאות גולמיות:**
${JSON.stringify(rawAuthorities, null, 2)}

**ראיות גולמיות:**
${JSON.stringify(rawEvidenceRefs, null, 2)}

**ציטוטים גולמיים:**
${JSON.stringify(rawQuotations, null, 2)}

---

המשימה:
1. אחד כפילויות: פריטים המתייחסים לאותה אסמכתא/ראיה/ציטוט מתמזגים לפריט אחד, עם claim_ids ממוזגים (ללא כפילויות) ועם כל ה-source_spans.
2. נרמל ציטוטי אסמכתאות: normalized_citation בפורמט ציטוט ישראלי מקובל אם ניתן, אחרת null. אל תמציא פרטים שאינם ב-raw_citation.
3. שמור על raw_citation בדיוק כפי שהופיע (אם גרסאות שונות — בחר את המלאה ביותר).
4. הקצה מזהים: A1, A2... לאסמכתאות; E1, E2... לראיות; Q1, Q2... לציטוטים.

החזר JSON בלבד:

{
  "authorities": [
    {
      "id": "A1",
      "type": "case | statute | regulation | legal_principle",
      "raw_citation": "",
      "normalized_citation": "או null",
      "proposition": "",
      "verbatim_quote": "או null",
      "claim_ids": ["C1", "C2.1"],
      "source_spans": [ { "excerpt": "", "section_label": null, "paragraph": null, "is_primary": true } ]
    }
  ],
  "evidence_refs": [
    {
      "id": "E1",
      "type": "document | witness | expert_opinion | correspondence | physical | other",
      "label": "",
      "description": "",
      "claim_ids": [],
      "source_spans": []
    }
  ],
  "quotations": [
    {
      "id": "Q1",
      "text": "",
      "source_description": "",
      "claim_ids": [],
      "source_spans": []
    }
  ]
}
`.trim();
}

export const PASS3_SYSTEM =
  "אתה עוזר משפטי המאחד ומנרמל רשימות אסמכתאות, ראיות וציטוטים. אל תמציא פרטים. החזר JSON תקין בלבד.";
