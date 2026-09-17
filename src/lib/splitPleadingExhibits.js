// Layer-1-only exhibit-boundary detection, validated 2026-09-17 against 4
// real filings with genuinely different (or absent) exhibit-marking
// conventions. A page whose own text is short and dominated by a
// "נספח N" marker is ground truth for where that exhibit starts — this
// never trusts a stated table-of-contents page number, since real filings
// sometimes get those wrong; the divider page itself, not any declared
// number, is the source of truth.
//
// Deliberately does not attempt anything beyond this one, high-precision
// signal. Two other signals were prototyped and rejected for now: footer
// page-number-reset tracking (too noisy — a document's own attached
// exhibit commonly has its own internal page numbering, indistinguishable
// from a real reset without much more work) and page-to-page embedding
// similarity (caught the one real boundary in a document with zero
// markings, but produced far too many false positives on longer, more
// topically varied documents to use as a blanket check). When this finds
// nothing, the caller should say so plainly and offer manual upload —
// never guess.

const DIVIDER_MAX_CHARS = 200;
const DIVIDER_PATTERN = /נספח\s*([א-ת]{1,3}['׳]?|\d{1,3})\b/;

// pages: [{ page: number, text: string }], 1-indexed and contiguous.
// Returns { bodyRange: [start,end]|null, exhibits: [{ number, label, startPage, endPage }] }.
export function detectExhibitBoundaries(pages) {
  const totalPages = pages.length;
  const dividers = [];

  for (const p of pages) {
    const trimmed = (p.text || "").trim();
    if (!trimmed || trimmed.length > DIVIDER_MAX_CHARS) continue;
    const match = trimmed.match(DIVIDER_PATTERN);
    if (!match) continue;
    dividers.push({ page: p.page, number: match[1], label: trimmed.slice(0, 150) });
  }

  if (!dividers.length) {
    return { bodyRange: [1, totalPages], exhibits: [] };
  }

  const bodyEnd = dividers[0].page - 1;
  const bodyRange = bodyEnd >= 1 ? [1, bodyEnd] : null;

  const exhibits = dividers.map((d, i) => {
    const endPage = i + 1 < dividers.length ? dividers[i + 1].page - 1 : totalPages;
    return { number: d.number, label: d.label, startPage: d.page, endPage };
  });

  return { bodyRange, exhibits };
}
