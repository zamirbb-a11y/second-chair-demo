"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.config = void 0;
exports.default = handler;
var _fs = _interopRequireDefault(require("fs"));
var _formidable = _interopRequireDefault(require("formidable"));
var _processFile = require("../src/lib/processFile.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const config = exports.config = {
  api: {
    bodyParser: false
  }
};
async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }
  try {
    const files = await parseForm(req);
    const processedFiles = [];
    for (const file of files) {
      try {
        const buffer = _fs.default.readFileSync(file.filepath);
        const result = await (0, _processFile.processFileBuffer)(buffer, file.originalFilename);
        processedFiles.push(result);
      } catch (err) {
        console.error("File processing failed:", err);
        processedFiles.push({
          id: (0, _processFile.createFileId)(file.originalFilename),
          name: file.originalFilename,
          size: file.size,
          type: (0, _processFile.getExtension)(file.originalFilename),
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
            evidenceWeight: "Unknown"
          }
        });
      }
    }
    return res.status(200).json({
      files: processedFiles
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Upload processing failed"
    });
  }
}
function parseForm(req) {
  const form = (0, _formidable.default)({
    multiples: true,
    keepExtensions: true,
    uploadDir: process.env.VERCEL ? "/tmp" : undefined,
    maxFileSize: 4 * 1024 * 1024
  });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      const uploaded = Array.isArray(files.files) ? files.files : [files.files].filter(Boolean);
      resolve(uploaded);
    });
  });
}
//# sourceMappingURL=upload.js.map