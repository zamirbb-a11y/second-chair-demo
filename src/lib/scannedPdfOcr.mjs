// Deterministic OCR for scanned/image-only PDFs — page-by-page, Tesseract-
// based, and structured so it can never fabricate content. Built after a
// real scanned pleading showed that asking a vision-LLM to "transcribe" a
// degraded scan can produce confident, undetectable fabricated legal
// content instead of failing (invented parties like "IKEA" and invented
// arguments, repeated dozens of times) — that happened even with an
// explicit instruction to report illegible pages instead of guessing.
//
// This path runs no generative model on the page images at all. Tesseract
// recognizes glyphs; it cannot invent a sentence that isn't grounded in
// what's actually on the page the way a language model can. Where
// recognition confidence is too low to trust, the page fails explicitly —
// it never gets "completed" or "reconstructed."
//
// Every page is traceable: the per-page detail array is the source of
// truth, and the assembled text keeps unambiguous, non-content markers for
// every page that didn't meet the confidence bar, so a downstream claim-
// extraction pass can't mistake a skipped page for real content.

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";
import { createWorker } from "tesseract.js";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

// Many scanned PDFs (this is the common case, not an edge case) encode
// their page images as JBIG2 or JPX — pdfjs-dist needs to be pointed at
// its own WASM decoders for these in Node, or it silently skips the image
// entirely and renders a blank page (confirmed: this produced an
// apparently-blank canvas for a real scanned page with real content on
// it — Tesseract correctly reported nothing to read, but the actual bug
// was upstream in rendering, not in OCR). Resolved via Node's own module
// resolution rather than a relative path, so it holds regardless of
// nesting/hoisting in node_modules.
const pdfjsWasmUrl = (() => {
  const require = createRequire(import.meta.url);
  const pkgPath = require.resolve("pdfjs-dist/package.json");
  return new URL("wasm/", pathToFileURL(pkgPath)).href;
})();

const RENDER_SCALE = 3.5; // ~250 DPI — OCR accuracy degrades fast below ~200 DPI
const LOW_CONFIDENCE_THRESHOLD = 65; // Tesseract's 0-100 mean-confidence scale
const UNREADABLE_THRESHOLD = 35;
const MIN_TEXT_LENGTH_FOR_CONFIDENCE = 20; // below this, "confident" doesn't mean much either way
const TEXT_LAYER_SAMPLE_PAGES = 5;
const TEXT_LAYER_CHAR_THRESHOLD = 10; // per sampled page set — a real digital page has hundreds+

// Routing signal: does this PDF have a usable embedded text layer at all,
// or is it scanned/image-only? Samples pages rather than reading every
// page's text content, since this only needs to be cheap and directionally
// right, not exhaustive.
export async function hasNoTextLayer(buffer, sampleSize = TEXT_LAYER_SAMPLE_PAGES) {
  const doc = await getDocument({ data: new Uint8Array(buffer), disableFontFace: true, wasmUrl: pdfjsWasmUrl }).promise;
  const pagesToCheck = Math.min(sampleSize, doc.numPages);
  let totalChars = 0;
  for (let p = 1; p <= pagesToCheck; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    totalChars += content.items.reduce((sum, it) => sum + (it.str?.length ?? 0), 0);
  }
  return { isScanned: totalChars < TEXT_LAYER_CHAR_THRESHOLD, numPages: doc.numPages, checkedPages: pagesToCheck };
}

async function renderPageToPng(doc, pageNumber) {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toBuffer("image/png");
}

function classifyPage(text, confidence) {
  const trimmed = (text ?? "").trim();
  if (trimmed.length < MIN_TEXT_LENGTH_FOR_CONFIDENCE) {
    // Very little recognized text: either a genuinely blank/near-blank
    // page (fine) or OCR found nothing it could read (not fine) —
    // confidence is the only signal available to tell those apart, but
    // short text is never labeled "ok" as if it were a normal page either way.
    return confidence < UNREADABLE_THRESHOLD ? "unreadable" : "blank_or_sparse";
  }
  if (confidence < UNREADABLE_THRESHOLD) return "unreadable";
  if (confidence < LOW_CONFIDENCE_THRESHOLD) return "low_confidence";
  return "ok";
}

// Defense in depth: Tesseract can't invent content, but a stuck stamp, a
// repeating watermark, or a bug upstream could still produce degenerate
// repeated output. Fail that loud too rather than pass it through.
function hasRepetitionAnomaly(text) {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 15);
  const counts = new Map();
  for (const l of lines) counts.set(l, (counts.get(l) ?? 0) + 1);
  for (const c of counts.values()) if (c >= 4) return true;
  return false;
}

// OCRs every page of a scanned PDF. Returns page-by-page detail plus an
// assembled text with explicit, non-content markers for any page that
// didn't meet the confidence bar — never silently dropped, never guessed.
export async function ocrScannedPdf(buffer, { onPageDone } = {}) {
  const doc = await getDocument({ data: new Uint8Array(buffer), disableFontFace: true, wasmUrl: pdfjsWasmUrl }).promise;
  // Explicit cachePath: without one, tesseract.js caches the (multi-MB)
  // Hebrew trained-data file relative to the process's cwd, which dumped
  // it into the repo root during local testing. os.tmpdir() is writable
  // both locally and in Vercel's serverless /tmp.
  const worker = await createWorker("heb", 1, { cachePath: tmpdir() });
  const pages = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const png = await renderPageToPng(doc, p);
      const { data } = await worker.recognize(png);
      const text = (data.text ?? "").trim();
      const repetitive = hasRepetitionAnomaly(text);
      const status = repetitive ? "unreadable" : classifyPage(text, data.confidence);
      pages.push({
        page: p,
        text: status === "ok" || status === "low_confidence" ? text : "",
        confidence: data.confidence,
        status, // "ok" | "low_confidence" | "unreadable" | "blank_or_sparse"
        reason: repetitive ? "repetition_anomaly" : status === "unreadable" ? "low_ocr_confidence" : null,
      });
      onPageDone?.(p, doc.numPages, status);
    }
  } finally {
    await worker.terminate();
  }

  const unreadablePages = pages.filter((p) => p.status === "unreadable").map((p) => p.page);
  const lowConfidencePages = pages.filter((p) => p.status === "low_confidence").map((p) => p.page);

  const assembledText = pages
    .map((p) => {
      if (p.status === "unreadable") {
        return `[[עמוד ${p.page} — לא ניתן לזיהוי אוטומטי, נדרשת בדיקה ידנית מול המקור]]`;
      }
      if (p.status === "blank_or_sparse") return "";
      if (p.status === "low_confidence") {
        return `[[עמוד ${p.page} — ביטחון זיהוי נמוך, יש לאמת מול המקור]]\n${p.text}`;
      }
      return p.text;
    })
    .filter(Boolean)
    .join("\n\n");

  return {
    text: assembledText,
    pages, // per-page detail: {page, text, confidence, status, reason} — the traceability source of truth
    unreadablePages,
    lowConfidencePages,
    needsManualReview: unreadablePages.length > 0,
    method: "tesseract-ocr",
  };
}
