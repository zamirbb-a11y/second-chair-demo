// Formal/structural checks derivable mechanically, without an AI call —
// the first slice of the broader "צורני" track (see
// docs/stage2-document-type-rules.md and the מנהל בתי המשפט format
// directive the user supplied). Deliberately narrow: most of that
// directive (paper size, margins, exact font) describes the PDF's visual
// layout, which this pipeline never sees — it works on extracted text.
// Only page-count limits are checked here, because page count is the one
// physical-format fact this pipeline already has (pdfjs's own count,
// threaded through processFile.js as pageCount) and the Regulations give
// verified, citable numbers for it per document type.
//
// [VERIFIED — see docs/stage2-document-type-rules.md]:
// - reply (כתב תשובה): 3 pages, תקנה 18(ב).
// - motion / response (בקשה / תגובה לבקשה): 5 pages, תקנה 50 (8 pages
//   for a request for interim relief — see the interim-relief profile).
// No verified cap was found for reply-to-motion (תשובה לתגובה) — omitted
// rather than guessed.
export const PAGE_LIMITS = {
  reply: 3,
  motion: 5,
  response: 5,
};

export function pageLimitFor(docType) {
  return PAGE_LIMITS[docType] ?? null;
}

// pageCount is the real PDF page count (independent of extraction
// method); null when unknown (non-PDF sources, or extraction failed to
// report it) — never guessed from text length, which doesn't map
// reliably to physical pages, especially for OCR'd scans.
export function checkPageLimit(docType, pageCount) {
  const limit = pageLimitFor(docType);
  if (limit == null || pageCount == null) return null;
  if (pageCount <= limit) return null;
  return `המסמך כולל ${pageCount} עמודים, מעבר למגבלת ${limit} העמודים הקבועה לסוג מסמך זה (לא כולל נספחים ותצהירים, ככל שנספרו בנפרד בקובץ).`;
}
