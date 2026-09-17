// Per-page digital text extraction via pdfjs-dist — only for PDFs that
// already have an embedded text layer (see scannedPdfOcr.mjs's
// hasNoTextLayer). Unlike scannedPdfOcr.mjs, this never rasterizes a page,
// so it needs none of that module's WASM image-decoder setup — it only
// reads the text layer's own glyph data.
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function getDigitalPerPageText(buffer) {
  const doc = await getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it) => it.str).join(" ").trim();
    pages.push({ page: i, text });
  }
  return pages;
}
