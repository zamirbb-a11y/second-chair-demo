// Recall stage for Claim Families: pure-JS cosine-similarity clustering
// over claim-text embeddings. This never decides a merge — it only
// proposes candidate groups for the LLM confirm step (see
// src/prompts/pleadingClaimFamilies.js), which is the actual, conservative
// gate. A threshold that's too loose here is safe (the confirm step will
// split a bad candidate back apart); too tight would hide real
// restatements from ever reaching the confirm step in the first place.

// Lowered from an initial 0.83 after a real-document validation run: two
// genuine restatements (a verbose elaboration at 0.797, and a looser
// restatement at 0.767) fell just under 0.83 and never reached the confirm
// stage at all. Recall being generous is safe — confirmFamily is the
// actual, conservative merge gate; a wider net here only means a few more
// small, cheap confirm calls. Note this doesn't catch everything: a
// restatement in genuinely different vocabulary (0.58 similarity in one
// observed case) is out of reach for embedding similarity at any
// reasonable threshold — a known gap, not something to chase by tuning
// this number alone.
const SIMILARITY_THRESHOLD = 0.75;
const MAX_CANDIDATE_GROUP_SIZE = 8;

export function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// embeddings: [{id, vector}]. Returns candidate groups as arrays of ids —
// an item with no similar neighbor comes back as its own one-item group.
export function buildCandidateGroups(embeddings, { threshold = SIMILARITY_THRESHOLD } = {}) {
  const n = embeddings.length;
  const parent = embeddings.map((_, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (cosineSimilarity(embeddings[i].vector, embeddings[j].vector) >= threshold) union(i, j);
    }
  }

  const groups = new Map();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(embeddings[i].id);
  }

  const result = [];
  for (const ids of groups.values()) {
    if (ids.length <= MAX_CANDIDATE_GROUP_SIZE) {
      result.push(ids);
      continue;
    }
    // Pathologically large cluster (shouldn't happen for a real pleading's
    // claim count) — don't hand the model an oversized, unreliable group;
    // split into smaller chunks instead of silently trusting one big merge.
    console.warn(`claim family candidate group of ${ids.length} exceeds cap, splitting`);
    for (let i = 0; i < ids.length; i += MAX_CANDIDATE_GROUP_SIZE) {
      result.push(ids.slice(i, i + MAX_CANDIDATE_GROUP_SIZE));
    }
  }
  return result;
}

// A sub-claim's parent_id is known with certainty from Pass 2's own
// decomposition — never something to infer from embedding similarity.
// Without this, a compound claim split into two very different halves as
// sub-claims can land in separate candidate groups (each half can have
// genuinely low similarity to the OTHER half, and sometimes to the full
// parent text too — that's exactly what happened on a real document: a
// denial's two halves, "X did not do A" and "X did, however, do B",
// clustered with the parent unevenly and left one half a singleton
// family). That singleton then reads as spurious "new material" to every
// downstream cross-document check, since it never merged into a family
// that already has a cross-document relation via its parent/sibling.
//
// This only forces a shared CANDIDATE group — confirmFamily (the actual,
// conservative merge gate) still decides whether the parent and its
// children really are one family or genuinely distinct propositions.
export function mergeParentChildGroups(candidateGroups, allClaims, { maxGroupSize = MAX_CANDIDATE_GROUP_SIZE } = {}) {
  const groupIndexById = new Map();
  candidateGroups.forEach((ids, i) => ids.forEach((id) => groupIndexById.set(id, i)));

  const parent = candidateGroups.map((_, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  for (const claim of allClaims) {
    if (!claim.parent_id) continue;
    const childGroup = groupIndexById.get(claim.id);
    const parentGroup = groupIndexById.get(claim.parent_id);
    if (childGroup !== undefined && parentGroup !== undefined) union(childGroup, parentGroup);
  }

  const merged = new Map();
  candidateGroups.forEach((ids, i) => {
    const root = find(i);
    if (!merged.has(root)) merged.set(root, []);
    merged.get(root).push(...ids);
  });

  const result = [];
  for (const ids of merged.values()) {
    if (ids.length <= maxGroupSize) {
      result.push(ids);
      continue;
    }
    for (let i = 0; i < ids.length; i += maxGroupSize) result.push(ids.slice(i, i + maxGroupSize));
  }
  return result;
}
