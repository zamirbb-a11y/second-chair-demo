import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { simpleParser } from "mailparser";

export async function processFileBuffer(buffer, filename) {
  const extension = getExtension(filename);

  let extractedText = "";
  let status = "נטען";
  let extractionMethod = "none";
  let needsOcr = false;

  if (extension === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    extractedText = result.value || "";
    extractionMethod = "mammoth";
  } else if (extension === "pdf") {
    try {
      const result = await pdfParse(buffer);
      extractedText = result.text || "";
      extractionMethod = "pdf-parse";
    } catch (_pdfErr) {
      extractedText = "";
      extractionMethod = "pdf-parse-failed";
    }

    if (normalizeText(extractedText).length < 300) {
      needsOcr = true;
      status = "נדרש OCR";
    }
  } else if (extension === "txt") {
    extractedText = buffer.toString("utf8");
    extractionMethod = "plain-text";
  } else if (extension === "eml") {
    const parsed = await simpleParser(buffer);
    extractionMethod = "mailparser";

    extractedText = `
Subject: ${parsed.subject || ""}

From: ${parsed.from?.text || ""}

To: ${parsed.to?.text || ""}

Date: ${parsed.date || ""}

${parsed.text || ""}
`;
  } else {
    status = "הפורמט טרם נתמך";
    extractionMethod = "unsupported";
  }

  const cleanText = normalizeText(extractedText);
  const id = createFileId(filename);
  const chunks = buildChunks(cleanText, id);

  return {
    id,
    name: filename,
    size: buffer.length,
    type: extension,
    status,
    extractionMethod,
    needsOcr,
    text: cleanText,
    textLength: cleanText.length,
    preview: cleanText.slice(0, 700),
    chunks,
    documentProfile: buildDocumentProfile({
      fileName: filename,
      extension,
      text: cleanText,
      status,
    }),
  };
}

function buildDocumentProfile({ fileName, extension, text, status }) {
  const combined = `${fileName || ""}\n${text || ""}`;
  const lower = combined.toLowerCase();

  const documentRole = inferDocumentRole({ fileName, extension, lower });
  const documentKind = inferDocumentKind({ fileName, extension, lower, status });
  const pleadingType = inferPleadingType({ lower });
  const proceduralRole = inferProceduralRole({ lower });
  const riskSignals = findRiskSignals(lower);
  const missingAttachmentSignals = findMissingAttachmentSignals(lower);
  const keyDates = extractDates(combined);
  const keyPeople = extractLikelyPeople(combined);
  const legalReferences = extractLegalReferences(combined);
  const citedPrecedents = extractCitedPrecedents(combined);
  const evidenceWeight = inferEvidenceWeight({ documentRole, lower, status });

  return {
    documentRole,
    documentKind,
    pleadingType,
    proceduralRole,
    summary: buildHeuristicSummary(text),
    keyDates,
    keyPeople,
    legalReferences,
    citedPrecedents,
    riskSignals,
    missingAttachmentSignals,
    evidenceWeight,
  };
}

function inferDocumentRole({ fileName, extension, lower }) {
  if (
    lower.includes("spa") ||
    lower.includes("share purchase") ||
    lower.includes("asset purchase") ||
    lower.includes("הסכם רכישה") ||
    lower.includes("הסכם מכר") ||
    lower.includes("מצגים והתחייבויות")
  ) {
    return "הסכם / מסמך חוזי מרכזי";
  }

  if (
    extension === "eml" ||
    lower.includes("subject:") ||
    lower.includes("from:") ||
    lower.includes("to:")
  ) {
    return "תכתובת אימייל";
  }

  if (
    lower.includes("whatsapp") ||
    lower.includes("וואטסאפ") ||
    lower.includes("תמלול הודעות") ||
    lower.includes("הודעה")
  ) {
    return "תכתובת הודעות / WhatsApp";
  }

  if (
    lower.includes("board") ||
    lower.includes("דירקטוריון") ||
    lower.includes("פרוטוקול") ||
    lower.includes("minutes")
  ) {
    return "פרוטוקול / מסמך הנהלה";
  }

  if (
    lower.includes("due diligence") ||
    lower.includes("dd") ||
    lower.includes("בדיקת נאותות")
  ) {
    return "בדיקת נאותות / DD";
  }

  if (lower.includes("draft") || lower.includes("טיוטה")) {
    return "טיוטה / גרסה מוקדמת";
  }

  if (
    lower.includes("כתב תביעה") ||
    lower.includes("כתב הגנה") ||
    lower.includes("בקשה") ||
    lower.includes("תצהיר")
  ) {
    return "כתב טענות / מסמך דיוני";
  }

  if (extension === "pdf") {
    return "מסמך PDF";
  }

  return "מסמך כללי";
}

