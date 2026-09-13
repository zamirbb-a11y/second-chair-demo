// Formal/צורני checks for .docx drafts — fully deterministic, no AI call.
// A .docx stores font, margins, page size, and line spacing as explicit
// values in its own XML (word/document.xml, word/styles.xml,
// docProps/app.xml) — this reads them directly and compares against two
// real sources, so nothing here is inferred or at risk of a wrong
// citation the way a model-generated answer would be.
//
// Deliberately does NOT attempt spelling/grammar — Word already owns
// that while the lawyer drafts; duplicating it adds no value. This is
// the "central" layer the user asked to prioritize: the requirements
// actually written into the Regulations and the Courts Administration's
// own format notice, not general writing quality.
//
// Sources:
// [VERIFIED — הודעת מנהל בתי המשפט בדבר צורת מסמך ומבנהו, כ"ו תמוז
// תשפ"ה (22.7.2025), מכוח תקנות 31 ו-175 לתקנות סדר הדין האזרחי,
// תשע"ט-2018 — read in full this session, supplied by the user]:
// paper size, margins, font, line spacing, page/appendix numbering.
// [VERIFIED — see docs/stage2-document-type-rules.md]: page limits per
// document type (תקנה 18(ב), תקנה 50), tripartite structure (תקנה 9(ג)).

export const FORMAT_REQUIREMENTS = {
  paperSize: { widthMm: 210, heightMm: 297, label: "A4" }, // הודעת מנהל בתי המשפט §1(1)
  marginCm: 2.5, // כל צד, כולל עליון ותחתון — §1(2)
  allowedFonts: ["david", "רעננה", "rananah", "calibri"], // §1(3) — lowercased for matching
  bodyFontSizePt: 12, // §1(3)
  headingFontSizePt: 14, // §1(3) — headings only, same fonts
  lineSpacingMultiplier: 1.5, // "שורה וחצי" — §1(3)
  // Ordinary / interim-relief page limits — same table as formalChecks.js
  // (the PDF-side equivalent), kept in sync deliberately.
  pageLimits: {
    reply: { ordinary: 3, interimRelief: 3 },
    motion: { ordinary: 5, interimRelief: 8 },
    response: { ordinary: 5, interimRelief: 8 },
    affidavit: { ordinary: 3, interimRelief: 6 },
  },
};

const TWIPS_PER_CM = 566.929;
const TWIPS_PER_MM = 56.6929;

// Runs in the browser (Layer A needs no server round-trip — it's pure,
// deterministic parsing of the file the lawyer just picked) using the
// native global DOMParser there; falls back to @xmldom/xmldom in Node
// (test/validation scripts, and any future server-side reuse).
async function getDOMParser() {
  if (typeof DOMParser !== "undefined") return DOMParser;
  return (await import("@xmldom/xmldom")).DOMParser;
}

async function readXml(zip, path) {
  const file = zip.file(path);
  if (!file) return null;
  const Parser = await getDOMParser();
  const text = await file.async("string");
  return new Parser().parseFromString(text, "text/xml");
}

function localName(el) {
  return el.localName ?? el.tagName?.split(":").pop();
}

// xmldom's getElementsByTagName is namespace-prefix-literal (it matches
// "w:sectPr" as a string), which is fine here since every real-world
// Word document uses the "w:" prefix for the main namespace — this
// isn't a generic OOXML library, just enough to read the specific
// fields this check needs.
function getAll(doc, tag) {
  return Array.from(doc?.getElementsByTagName(tag) ?? []);
}
// xmldom's getAttribute returns "" (not null) for a missing attribute,
// so a plain ?? chain never falls through — check truthiness instead.
function attr(el, name) {
  if (!el) return null;
  return el.getAttribute(name) || el.getAttribute("w:" + name) || null;
}

