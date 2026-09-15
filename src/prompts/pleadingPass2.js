// Pass 2 — per-claim deep analysis: sub-claims, QA, source links,
// raw authority/evidence/quotation extraction. One call per main claim,
// run in parallel by the API handler.

import { STAGE_PROFILES, stageProfileForDocType, stageForDocType, INTERIM_RELIEF_APPLICABLE_STAGES } from "../lib/documentStageProfiles.js";

// Same claim, three different verdicts depending on what stage the
// document analyzed is at — this is the fix for the reported bug where
// "no evidence cited" was flagged as a weakness even in a complaint or
// defense. See src/lib/documentStageProfiles.js for the [VERIFIED] /
// [PRODUCT JUDGMENT] sourcing behind each standard.
const EVIDENTIARY_STANDARD_BLOCKS = {
  not_required: `
**רמת הציפייה הראייתית בשלב זה: כתב טענות (תביעה/הגנה/תשובה) — אין חובת הוכחה.**
בשלב זה הצד טוען עובדות; אינו נדרש להוכיח אותן בגוף כתב הטענות עצמו. לכן:
- אסור לרשום "הטענה נשענת על הצהרת הטוען בלבד" או ניסוח דומה כ-weakness. זהו המצב התקין והצפוי בכתב טענות, לא חולשה.
- אסור לרשום היעדר ראיה, עדות, חוות דעת או אסמכתא חיצונית כ-missing, אלא אם המסמך עצמו מפנה לראיה או נספח קונקרטי וזה חסר מההקשר שסופק.
- evidence_gap יישאר false כברירת מחדל בשלב זה, גם כאשר הטענה איננה מגובה בשום ראיה — זהו שלב הטענות, לא שלב ההוכחה. (authority_gap נדון בנפרד למטה, תחת "דרישת אסמכתאות משפטיות".)
- יוצא מן הכלל היחיד: אם הטענה מסתמכת על "מסמך מהותי" (חוזה, פוליסה, ערבות, נסח טאבו וכיו"ב) שהמסמך עצמו מזכיר אך אינו מצרף ואינו מסביר מדוע — זו חולשה אמיתית וספציפית (חובת צירוף מסמכים מהותיים), לא היעדר ראייתי כללי.
  **אל תציין מספר תקנה ספציפי (למשל "תקנה 15" או כל מספר אחר) בניסוח החולשה — תאר את החובה במילים בלבד, בלי לצטט מספור שלא סופק לך כאן. ציטוט מספר תקנה שגוי גרוע יותר מאי-ציון מספר כלל.**`,
  affidavit_required: `
**רמת הציפייה הראייתית בשלב זה: בקשה/תגובה/תשובה לתגובה — נדרש תצהיר.**
בניגוד לכתב טענות רגיל, טענה עובדתית בבקשה או בתגובה לה אמורה להיות מאומתת בתצהיר. לכן כאן, בניגוד לכתב תביעה/הגנה:
- טענה עובדתית מהותית ללא תצהיר התומך בה, או תצהיר כללי/גורף שאינו מאמת את הפרטים הקונקרטיים הנטענים בגוף הבקשה, כן מהווה weakness אמיתית — ציין זאת במפורש.
- evidence_gap: true כאשר טענה עובדתית מהותית בבקשה נטענת ללא תצהיר תומך.`,
  record_required: `
**רמת הציפייה הראייתית בשלב זה: סיכומים — נדרשת עגינה בתיק הראיות.**
בשלב הסיכומים ההליך הראייתי כבר ננעל. טענה עובדתית מרכזית שאין לה כל עיגון בתיק הראיות (לא עדות, לא מוצג, לא הודאה) היא חולשה אמיתית — לא מפני שהצד לא ניסח אותה כראוי, אלא מפני שההזדמנות הראייתית חלפה. ציין זאת כ-weakness וכ-missing לפי ההקשר.`,
  is_foundational_evidence: `
**רמת הציפייה הראייתית בשלב זה: תצהיר — המסמך עצמו הוא הראיה.**
בניגוד לכל שאר סוגי המסמכים, תצהיר אינו טוען עובדות שצריכות ביסוס חיצוני — הוא *עצמו* הביסוס. לכן:
- אסור לרשום "אין ביסוס ראייתי חיצוני" כ-weakness — זה לא רלוונטי לתצהיר.
- במקום זאת, הבדיקה המרכזית: האם מקור הידיעה של המצהיר ברור (ידיעה אישית, לעומת שמועה/ידיעת-זולת ללא ציון מקור)? טענה עובדתית בתצהיר ללא ציון מקור ידיעה ברור — זו חולשה אמיתית.
- קביעה משפטית או מסקנה המנוסחת כעובדה (למשל "הנתבע פעל בזדון") ולא כתיאור עובדתי ישיר שהמצהיר יכול להעיד עליו מידיעה אישית — זו חולשה, יש לסמן זאת.
- evidence_gap: true כאשר טענה עובדתית מהותית בתצהיר נטענת ללא ציון מקור ידיעה.`,
};

