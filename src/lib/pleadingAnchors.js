// Anchor engine for the annotated-document view: maps each analyzed claim
// to the paragraphs of the pleading it came from, using its source-span
// excerpts (fragment matching, same normalization as the drift check) with
// the span's paragraph number as fallback. Pure functions — no React.

const normalize = (s) => (s ?? "").replace(/\s+/g, " ").trim();

// Split the extracted pleading text into display paragraphs. A new numbered
// paragraph starts a block; Israeli legal drafting numbers paragraphs either
// "12." or ".12" (dot-before-number is the common convention — confirmed
// against real filed pleadings, not just a transcription quirk), with
// ".12.3"-style sub-numbering. Lettered sub-items ("א.", "ב.") mark their
// own block the same way. Blank lines separate unnumbered blocks (headings,
// footer).
const NUMBER_MARKER = /^\s*\.?(\d+(?:\.\d+)*)\.?\s+(.*)$/;
const LETTER_MARKER = /^\s*([א-ת])\.\s+(.*)$/;

export function splitParagraphs(pleadingText) {
  const lines = pleadingText.split(/\r?\n/);
  const paragraphs = [];
  let current = null;

  const flush = () => {
    if (current && current.text.trim()) paragraphs.push(current);
    current = null;
  };

  for (const line of lines) {
    const numbered = line.match(NUMBER_MARKER);
    if (numbered && numbered[2].trim().length > 0) {
      flush();
      current = { number: numbered[1], text: numbered[2] };
      continue;
    }
    const lettered = line.match(LETTER_MARKER);
    if (lettered && lettered[2].trim().length > 0) {
      flush();
      current = { number: lettered[1], text: lettered[2] };
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    // Joined with a space, not a hard newline: pdf-parse's line breaks are
    // the ORIGINAL PDF's own page-width wrap points, not real paragraph
    // structure — preserving them as hard breaks forces every paragraph
    // to re-break at those same points inside our narrower column
    // (visually choppy, mid-sentence "cut" lines), and a hard break is
    // also its own bidi paragraph separator, so a parenthetical or other
    // punctuation pair that happened to straddle a PDF line-wrap got
    // bidi-reordered as two unrelated fragments instead of one run.
    // Joining with a space lets the paragraph reflow naturally to the
    // container's actual width, the same as any other prose text.
    if (current) current.text += (/[\s-]$/.test(current.text) ? "" : " ") + line.trim();
    else current = { number: null, text: line.trim() };
  }
  flush();
  return paragraphs.map((p, i) => ({ ...p, index: i, norm: normalize(p.text) }));
}

// Note kinds a claim contributes to its anchored paragraphs, by severity.
export function claimMarkers(claim) {
  const qa = claim.qa;
  if (!qa) return [];
  const markers = [];
  if (qa.key_vulnerability) markers.push("vulnerability");
  if (qa.evidence_gap || qa.authority_gap || qa.logical_gap_flag) markers.push("gap");
  if (qa.suggested_arguments?.length) markers.push("suggestion");
  return markers;
}

// Fragments of an excerpt (split on ellipses), long enough to be meaningful.
function fragments(excerpt) {
  return (excerpt ?? "")
    .split(/(?:\.\.\.|…|\[\.\.\.\])/)
    .map(normalize)
    .filter((f) => f.length >= 12);
}

// Map every claim (mains + subs) to paragraph indexes.
// Returns { byParagraph: Map<paragraphIndex, claimIds[]>, unanchored: claimIds[] }
export function anchorClaims(paragraphs, claims) {
  const byParagraph = new Map();
  const unanchored = [];

  const add = (paraIndex, claimId) => {
    const list = byParagraph.get(paraIndex) ?? [];
    if (!list.includes(claimId)) list.push(claimId);
    byParagraph.set(paraIndex, list);
  };

  for (const claim of claims) {
    let anchored = false;

    for (const span of claim.source_spans ?? []) {
      // 1) excerpt fragment match against paragraph text
      for (const frag of fragments(span.excerpt)) {
        for (const p of paragraphs) {
          if (p.norm.includes(frag)) {
            add(p.index, claim.id);
            anchored = true;
          }
        }
      }
      // 2) fallback: the span's paragraph number
      if (!anchored && span.paragraph != null) {
        const target = paragraphs.find((p) => p.number === String(span.paragraph));
        if (target) {
          add(target.index, claim.id);
          anchored = true;
        }
      }
    }

    if (!anchored) unanchored.push(claim.id);
  }

  return { byParagraph, unanchored };
}