function inferDocumentKind({ fileName, extension, lower, status }) {
  if (
    lower.includes("כתב תביעה") ||
    lower.includes("כתב הגנה") ||
    lower.includes("כתב תשובה") ||
    lower.includes("תשובה") ||
    lower.includes("תגובה לתשובה") ||
    lower.includes("בקשה") ||
    lower.includes("תגובה לבקשה") ||
    lower.includes("תצהיר") ||
    lower.includes("ערעור")
  ) {
    return "pleading";
  }

  if (
    lower.includes("פסק דין") ||
    lower.includes('פס"ד') ||
    lower.includes("עא ") ||
    lower.includes("רעא ") ||
    lower.includes("תא ") ||
    lower.includes('ת"א ') ||
    lower.includes('תא"מ')
  ) {
    return "precedent";
  }

  if (
    lower.includes("החלטה") ||
    lower.includes("ניתנה היום") ||
    lower.includes("בית המשפט") ||
    lower.includes("השופט") ||
    lower.includes("השופטת") ||
    lower.includes("הרשם")
  ) {
    return "judicial_decision";
  }

  if (
    lower.includes("הסכם") ||
    lower.includes("agreement") ||
    lower.includes("contract") ||
    lower.includes("spa")
  ) {
    return "contract";
  }

  if (
    extension === "eml" ||
    lower.includes("subject:") ||
    lower.includes("from:") ||
    lower.includes("to:")
  ) {
    return "correspondence";
  }

  if (lower.includes("חוות דעת") || lower.includes("מומחה")) {
    return "expert_material";
  }

  if (
    lower.includes("פרוטוקול") ||
    lower.includes("דירקטוריון") ||
    lower.includes("board")
  ) {
    return "internal_document";
  }

  if (status !== "נטען") {
    return "unknown";
  }

  return "evidence";
}

function inferPleadingType({ lower }) {
  if (lower.includes("כתב תביעה")) return "statement_of_claim";
  if (lower.includes("כתב הגנה")) return "statement_of_defense";
  if (lower.includes("כתב תשובה") || lower.includes("תשובה לכתב הגנה")) return "reply";
  if (lower.includes("תגובה לתשובה") || lower.includes("תשובה לתגובה")) return "response_to_reply";
  if (lower.includes("תגובה לבקשה") || lower.includes("תשובה לבקשה")) return "response_to_motion";
  if (lower.includes("בקשה")) return "motion";
  if (lower.includes("תצהיר")) return "affidavit";
  if (lower.includes("חוות דעת") || lower.includes("מומחה")) return "expert_opinion";
  if (lower.includes("ערעור")) return "appeal";
  if (lower.includes("תשובה לערעור") || lower.includes("תגובה לערעור")) return "response_to_appeal";
  return null;
}

function inferProceduralRole({ lower }) {
  if (lower.includes("התובע") || lower.includes("המבקש") || lower.includes("המערער")) return "initiating_party";
  if (lower.includes("הנתבע") || lower.includes("המשיב")) return "responding_party";
  return "unknown";
}

function findRiskSignals(lower) {
  const signals = [];
  const tests = [
    { keywords: ["no reliance", "לא הסתמך", "לא הסתמכה", "לא יהווה בסיס לטענה"], label: "סעיף אי-הסתמכות / no-reliance" },
    { keywords: ["מצג", "representation", "הבטחה", "אפשר להיות רגועים"], label: "מצגים טרום-חוזיים" },
    { keywords: ["לא רצינו להכניס", "לא הכנסנו", "להסתיר", "הסתר", "לא גילינו"], label: "אינדיקציה להסתרה או אי-גילוי" },
    { keywords: ["ידעו לפני", "היו ידועים", "לפני החתימה", "לפני הסגירה"], label: "ידיעה מוקדמת אפשרית" },
    { keywords: ["סיכון", "risk", "קפיאה", "מקפיאים", "ירידה", "שינוי מהותי"], label: "סיכון עסקי או שינוי מהותי" },
    { keywords: ["נספח", "attachment", "attached", "מצורף", "מצורפת"], label: "הפניה לנספח או מסמך נלווה" },
    { keywords: ["טיוטה", "draft", "גרסה קודמת"], label: "קיומה האפשרי של טיוטה או גרסה קודמת" },
  ];
  for (const test of tests) {
    if (test.keywords.some((kw) => lower.includes(kw))) signals.push(test.label);
  }
  return [...new Set(signals)];
}

