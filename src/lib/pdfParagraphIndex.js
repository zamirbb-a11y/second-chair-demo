// Maps paragraph numbers to their physical position on the real, filed
// PDF — the substrate for highlighting Claim Family occurrences directly
// on the document, without ever reading the PDF's (potentially corrupted)
// text-layer content. Confirmed against a real 27-page Hebrew pleading:
// the text layer's Hebrew characters were corrupted (broken font
// ToUnicode CMap), but positioned digit tokens were clean and recovered
// the true 1..220 paragraph sequence via exactly this method.
//
// Framework-agnostic: takes plain per-page text-item data (whatever
// extracted it — pdfjs-dist in the browser, or in Node for testing/tools
// — is the caller's concern), so this stays unit-testable without a PDF
// rendering environment.
//
// Anchor on the PERIOD, not the digits: Israeli legal drafting numbers
// paragraphs ".12" (dot before number — see pleadingAnchors.js). Digit
// position is useless as a column filter — an earlier version filtered on
// it and silently missed every single-digit paragraph, because a 1-digit
// "1" and a 3-digit "220" don't share a column at all (both are
// right-aligned as a whole "​.N" unit, so wider numbers push everything,
// dot included, a bit further left). Even the dot shifts by digit-count
// bracket — confirmed on a real document: three clean sub-clusters ~11pt
// apart (one per digit-count bracket), not one column. The margin-column
// filter below is deliberately wide enough to span all of them; the real
// noise gate is strict monotonicity, proven against a real document to
// reject footnote/citation digits that land in the same margin region.

const COLUMN_TOLERANCE = 16; // pt — wide enough to span every digit-count bracket's dot position
const COLUMN_BUCKET = 3; // pt, for grouping period x-positions into a histogram
const MAX_DIGIT_GAP = 15; // pt — how far left of its period a digit run may sit

function collectDotNumberPairs(items) {
  const pairs = [];

  // Case 1: dot and digits as separate items (the common case observed).
  const dots = items.filter((it) => (it.str ?? "").trim() === ".");
  for (const dot of dots) {
    let best = null;
    for (const it of items) {
      const s = (it.str ?? "").trim();
      if (!/^\d+$/.test(s)) continue;
      if (Math.abs(it.y - dot.y) > 1.5) continue;
      if (it.x <= dot.x) continue; // digits sit to the right of their dot
      const gap = it.x - dot.x;
      if (gap > MAX_DIGIT_GAP) continue;
      if (!best || it.x < best.x) best = it; // closest digit run to the dot
    }
    if (best) pairs.push({ n: parseInt(best.str.trim(), 10), x: dot.x, y: dot.y });
  }

  // Case 2: a single merged item like ".12" or ". 12" — pdf.js sometimes
  // concatenates the dot and digit into one item with an inserted space,
  // depending on the source PDF's exact glyph spacing (confirmed to
  // differ between a real Word-generated filing and a synthetic test
  // fixture built with different kerning).
  for (const it of items) {
    const m = (it.str ?? "").trim().match(/^\.\s*(\d+)$/);
    if (m) pairs.push({ n: parseInt(m[1], 10), x: it.x, y: it.y });
  }

  return pairs;
}

// pages: [{ pageNumber (1-based), height, items: [{ str, x, y }] }]
// x/y are PDF user-space coordinates (y increases upward) — the same
// frame pdfjs-dist's getTextContent() item.transform[4]/[5] give.
export function buildParagraphIndex(pages) {
  const candidates = [];
  for (const page of pages) {
    for (const pair of collectDotNumberPairs(page.items)) {
      candidates.push({ ...pair, page: page.pageNumber });
    }
  }
  if (candidates.length === 0) return { index: new Map(), columnX: null, rejected: [] };

  const xHist = new Map();
  for (const c of candidates) {
    const bucket = Math.round(c.x / COLUMN_BUCKET) * COLUMN_BUCKET;
    xHist.set(bucket, (xHist.get(bucket) ?? 0) + 1);
  }
  const [columnX] = [...xHist.entries()].sort((a, b) => b[1] - a[1])[0];

  const inColumn = candidates
    .filter((c) => Math.abs(c.x - columnX) <= COLUMN_TOLERANCE)
    .sort((a, b) => a.page - b.page || b.y - a.y); // reading order: page asc, top-to-bottom

  const accepted = [];
  const rejected = [];
  let last = 0;
  for (const c of inColumn) {
    if (c.n > last) {
      accepted.push(c);
      last = c.n;
    } else {
      rejected.push(c); // noise: footnote ref, citation number, stray digit
    }
  }

  const pageHeights = new Map(pages.map((p) => [p.pageNumber, p.height]));
  const index = new Map();
  for (let i = 0; i < accepted.length; i++) {
    const cur = accepted[i];
    const next = accepted[i + 1];
    const regions = [];
    if (!next || next.page === cur.page) {
      // Simplification for a prototype: the last paragraph in the document
      // extends only to the bottom of its own page, not to the true end
      // of a trailing marker-less page (rare, and low-stakes to miss).
      regions.push({ page: cur.page, top: cur.y, bottom: next ? next.y : 0 });
    } else {
      regions.push({ page: cur.page, top: cur.y, bottom: 0 });
      for (let p = cur.page + 1; p < next.page; p++) {
        regions.push({ page: p, top: pageHeights.get(p) ?? 0, bottom: 0 });
      }
      regions.push({ page: next.page, top: pageHeights.get(next.page) ?? 0, bottom: next.y });
    }
    index.set(cur.n, { regions });
  }

  return { index, columnX, rejected };
}
