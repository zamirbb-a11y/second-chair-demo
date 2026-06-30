import fs from "fs";
import formidable from "formidable";
import { processFileBuffer, createFileId, getExtension } from "./lib/processFile.js";

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
        const buffer = fs.readFileSync(file.filepath);
        const result = await processFileBuffer(buffer, file.originalFilename);
        processedFiles.push(result);
      } catch (err) {
        console.error("File processing failed:", err);
        processedFiles.push({
          id: createFileId(file.originalFilename),
          name: file.originalFilename,
          size: file.size,
          type: getExtension(file.originalFilename),
          status: "שגיאה בקריאת הקובץ",
          extractionMethod: "failed",
          needsOcr: false,
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
    return res.status(500).json({ error: "Upload processing failed" });
  }
}

function parseForm(req) {
  const form = formidable({
    multiples: true,
    keepExtensions: true,
    uploadDir: process.env.VERCEL ? "/tmp" : undefined,
    maxFileSize: 4 * 1024 * 1024,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) { reject(err); return; }
      const uploaded = Array.isArray(files.files) ? files.files : [files.files].filter(Boolean);
      resolve(uploaded);
    });
  });
}
