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
    return res
      .status(405)
      .json({
        error: "Method not allowed",
      });
  }

  try {
    const files =
      await parseForm(req);

    const processedFiles = [];

    for (const file of files) {
      try {
        const result =
          await processFile(file);

        processedFiles.push(result);
      } catch (err) {
        console.error(
          "File processing failed:",
          err
        );

        processedFiles.push({
          name:
            file.originalFilename,
          size: file.size,
          type: getExtension(
            file.originalFilename
          ),
          status:
            "שגיאה בקריאת הקובץ",
          text: "",
        });
      }
    }

    return res.status(200).json({
      files: processedFiles,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error:
        "Upload processing failed",
    });
  }
}

async function processFile(file) {
  const filePath =
    file.filepath;

  const buffer =
    fs.readFileSync(filePath);

  const extension =
    getExtension(
      file.originalFilename
    );

  let extractedText = "";
  let status = "נטען";

  if (extension === "docx") {
    const result =
      await mammoth.extractRawText({
        buffer,
      });

    extractedText =
      result.value || "";
  } else if (extension === "pdf") {
    const result =
      await pdfParse(buffer);

    extractedText =
      result.text || "";
  } else if (extension === "txt") {
    extractedText =
      buffer.toString("utf8");
  } else if (extension === "eml") {
    const parsed =
      await simpleParser(buffer);

    extractedText = `
Subject: ${
      parsed.subject || ""
    }

From: ${
      parsed.from?.text || ""
    }

To: ${
      parsed.to?.text || ""
    }

${parsed.text || ""}
`;
  } else {
    status =
      "הפורמט טרם נתמך";
  }

  return {
    name:
      file.originalFilename,
    size: file.size,
    type: extension,
    status,
    text: extractedText,
  };
}

function parseForm(req) {
  const form =
    formidable({
      multiples: true,
      keepExtensions: true,
    });

  return new Promise(
    (resolve, reject) => {
      form.parse(
        req,
        (err, fields, files) => {
          if (err) {
            reject(err);
            return;
          }

          const uploaded =
            Array.isArray(
              files.files
            )
              ? files.files
              : [files.files];

          resolve(uploaded);
        }
      );
    }
  );
}

function getExtension(name = "") {
  return name
    .split(".")
    .pop()
    ?.toLowerCase();
}