export async function readDocxFormat(buffer) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);

  const [documentXml, stylesXml, appXml] = await Promise.all([
    readXml(zip, "word/document.xml"),
    readXml(zip, "word/styles.xml"),
    readXml(zip, "docProps/app.xml"),
  ]);

  // Page count as of Word's last save (it caches pagination in app.xml)
  // — a real, Word-computed value, not something we estimate ourselves.
  // Can be stale if edited without resaving; treated as an approximation.
  const pagesEl = getAll(appXml, "Pages")[0];
  const pageCount = pagesEl ? parseInt(pagesEl.textContent, 10) || null : null;

  // Page size + margins: every section (w:sectPr) should agree; report
  // all distinct values found rather than assuming a single section.
  const sectPrs = documentXml ? getAll(documentXml, "w:sectPr") : [];
  const pageSizes = sectPrs.flatMap((s) => getAll(s, "w:pgSz")).map((el) => ({
    widthMm: Math.round((parseInt(attr(el, "w"), 10) || 0) / TWIPS_PER_MM),
    heightMm: Math.round((parseInt(attr(el, "h"), 10) || 0) / TWIPS_PER_MM),
  }));
  const margins = sectPrs.flatMap((s) => getAll(s, "w:pgMar")).map((el) => ({
    topCm: +((parseInt(attr(el, "top"), 10) || 0) / TWIPS_PER_CM).toFixed(2),
    rightCm: +((parseInt(attr(el, "right"), 10) || 0) / TWIPS_PER_CM).toFixed(2),
    bottomCm: +((parseInt(attr(el, "bottom"), 10) || 0) / TWIPS_PER_CM).toFixed(2),
    leftCm: +((parseInt(attr(el, "left"), 10) || 0) / TWIPS_PER_CM).toFixed(2),
  }));

  // Fonts/sizes actually used: every run-level override, plus the
  // "Normal" style's default as the fallback most body text inherits.
  const fontUsage = new Map(); // "font@sizePt" -> run count
  const bump = (font, sizePt) => {
    if (!font || !sizePt) return;
    const key = `${font.toLowerCase()}@${sizePt}`;
    fontUsage.set(key, (fontUsage.get(key) ?? 0) + 1);
  };
  for (const rPr of getAll(documentXml, "w:rPr")) {
    const fontsEl = getAll(rPr, "w:rFonts")[0];
    const szEl = getAll(rPr, "w:sz")[0];
    const font = attr(fontsEl, "ascii") ?? attr(fontsEl, "hAnsi") ?? attr(fontsEl, "cs");
    const sizePt = szEl ? (parseInt(attr(szEl, "val"), 10) || 0) / 2 : null;
    bump(font, sizePt);
  }
  const normalRPr = getAll(stylesXml, "w:style")
    .find((s) => attr(s, "styleId")?.toLowerCase() === "normal")
    ?.getElementsByTagName?.("w:rPr")?.[0];
  if (normalRPr) {
    const fontsEl = getAll(normalRPr, "w:rFonts")[0];
    const szEl = getAll(normalRPr, "w:sz")[0];
    bump(attr(fontsEl, "ascii") ?? attr(fontsEl, "hAnsi"), szEl ? (parseInt(attr(szEl, "val"), 10) || 0) / 2 : null);
  }

  // Line spacing: w:line in 240ths of a line when lineRule="auto".
  const spacingMultipliers = new Set(
    getAll(documentXml, "w:spacing")
      .filter((el) => (attr(el, "lineRule") ?? "auto") === "auto" && attr(el, "line"))
      .map((el) => +((parseInt(attr(el, "line"), 10) || 0) / 240).toFixed(2))
  );

  return {
    pageCount,
    pageSizes,
    margins,
    fontUsage: [...fontUsage.entries()].map(([key, count]) => {
      const [font, sizePt] = key.split("@");
      return { font, sizePt: Number(sizePt), count };
    }),
    lineSpacingMultipliers: [...spacingMultipliers],
  };
}

// Pure comparison against FORMAT_REQUIREMENTS — takes the already-read
// properties (readDocxFormat's output) so this half stays trivially
// testable without a real .docx file.
export function checkDocxFormat(props, docType, isInterimRelief = false) {
  const findings = [];
  const req = FORMAT_REQUIREMENTS;

  for (const size of props.pageSizes) {
    if (Math.abs(size.widthMm - req.paperSize.widthMm) > 3 || Math.abs(size.heightMm - req.paperSize.heightMm) > 3) {
      findings.push(`גודל העמוד (${size.widthMm}x${size.heightMm} מ"מ) אינו A4 (210x297 מ"מ).`);
    }
  }
  for (const m of props.margins) {
    for (const [side, label] of [["topCm", "עליון"], ["rightCm", "ימני"], ["bottomCm", "תחתון"], ["leftCm", "שמאלי"]]) {
      if (Math.abs(m[side] - req.marginCm) > 0.2) {
        findings.push(`השוליים ה${label} (${m[side]} ס"מ) שונים מהנדרש (${req.marginCm} ס"מ).`);
      }
    }
  }
  for (const { font, sizePt, count } of props.fontUsage) {
    const fontOk = req.allowedFonts.includes(font?.toLowerCase());
    const sizeOk = sizePt === req.bodyFontSizePt || sizePt === req.headingFontSizePt;
    if (!fontOk || !sizeOk) {
      findings.push(`נמצא שימוש בגופן "${font}" בגודל ${sizePt} (${count} מופעים) — שונה מהנדרש (David/רעננה/Calibri, גודל 12 לגוף הטקסט או 14 לכותרות).`);
    }
  }
  for (const mult of props.lineSpacingMultipliers) {
    if (Math.abs(mult - req.lineSpacingMultiplier) > 0.05) {
      findings.push(`מרווח בין שורות של ${mult} שורות, במקום שורה וחצי (1.5) הנדרש.`);
    }
  }
  const limit = req.pageLimits[docType];
  const pageLimit = limit ? (isInterimRelief ? limit.interimRelief : limit.ordinary) : null;
  if (pageLimit != null && props.pageCount != null && props.pageCount > pageLimit) {
    findings.push(`המסמך כולל ${props.pageCount} עמודים (לפי נתוני וורד בשמירה האחרונה), מעבר למגבלת ${pageLimit} העמודים לסוג מסמך זה${isInterimRelief ? " (סעד זמני)" : ""}.`);
  }

  return findings;
}