// [PRODUCT JUDGMENT — well-established Israeli interim-relief doctrine,
// not a specific verified regulation — see documentStageProfiles.js].
// Appended, not swapped in: an interim-relief motion/affidavit still
// gets its base evidentiary-standard block above, plus this.
const INTERIM_RELIEF_BLOCK = `
**בקשה/תצהיר לסעד זמני — בדיקה מהותית נוספת:**
בקשות לסעד זמני נבחנות (לפי הדין הישראלי המבוסס, לא תקנה ספציפית) גם לפי: (א) סיכויי ההליך העיקרי — האם קיימת זכות לכאורה; (ב) מאזן הנוחות — הנזק היחסי לכל צד אם הסעד יינתן/יידחה; (ג) תום לב/ניקיון כפיים של המבקש; (ד) דחיפות ונזק בלתי הפיך אם לא יינתן הסעד. אם הטענה הנבחנת אמורה לשאת חלק מהתשתית לאחד המרכיבים האלה אך אינה עושה זאת בפועל (למשל, טוענת דחיפות בלי לבסס אותה, או מתעלמת ממאזן הנוחות) — ציין זאת כ-weakness. אל תמציא רכיב שאינו רלוונטי לטענה הנבחנת.
`;

// Independent of the evidentiary-standard axis above — see
// documentStageProfiles.js's authorityStandard comment. A complaint,
// defense, reply, or affidavit states facts and is not where legal
// argument backed by citation happens; a motion/response/reply-to-
// response or summations is.
const AUTHORITY_STANDARD_BLOCKS = {
  not_required: `
**דרישת אסמכתאות משפטיות בשלב זה: אינה נדרשת.**
בכתב תביעה/הגנה/תשובה, וכן בתצהיר, אין חובה לתמוך קביעה משפטית באסמכתא (פסיקה, חקיקה או עיקרון משפטי). לכן:
- authority_gap יישאר false כברירת מחדל בשלב זה, גם כאשר מופיעה קביעה משפטית ללא אסמכתא.
- אסור לרשום "הקביעה המשפטית אינה נתמכת באסמכתא" כ-weakness או כ-missing — זהו המצב התקין והצפוי בשלב זה, לא חולשה.`,
  required: `
**דרישת אסמכתאות משפטיות בשלב זה: נדרשת.**
בבקשה/תגובה/תשובה לתגובה, וכן בסיכומים, קביעה משפטית מהותית ללא כל אסמכתא (פסיקה, חקיקה או עיקרון משפטי מבוסס) מהווה חולשה אמיתית. authority_gap: true כאשר קביעה משפטית מהותית מופיעה ללא אסמכתא.`,
};

