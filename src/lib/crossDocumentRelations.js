// UI-facing helpers for cross-document relations. Salience — which
// findings get promoted into the main Claim Family view versus staying in
// History — is deliberately computed here, never model output: "is this
// worth interrupting the lawyer for" is a product policy call, not a fact
// the model should decide, and a pure function means the policy can change
// later and apply to every existing analysis for free, with no re-run.

export function computeSalience(relation) {
  if (!relation || relation.confidence === "low") return "low";
  if (relation.type === "contradicts") return "high";
  if (relation.type === "changed") return "high";
  if (relation.type === "not_addressed") return "high";
  if (relation.type === "responds_to" && (relation.stance === "partial" || relation.stance === "talks_past")) return "high";
  return "low";
}

// Relations touching this family, from either side — a family can be the
// side asserting a relation (subject) or the side compared against
// (target, e.g. a prior claim later marked not_addressed). Covers both so
// a family's History reads correctly regardless of which document's
// analysis actually computed the relation — this is also what lets History
// grow into a real chain later (Complaint -> Defense -> Reply) with no
// redesign: each relation just names two (analysisId, familyId) pairs,
// and a third document's relations slot into the same list.
export function relationsForFamily(relations, analysisId, familyId) {
  return (relations ?? []).filter(
    (r) =>
      (r.subject.analysisId === analysisId && r.subject.familyId === familyId) ||
      (r.target.analysisId === analysisId && r.target.familyId === familyId)
  );
}

export function highSalienceRelationsForFamily(relations, analysisId, familyId) {
  return relationsForFamily(relations, analysisId, familyId).filter((r) => computeSalience(r) === "high");
}

// Worst-first ordering when only one alert can be shown at a time (the
// compact list-row signal) — a family with several high-salience
// relations still surfaces just the most important one there.
export const ALERT_PRIORITY = ["contradicts", "not_addressed", "changed", "responds_to"];

export function sortByAlertPriority(rels) {
  return [...rels].sort((a, b) => ALERT_PRIORITY.indexOf(a.type) - ALERT_PRIORITY.indexOf(b.type));
}

// Document-level rollup, entirely derived from this document's own
// cross_document_relations — never a separate model-written summary, so it
// can never drift from the relations it's summarizing.
export function summarizeCrossDocumentRelations(relations, currentAnalysisId, currentFamilies) {
  const subjectKeys = new Set(
    (relations ?? [])
      .filter((r) => r.type !== "not_addressed")
      .map((r) => `${r.subject.analysisId}:${r.subject.familyId}`)
  );
  const newCount = (currentFamilies ?? []).filter((f) => !subjectKeys.has(`${currentAnalysisId}:${f.id}`)).length;

  const byType = {};
  for (const r of relations ?? []) byType[r.type] = (byType[r.type] ?? 0) + 1;

  const responds = (relations ?? []).filter((r) => r.type === "responds_to");
  const byStance = {};
  for (const r of responds) if (r.stance) byStance[r.stance] = (byStance[r.stance] ?? 0) + 1;

  return {
    new: newCount,
    repeats: byType.repeats ?? 0,
    changed: byType.changed ?? 0,
    contradicts: byType.contradicts ?? 0,
    respondsTo: responds.length,
    byStance, // {admits, denies, partial, talks_past}
    notAddressed: byType.not_addressed ?? 0,
  };
}