function findMissingAttachmentSignals(lower) {
  const signals = [];
  if (lower.includes("attached") || lower.includes("attachment") || lower.includes("מצורף") || lower.includes("מצורפת") || lower.includes("נספח")) {
    signals.push("המסמך מפנה לנספח או קובץ מצורף שיש לוודא שצורף לתיק.");
  }
  if (lower.includes("כפי שאמרתי בשיחה") || lower.includes("בהמשך לשיחה") || lower.includes("as discussed") || lower.includes("following our call")) {
    signals.push("המסמך מפנה לשיחה קודמת שלא מתועדת בקובץ עצמו.");
  }
  if (lower.includes("מצגת") || lower.includes("presentation") || lower.includes("deck")) {
    signals.push("יש אינדיקציה למצגת או deck שעשויים להיות חסרים.");
  }
  if (lower.includes("board") || lower.includes("דירקטוריון") || lower.includes("פרוטוקול")) {
    signals.push("ייתכן שחסרים פרוטוקולים או חומרי הנהלה נלווים.");
  }
  if (lower.includes("dd") || lower.includes("due diligence") || lower.includes("בדיקת נאותות")) {
    signals.push("ייתכן שחסרים חומרי בדיקת נאותות או דוחות DD.");
  }
  return [...new Set(signals)];
}

function extractDates(text) {
  const dates = new Set();
  const patterns = [
    /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g,
    /\b\d{4}[./-]\d{1,2}[./-]\d{1,2}\b/g,
  ];
  for (const pattern of patterns) {
    (text.match(pattern) || []).forEach((d) => dates.add(d));
  }
  return Array.from(dates).slice(0, 8);
}

function extractLikelyPeople(text) {
  const people = new Set();
  (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).forEach((e) => people.add(e));
  (text.match(/(?:מנכ"ל|סמנכ"ל|CFO|CEO|מנהל מוצר|דירקטור)[^:\n]{0,40}/g) || []).forEach((m) => people.add(m.trim()));
  return Array.from(people).slice(0, 8);
}

function extractLegalReferences(text) {
  const references = new Set();
  const patterns = [
    /סעיף\s+\d+[א-ת]?(?:\([^)]+\))?\s+ל[^,\n.]{2,80}/g,
    /חוק\s+[^,\n.]{2,80}/g,
    /פקודת\s+[^,\n.]{2,80}/g,
    /תקנה\s+\d+[א-ת]?(?:\([^)]+\))?/g,
  ];
  for (const pattern of patterns) {
    (text.match(pattern) || []).forEach((m) => references.add(m.trim()));
  }
  return Array.from(references).slice(0, 12);
}

function extractCitedPrecedents(text) {
  const precedents = new Set();
  const patterns = [
    /ע"?א\s+\d+\/\d+[^\n,.;]{0,80}/g,
    /רע"?א\s+\d+\/\d+[^\n,.;]{0,80}/g,
    /בג"?ץ\s+\d+\/\d+[^\n,.;]{0,80}/g,
    /ת"?א\s+\d+[-/]\d+[^\n,.;]{0,80}/g,
    /תא"?מ\s+\d+[-/]\d+[^\n,.;]{0,80}/g,
    /עניין\s+[^,\n.]{2,80}/g,
  ];
  for (const pattern of patterns) {
    (text.match(pattern) || []).forEach((m) => precedents.add(m.trim()));
  }
  return Array.from(precedents).slice(0, 12);
}

function inferEvidenceWeight({ documentRole, lower, status }) {
  if (status !== "נטען") return "Unknown";
  if (documentRole.includes("הסכם") || documentRole.includes("חוזי")) return "High";
  if (documentRole.includes("אימייל") || documentRole.includes("WhatsApp") || documentRole.includes("הודעות")) return "Medium-High";
  if (lower.includes("טיוטה") || lower.includes("draft")) return "Medium";
  return "Medium";
}

function buildHeuristicSummary(text) {
  if (!text?.trim()) return "";
  const normalized = normalizeText(text);
  const sentences = normalized
    .split(/(?<=[.!?。]|[.?!])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.slice(0, 4).join(" ").slice(0, 900);
}

function buildChunks(text, fileId) {
  if (!text?.trim()) return [];
  const CHUNK_SIZE = 1800;
  const OVERLAP = 250;
  const chunks = [];
  let start = 0;
  let index = 1;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    const chunkText = text.slice(start, end).trim();
    if (chunkText) {
      chunks.push({ id: `${fileId}_chunk_${index}`, index, start, end, text: chunkText });
    }
    start += CHUNK_SIZE - OVERLAP;
    index += 1;
  }
  return chunks;
}

export function normalizeText(text = "") {
  return text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

export function getExtension(name = "") {
  return name.split(".").pop()?.toLowerCase();
}

export function createFileId(name = "") {
  return (
    "file_" +
    name.toLowerCase().replace(/[^a-z0-9א-ת]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 60) +
    "_" +
    Math.random().toString(36).slice(2, 8)
  );
}