export function buildPass2Prompt({ claim, sectionText, otherClaimsSummary, theoryOfCase, docType, isInterimRelief = false }) {
  const stageProfile = stageProfileForDocType(docType) ?? STAGE_PROFILES.unknown;
  const evidentiaryBlock = EVIDENTIARY_STANDARD_BLOCKS[stageProfile.evidentiaryStandard] ?? EVIDENTIARY_STANDARD_BLOCKS.not_required;
  const authorityBlock = AUTHORITY_STANDARD_BLOCKS[stageProfile.authorityStandard] ?? AUTHORITY_STANDARD_BLOCKS.not_required;
  const interimReliefBlock = isInterimRelief && INTERIM_RELIEF_APPLICABLE_STAGES.has(stageForDocType(docType)) ? INTERIM_RELIEF_BLOCK : "";
  return `
סוג המסמך הנבחן: ${stageProfile.label}
${evidentiaryBlock}
${authorityBlock}
${interimReliefBlock}

אתה מבצע ביקורת עומק על טענה אחת מתוך כתב טענות.

**תיאוריית המקרה — מה כתב הטענות מנסה להשיג (השאלה המבצעית):**
${theoryOfCase ?? "(לא סופקה)"}

**הטענה הנבחנת:**
מזהה: ${claim.id}
ניסוח: ${claim.text}
ציטוט מקור: ${claim.verbatim}
סיווג: ${claim.type}

**קטעי המסמך הרלוונטיים לטענה זו:**
${sectionText}

**שאר הטענות הראשיות במסמך (הקשר בלבד — אל תנתח אותן):**
${otherClaimsSummary}

---

המשימה:
1. פרק את הטענה לתתי-טענות (level 2) אם היא מורכבת מכמה רכיבים הניתנים להוכחה בנפרד. אם היא אטומית — החזר מערך ריק.
2. בצע ביקורת (QA) על הטענה: מה תומך בה, מה מחליש אותה, מה חסר.
3. חלץ את כל האסמכתאות (פסיקה/חקיקה), הראיות והציטוטים שהמסמך קושר לטענה זו.

**גבול חד בין weaknesses ל-missing — אל תשכפל ביניהם:**
- weaknesses = חולשות שמקורן במה שכתוב במסמך: סתירה פנימית, הודאה של הטוען (למשל "הערכה מקורבת"), ניסוח גורף, פער בין הנטען למצוטט. אסור לרשום היעדרים ("לא צורף/לא צורפה...") כ-weakness.
- missing = פריטים ספציפיים שנעדרים (ראיה, אסמכתא, תצהיר). כל היעדר מופיע כאן בלבד, פעם אחת.
- האם "הסתמכות על הצהרת הטוען בלבד, ללא עיגון חיצוני" מהווה weakness תלוי לגמרי ברמת הציפייה הראייתית שהוגדרה למעלה עבור סוג המסמך הנוכחי — ראה שם. אל תפעיל כלל ראייתי אחיד בלי תלות בסוג המסמך.

**כלל האכיפה המרכזי — ספציפיות:**
כל פריט ב-supported_by, weaknesses ו-missing חייב אחד מהשניים:
(א) לצטט טקסט ספציפי מהמסמך שמבסס את ההערה, או
(ב) לנקוב בפריט ספציפי שנעדר וניתן לצפות שיהיה (למשל: "לא צורף אישור בנקאי המאמת את מועד הקבלה בפועל").
אמירות גנריות כמו "ראיה נוספת תחזק את הטענה" הן כשל — אסור להחזיר אותן.

**שני מבחני עומק — חובה לענות עליהם בשדה relevance_check:**
1. מבחן הרלוונטיות: הנח שהטענה נכונה במלואה — מה בדיוק היא תורמת לשאלה המבצעית (הסעד המבוקש או ההגנה מפניו)? ענה במשפט אחד ישיר. טענה משפטית יכולה להיות נכונה כשלעצמה ותרומתה לשאלה המבצעית אפסית — למשל, דוקטרינה על טיב הזכות כשהמחלוקת האמיתית היא על היקף הזכות או על גבולותיה. אם התרומה חלקית או אפסית — אמור זאת במפורש, וזו נקודת התורפה המרכזית וגם קו טיעון מוצע.
2. מבחן מישור הפעולה: אם הטענה נשענת על הסדר חוזי, תניה, מצג או ידיעה — נקוב במפורש מי הצדדים לאותו הסדר, ובדוק: האם הצד שמסתמך על ההסדר הוא בכלל צד לו? תניה חוזית (למשל תניית as is בהסכם רכישה) פועלת במישור היחסים שבין הצדדים לאותו חוזה בלבד — היא אינה יוצרת זכויות לטובת זר לחוזה ואינה מכשירה את התנהגותו. אם צד זר לחוזה מבקש להיבנות מתניה שבו — כתוב זאת במפורש ב-relevance_check וגזור מכך קו טיעון.

**הצעה אסטרטגית — אופציונלי, אל תאלץ:**
- key_vulnerability: נקודת התורפה המרכזית של הטענה — המשפט האחד שאם תוקפים אותו, הטענה נחלשת מהותית. חד וממוקד. עדיף null מאשר תורפה שולית: מלא רק אם התורפה מהותית באמת, כזו שעורך דין היה מסמן בעצמו. אל תמציא תורפה כדי למלא את השדה, ואל תנסח מחדש weakness קיימת בלי ערך מוסף.
- suggested_arguments: עד 3 קווי טיעון קונקרטיים שניתן לטעון מול הטענה, כל אחד מעוגן בטקסט המסמך או בהיעדר ספציפי. נסח כקו טיעון של עורך דין ("ניתן לטעון כי..."), לא כהערה כללית. רק קווי טיעון בעלי משקל ממשי — אם אין, החזר מערך ריק.
- אל תשכפל: אם התורפה או קו הטיעון של תת-טענה זהים לאלה של טענת-האם, מלא אותם רק ברמה אחת (הרלוונטית יותר) והשאר null/ריק בשנייה.

**נספחים — כלל חשוב:**
ניתוח זה מקבל את גוף כתב הטענות בלבד, ללא הנספחים. נספח שהמסמך מפנה אליו (למשל "מצ"ב נספח 3") קיים בתיק — הוא פשוט לא נותח כאן. לכן:
- אל תרשום "לא צורף נספח X" כ-weakness או כ-missing כאשר המסמך מפנה לנספח. זו אינה חולשה של כתב הטענות.
- במקום זאת, רשום ב-annexes_to_review את הנספחים שתוכנם נושא את משקל הטענה וראוי לבחון אותם כדי לוודא את התמיכה (למשל: "נספח 1 — הסכם החכירה: לוודא שהתשריט תוחם את שטחי החכירה כנטען").
- weakness לגבי ראיות כפופה לרמת הציפייה הראייתית שהוגדרה למעלה: בכתב טענות רגיל היעדר ראייתי כללי אינו weakness כלל (למעט מסמך מהותי שהוזכר ולא צורף); בבקשה/סיכומים כן ייתכן שיהיה.
- evidence_gap: בכתב טענות (not_required) נשאר false כברירת מחדל. בבקשה/סיכומים: true כאשר אין כל עיגון (תצהיר/ראיה/עדות לפי ההקשר) לטענה עובדתית מהותית — לא כאשר נספח קיים אך לא נותח כאן.

כללים נוספים:
- בדיקת כיסוי: עבור על כל פסקה בקטעים שסופקו וודא שכל תת-טענה מהותית נקלטה.
- התייחס לכל טענה עובדתית כנטענת, לא כמוכחת. אם עובדה נטענת ללא ביסוס — זו weakness.
- authority_gap: ראה "דרישת אסמכתאות משפטיות בשלב זה" למעלה — תלוי לגמרי בסוג המסמך הנוכחי.
- excerpt ב-source_spans: טקסט מדויק מהמסמך, עד 300 תווים.
- אסמכתאות: raw_citation בדיוק כפי שמופיע במסמך.

החזר JSON בלבד:

{
  "claim_id": "${claim.id}",
  "sub_claims": [
    {
      "id": "${claim.id}.1",
      "level": 2,
      "parent_id": "${claim.id}",
      "related_ids": [],
      "relationship_type": null,
      "text": "",
      "verbatim": "",
      "type": "factual | legal | mixed",
      "node_kind": "factual_allegation | legal_proposition | contractual_interpretation | denial | damages | procedural | alternative",
      "what_it_establishes": "",
      "source_spans": [ { "excerpt": "", "section_label": null, "paragraph": null, "is_primary": true } ],
      "qa": {
        "supported_by": [], "weaknesses": [], "missing": [],
        "logical_gap": null, "unstated_assumption": null,
        "relevance_check": null, "key_vulnerability": null, "suggested_arguments": [], "annexes_to_review": [],
        "evidence_gap": false, "authority_gap": false, "logical_gap_flag": false
      }
    }
  ],
  "qa": {
    "supported_by": ["פריט ספציפי המעוגן בטקסט המסמך"],
    "weaknesses": ["חולשה ספציפית עם עיגון בטקסט"],
    "missing": ["פריט ספציפי שנעדר"],
    "logical_gap": "פער לוגי בשרשרת הטיעון, או null",
    "unstated_assumption": "הנחה סמויה שהטענה נשענת עליה, או null",
    "relevance_check": "חובה: בהנחה שהטענה נכונה במלואה — מה היא תורמת לשאלה המבצעית, כלפי מי היא פועלת, והאם התרומה מלאה/חלקית/אפסית. משפט אחד-שניים ישירים.",
    "key_vulnerability": "נקודת התורפה המרכזית במשפט אחד, או null",
    "suggested_arguments": ["קו טיעון קונקרטי שניתן לטעון מול הטענה — עד 3, או מערך ריק"],
    "annexes_to_review": ["נספח X — שם/תיאור: מה לבדוק בו ביחס לטענה זו, או מערך ריק"],
    "evidence_gap": false,
    "authority_gap": false,
    "logical_gap_flag": false
  },
  "source_spans": [ { "excerpt": "", "section_label": null, "paragraph": null, "is_primary": true } ],
  "authorities": [
    {
      "type": "case | statute | regulation | legal_principle",
      "raw_citation": "כפי שמופיע במסמך",
      "proposition": "לשם מה האסמכתא מצוטטת",
      "verbatim_quote": "אם צוטטה ישירות, אחרת null",
      "source_spans": [ { "excerpt": "", "section_label": null, "paragraph": null, "is_primary": true } ]
    }
  ],
  "evidence_refs": [
    {
      "type": "document | witness | expert_opinion | correspondence | physical | other",
      "label": "כפי שמכונה במסמך: נספח א׳, חוזה ההתקשרות",
      "description": "",
      "source_spans": [ { "excerpt": "", "section_label": null, "paragraph": null, "is_primary": true } ]
    }
  ],
  "quotations": [
    {
      "text": "",
      "source_description": "מה מצוטט: סעיף חוזה, פסק דין",
      "source_spans": [ { "excerpt": "", "section_label": null, "paragraph": null, "is_primary": true } ]
    }
  ]
}

אם אין פריטים בקטגוריה — החזר מערך ריק.
`.trim();
}

export const PASS2_SYSTEM =
  "אתה עורך דין ישראלי בכיר המבצע ביקורת עומק (QA) על טענות בכתב טענות. כל הערה חייבת עיגון ספציפי בטקסט המסמך או בהיעדר ספציפי הניתן לזיהוי. אמירות גנריות אסורות. החזר JSON תקין בלבד.";

// Compact one-line-per-claim context block for Pass 2 calls
export function summarizeOtherClaims(claims, excludeId) {
  return claims
    .filter((c) => c.id !== excludeId)
    .map((c) => `${c.id}: ${c.text}`)
    .join("\n") || "(אין)";
}
