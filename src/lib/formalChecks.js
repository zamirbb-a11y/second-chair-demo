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
// - reply (כתב תשובה): 3 pages, תקנה 18(ב) — unaffected by interim relief.
// - motion / response (בקשה / תגובה לבקשה): 5 pages ordinarily, 8 pages
//   for a request for interim relief, תקנה 50.
// - affidavit (תצהיר): 3 pages ordinarily, 6 for interim relief, תקנה 50.
// No verified cap was found for reply-to-motion (תשובה לתגובה) — omitted
// rather than guessed, for either variant.
export const PAGE_LIMITS = {
  reply: { ordinary: 3, interimRelief: 3 },
  motion: { ordinary: 5, interimRelief: 8 },
  response: { ordinary: 5, interimRelief: 8 },
  affidavit: { ordinary: 3, interimRelief: 6 },
};

export function pageLimitFor(docType, isInterimRelief = false) {
  const limits = PAGE_LIMITS[docType];
  if (!limits) return null;
  return isInterimRelief ? limits.interimRelief : limits.ordinary;
}

// pageCount is the real PDF page count (independent of extraction
// method); null when unknown (non-PDF sources, or extraction failed to
// report it) — never guessed from text length, which doesn't map
// reliably to physical pages, especially for OCR'd scans.
export function checkPageLimit(docType, pageCount, isInterimRelief = false) {
  const limit = pageLimitFor(docType, isInterimRelief);
  if (limit == null || pageCount == null) return null;
  if (pageCount <= limit) return null;
  return `המסמך כולל ${pageCount} עמודים, מעבר למגבלת ${limit} העמודים הקבועה לסוג מסמך זה${isInterimRelief ? " (סעד זמני)" : ""} (לא כולל נספחים ותצהירים, ככל שנספרו בנפרד בקובץ).`;
}
