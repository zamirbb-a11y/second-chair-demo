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

  return {
    id,
    name: file.originalFilename,
    size: file.size,
    type: extension,
    status,
    text: cleanText,
    textLength: cleanText.length,
    preview: cleanText.slice(0, 700),
    chunks: buildChunks(cleanText, id),
  };
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
