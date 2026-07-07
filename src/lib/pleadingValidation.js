// Validation for pleading-analysis model output.
// Two jobs: (1) structural checks that trigger a single retry,
// (2) source-span verification against the actual document text.

export const NODE_KINDS = new Set([
  "main_claim", "factual_allegation", "legal_proposition",
  "contractual_interpretation", "denial", "remedy", "damages",
  "procedural", "alternative", "background", "conclusion",
]);

// Kinds that are listed but skip deep QA — a prayer for relief must not
// be flagged for evidence gaps like a factual allegation.
export const LIGHTWEIGHT_KINDS = new Set(["remedy", "background", "procedural", "conclusion"]);

export const EMPTY_QA = {
  supported_by: [], weaknesses: [], missing: [],
  logical_gap: null, unstated_assumption: null,
  key_vulnerability: null, suggested_arguments: [], annexes_to_review: [],
  evidence_gap: false, authority_gap: false, logical_gap_flag: false,
};

const GENERIC_QA_PATTERNS = [
  /ראיה נוספת (תחזק|תסייע|תועיל)/,
  /עדות? (נוספת|תומכת) (תחזק|תסייע)/,
  /יש לבחון את/,
  /מומלץ לבדוק/,
  /ניתן לחזק את הטענה/,
  /אסמכתא נוספת/,
];

function isGenericQaItem(item) {
  if (typeof item !== "string") return true;
  const t = item.trim();
  if (t.length < 15) return true;
  return GENERIC_QA_PATTERNS.some((re) => re.test(t));
}

export function validatePass1(result) {
  const errors = [];
  if (!result?.document?.type) errors.push("document.type missing");
  if (!result?.theory_of_case) errors.push("theory_of_case missing");
  if (!Array.isArray(result?.claims) || result.claims.length === 0)
    errors.push("claims missing or empty");
  for (const c of result?.claims ?? []) {
    if (!c.id) errors.push("claim without id");
    if (!c.text) errors.push(`claim ${c.id}: text missing`);
    if (!c.verbatim) errors.push(`claim ${c.id}: verbatim missing`);
    if (!NODE_KINDS.has(c.node_kind))
      errors.push(`claim ${c.id}: node_kind missing or invalid (got: ${c.node_kind})`);
    if (!Array.isArray(c.source_spans) || c.source_spans.length === 0)
      errors.push(`claim ${c.id}: source_spans missing`);
  }
  return errors;
}

export function validatePass2(result, claimId) {
  const errors = [];
  const qa = result?.qa;
  if (!qa) {
    errors.push(`claim ${claimId}: qa missing`);
    return errors;
  }
  for (const field of ["supported_by", "weaknesses", "missing"]) {
    if (!Array.isArray(qa[field])) {
      errors.push(`claim ${claimId}: qa.${field} not an array`);
      continue;
    }
    const generic = qa[field].filter(isGenericQaItem);
    if (generic.length > 0)
      errors.push(
        `claim ${claimId}: generic qa.${field} items: ${generic.slice(0, 2).join(" | ")}`
      );
  }
  if (typeof qa.evidence_gap !== "boolean") errors.push(`claim ${claimId}: evidence_gap not boolean`);
  if (typeof qa.authority_gap !== "boolean") errors.push(`claim ${claimId}: authority_gap not boolean`);
  return errors;
}

// Source-span drift check: mark each span verified when its excerpt
// actually appears in the document (whitespace-normalized).
export function verifySourceSpans(node, documentText) {
  const normalizedDoc = documentText.replace(/\s+/g, " ");
  const verify = (spans) =>
    (spans ?? []).map((s) => ({
      ...s,
      verified:
        typeof s.excerpt === "string" &&
        s.excerpt.length > 0 &&
        normalizedDoc.includes(s.excerpt.replace(/\s+/g, " ")),
    }));
  return { ...node, source_spans: verify(node.source_spans) };
}
