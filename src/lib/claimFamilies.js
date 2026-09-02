// UI-facing helpers for Claim Families. Components should always think in
// terms of families, never raw claims directly — deriveFamilies falls back
// to "every claim is its own family" for analyses saved before this
// feature shipped (or when clustering failed to produce anything for a
// run), so ClaimList/ClaimDetail need no special-casing for old records.
//
// The fallback family's id is deliberately the raw claim's own id — that
// keeps a `reviewed` map keyed by family id working unchanged for old
// records with no migration needed.

export function deriveFamilies(analysis) {
  if (analysis?.claim_families?.length) return analysis.claim_families;
  return (analysis?.claims ?? []).map((c) => ({
    id: c.id,
    canonical_text: c.text,
    node_kind: c.node_kind,
    member_ids: [c.id],
    primary_member_id: c.id,
    rationale: null,
    spans: c.source_spans ?? [],
    case_relations: [],
  }));
}

export function familyMembers(family, claims) {
  const byId = new Map(claims.map((c) => [c.id, c]));
  return (family?.member_ids ?? []).map((id) => byId.get(id)).filter(Boolean);
}

export function primaryClaim(family, claims) {
  if (!family) return null;
  const byId = new Map(claims.map((c) => [c.id, c]));
  return byId.get(family.primary_member_id) ?? familyMembers(family, claims)[0] ?? null;
}

export function familyHasGap(family, claims) {
  const primary = primaryClaim(family, claims);
  const qa = primary?.qa;
  return !!(qa && (qa.evidence_gap || qa.authority_gap || qa.logical_gap_flag));
}

export function familyContaining(families, claimId) {
  return families.find((f) => f.member_ids.includes(claimId)) ?? null;
}
