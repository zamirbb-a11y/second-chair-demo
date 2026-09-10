// Cross-document relations: how this document's Claim Families relate to
// the Claim Families of whatever prior pleading(s) it responds to. Same
// two-stage, conservative discipline as claimFamilyClustering.js — cheap
// embedding recall proposes candidates, a narrow LLM call per family
// decides the actual relation (or that there isn't one), and every
// response is checked to only ever name a real candidate id.
//
// Additive and fail-safe: relations live in analysis.cross_document_relations,
// never touch claims or claim_families, and any failure here (embedding,
// confirm, or not-addressed) leaves the relation set empty/partial rather
// than blocking or corrupting the rest of the analysis.
//
// Validated against a real complaint+defense pair before this was written
// as pipeline code — see project memory for the validation results.

import { cosineSimilarity } from "./claimFamilyClustering.js";

const RECALL_FLOOR = 0.45; // generous — a response shares less vocabulary with the claim it answers than a restatement does
const TOP_K = 5;
const LIGHTWEIGHT_KINDS = new Set(["remedy", "background", "procedural", "conclusion"]);

function extractValidTargetId(rawId, validIds) {
  if (validIds.includes(rawId)) return rawId;
  const match = String(rawId ?? "").match(/^[A-Za-z]+\d+/);
  return match && validIds.includes(match[0]) ? match[0] : null;
}

// priorDocs: [{ analysisId, party, families: ClaimFamily[] }] — the
// document(s) this one was marked as responding to at upload time
// (explicit user input, never inferred). currentFamilies: this document's
// own families. Returns relations with subject/target analysisId "self"
// standing in for this document's own (not-yet-assigned) analysis id —
// the caller resolves that once it's known.
//
// Each prior family keeps its own document's party label rather than a
// single shared one — a candidate set for one current family can draw
// from more than one prior document (respondsTo can name several), and an
// earlier version that passed one priorParty for the whole call mislabeled
// candidates whenever those documents had different parties.
export async function buildCrossDocumentRelations(currentFamilies, priorDocs, post, { currentParty } = {}) {
  const priorPool = priorDocs.flatMap((d) => (d.families ?? []).map((f) => ({ ...f, _analysisId: d.analysisId, _party: d.party })));
  if (currentFamilies.length === 0 || priorPool.length === 0) return [];

  let embeddings = [];
  try {
    const items = [
      ...currentFamilies.map((f) => ({ id: `cur:${f.id}`, text: f.canonical_text })),
      ...priorPool.map((f) => ({ id: `pri:${f._analysisId}:${f.id}`, text: f.canonical_text })),
    ];
    ({ embeddings = [] } = await post("embed", { items }));
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    console.error("Cross-document relation embedding failed (non-blocking):", err);
    return [];
  }
  const vecById = new Map(embeddings.map((e) => [e.id, e.vector]));

  const relations = [];
  for (const cur of currentFamilies) {
    const curVec = vecById.get(`cur:${cur.id}`);
    if (!curVec) continue;
    const scored = priorPool
      .map((p) => ({ family: p, sim: cosineSimilarity(curVec, vecById.get(`pri:${p._analysisId}:${p.id}`) ?? []) }))
      .filter((s) => s.sim >= RECALL_FLOOR)
      .sort((a, b) => b.sim - a.sim)
      .slice(0, TOP_K);
    if (scored.length === 0) continue;

    try {
      const result = await post("confirmRelation", {
        currentFamily: { id: cur.id, text: cur.canonical_text },
        currentParty,
        candidates: scored.map((s) => ({ id: s.family.id, text: s.family.canonical_text, node_kind: s.family.node_kind, party: s.family._party })),
      });
      const validIds = scored.map((s) => s.family.id);
      for (const r of result.relations ?? []) {
        const targetId = extractValidTargetId(r.target_id, validIds);
        if (!targetId) continue; // parse failure — never invent a relation to a made-up id
        const targetFamily = scored.find((s) => s.family.id === targetId).family;
        relations.push({
          id: `R${relations.length + 1}`,
          type: r.type,
          subject: { analysisId: "self", familyId: cur.id },
          target: { analysisId: targetFamily._analysisId, familyId: targetId },
          stance: r.stance ?? null,
          confidence: r.confidence,
          rationale: r.rationale,
        });
      }
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      console.error(`Cross-document relation confirm failed for family ${cur.id} (non-blocking):`, err);
    }
  }

  // not_addressed: substantive prior families nobody confirmed a relation to.
  // Deterministic set-difference, zero extra cost — then one bounded
  // verification call so it's never asserted purely from an absence.
  const targetedKeys = new Set(relations.map((r) => `${r.target.analysisId}:${r.target.familyId}`));
  const unmatched = priorPool.filter(
    (p) => !targetedKeys.has(`${p._analysisId}:${p.id}`) && !LIGHTWEIGHT_KINDS.has(p.node_kind)
  );
  if (unmatched.length > 0) {
    try {
      const result = await post("notAddressed", {
        candidates: unmatched.map((p) => ({ id: p.id, text: p.canonical_text })),
        currentFamiliesSummary: currentFamilies.map((f) => ({ id: f.id, text: f.canonical_text })),
      });
      for (const r of result.results ?? []) {
        if (!r.confirmed_not_addressed) continue;
        const family = unmatched.find((p) => p.id === r.id);
        if (!family) continue;
        relations.push({
          id: `R${relations.length + 1}`,
          type: "not_addressed",
          subject: { analysisId: family._analysisId, familyId: family.id },
          target: { analysisId: "self", familyId: null },
          stance: null,
          confidence: r.confidence,
          rationale: r.rationale,
        });
      }
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      console.error("Cross-document not_addressed verification failed (non-blocking):", err);
    }
  }

  return relations;
}

// Relations come back with "self" standing in for this document's own
// (not-yet-assigned) analysis id — resolve once the real id is known,
// right before the relations are attached to the final analysis object.
export function resolveSelfReferences(relations, analysisId) {
  return relations.map((r) => ({
    ...r,
    subject: r.subject.analysisId === "self" ? { ...r.subject, analysisId } : r.subject,
    target: r.target.analysisId === "self" ? { ...r.target, analysisId } : r.target,
  }));
}
