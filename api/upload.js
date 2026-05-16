import fs from "fs";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { simpleParser } from "mailparser";
import formidable from "formidable";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const files = await parseForm(req);
    const processedFiles = [];

    for (const file of files) {
      try {
        const result = await processFile(file);
        processedFiles.push(result);
      } catch (err) {
        console.error("File processing failed:", err);

        processedFiles.push({
          id: createFileId(file.originalFilename),
          name: file.originalFilename,
          size: file.size,
          type: getExtension(file.originalFilename),
          status: "שגיאה בקריאת הקובץ",
          text: "",
          textLength: 0,
          preview: "",
          chunks: [],
          documentProfile: {
            documentRole: "לא זוהה",
            summary: "",
            keyDates: [],
            keyPeople: [],
            riskSignals: [],
            missingAttachmentSignals: [],
            evidenceWeight: "Unknown",
          },
        });
      }
    }

    return res.status(200).json({ files: processedFiles });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Upload processing failed",
    });
  }
}

async function processFile(file) {
  const filePath = file.filepath;
  const buffer = fs.readFileSync(filePath);
  const extension = getExtension(file.originalFilename);

  let extractedText = "";
  let status = "נטען";

  if (extension === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    extractedText = result.value || "";
  } else if (extension === "pdf") {
    const result = await pdfParse(buffer);
    extractedText = result.text || "";
  } else if (extension === "txt") {
    extractedText = buffer.toString("utf8");
  } else if (extension === "eml") {
    const parsed = await simpleParser(buffer);

    extractedText = `
Subject: ${parsed.subject || ""}

From: ${parsed.from?.text || ""}

To: ${parsed.to?.text || ""}

Date: ${parsed.date || ""}

${parsed.text || ""}
`;
  } else {
    status = "הפורמט טרם נתמך";
  }

  const cleanText = normalizeText(extractedText);
  const id = createFileId(file.originalFilename);
  const chunks = buildChunks(cleanText, id);

  return {
    id,
    name: file.originalFilename,
    size: file.size,
    type: extension,
    status,
    text: cleanText,
    textLength: cleanText.length,
    preview: cleanText.slice(0, 700),
    chunks,
    documentProfile: buildDocumentProfile({
      fileName: file.originalFilename,
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
  const riskSignals = findRiskSignals(lower);
  const missingAttachmentSignals = findMissingAttachmentSignals(lower);
  const keyDates = extractDates(combined);
  const keyPeople = extractLikelyPeople(combined);
  const evidenceWeight = inferEvidenceWeight({
    documentRole,
    lower,
    status,
  });

  return {
    documentRole,
    summary: buildHeuristicSummary(text),
    keyDates,
    keyPeople,
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

  if (
    lower.includes("draft") ||
    lower.includes("טיוטה")
  ) {
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

function findRiskSignals(lower) {
  const signals = [];

  const tests = [
    {
      keywords: ["no reliance", "לא הסתמך", "לא הסתמכה", "לא יהווה בסיס לטענה"],
      label: "סעיף אי-הסתמכות / no-reliance",
    },
    {
      keywords: ["מצג", "representation", "הבטחה", "אפשר להיות רגועים"],
      label: "מצגים טרום-חוזיים",
    },
    {
      keywords: ["לא רצינו להכניס", "לא הכנסנו", "להסתיר", "הסתר", "לא גילינו"],
      label: "אינדיקציה להסתרה או אי-גילוי",
    },
    {
      keywords: ["ידעו לפני", "היו ידועים", "לפני החתימה", "לפני הסגירה"],
      label: "ידיעה מוקדמת אפשרית",
    },
    {
      keywords: ["סיכון", "risk", "קפיאה", "מקפיאים", "ירידה", "שינוי מהותי"],
      label: "סיכון עסקי או שינוי מהותי",
    },
    {
      keywords: ["נספח", "attachment", "attached", "מצורף", "מצורפת"],
      label: "הפניה לנספח או מסמך נלווה",
    },
    {
      keywords: ["טיוטה", "draft", "גרסה קודמת"],
      label: "קיומה האפשרי של טיוטה או גרסה קודמת",
    },
  ];

  for (const test of tests) {
    if (test.keywords.some((keyword) => lower.includes(keyword))) {
      signals.push(test.label);
    }
  }

  return [...new Set(signals)];
}

function findMissingAttachmentSignals(lower) {
  const signals = [];

  if (
    lower.includes("attached") ||
    lower.includes("attachment") ||
    lower.includes("מצורף") ||
    lower.includes("מצורפת") ||
    lower.includes("נספח")
  ) {
    signals.push("המסמך מפנה לנספח או קובץ מצורף שיש לוודא שצורף לתיק.");
  }

  if (
    lower.includes("כפי שאמרתי בשיחה") ||
    lower.includes("בהמשך לשיחה") ||
    lower.includes("as discussed") ||
    lower.includes("following our call")
  ) {
    signals.push("המסמך מפנה לשיחה קודמת שלא מתועדת בקובץ עצמו.");
  }

  if (
    lower.includes("מצגת") ||
    lower.includes("presentation") ||
    lower.includes("deck")
  ) {
    signals.push("יש אינדיקציה למצגת או deck שעשויים להיות חסרים.");
  }

  if (
    lower.includes("board") ||
    lower.includes("דירקטוריון") ||
    lower.includes("פרוטוקול")
  ) {
    signals.push("ייתכן שחסרים פרוטוקולים או חומרי הנהלה נלווים.");
  }

  if (
    lower.includes("dd") ||
    lower.includes("due diligence") ||
    lower.includes("בדיקת נאותות")
  ) {
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
    const matches = text.match(pattern) || [];
    matches.forEach((date) => dates.add(date));
  }

  return Array.from(dates).slice(0, 8);
}

function extractLikelyPeople(text) {
  const people = new Set();

  const emailMatches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  emailMatches.forEach((email) => people.add(email));

  const hebrewRoleMatches =
    text.match(/(?:מנכ"ל|סמנכ"ל|CFO|CEO|מנהל מוצר|דירקטור)[^:\n]{0,40}/g) || [];
  hebrewRoleMatches.forEach((match) => people.add(match.trim()));

  return Array.from(people).slice(0, 8);
}

function inferEvidenceWeight({ documentRole, lower, status }) {
  if (status !== "נטען") {
    return "Unknown";
  }

  if (
    documentRole.includes("הסכם") ||
    documentRole.includes("חוזי")
  ) {
    return "High";
  }

  if (
    documentRole.includes("אימייל") ||
    documentRole.includes("WhatsApp") ||
    documentRole.includes("הודעות")
  ) {
    return "Medium-High";
  }

  if (
    lower.includes("טיוטה") ||
    lower.includes("draft")
  ) {
    return "Medium";
  }

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
      chunks.push({
        id: `${fileId}_chunk_${index}`,
        index,
        start,
        end,
        text: chunkText,
      });
    }

    start += CHUNK_SIZE - OVERLAP;
    index += 1;
  }

  return chunks;
}

function parseForm(req) {
  const form = formidable({
    multiples: true,
    keepExtensions: true,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }

      const uploaded = Array.isArray(files.files)
        ? files.files
        : [files.files].filter(Boolean);

      resolve(uploaded);
    });
  });
}

function normalizeText(text = "") {
  return text
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function getExtension(name = "") {
  return name.split(".").pop()?.toLowerCase();
}

function createFileId(name = "") {
  return (
    "file_" +
    name
      .toLowerCase()
      .replace(/[^a-z0-9א-ת]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60) +
    "_" +
    Math.random().toString(36).slice(2, 8)
  );
}
