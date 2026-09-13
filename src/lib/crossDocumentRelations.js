// UI-facing helpers for cross-document relations. Salience — which
// findings get promoted into the main Claim Family view versus staying in
// History — is deliberately computed here, never model output: "is this
// worth interrupting the lawyer for" is a product policy call, not a fact
// the model should decide, and a pure function means the policy can change
// later and apply to every existing analysis for free, with no re-run.

import { LIGHTWEIGHT_KINDS } from "./pleadingValidation.js";

export function computeSalience(relation) {
  if (!relation) return "low";
  if (relation.type === "possible_scope_expansion") return "high";
  if (relation.confidence === "low") return "low";
  if (relation.type === "contradicts") return "high";
  if (relation.type === "changed") return "high";
  if (relation.type === "not_addressed") return "high";
  if (relation.type === "responds_to" && (relation.stance === "partial" || relation.stance === "talks_past")) return "high";
  return "low";
}

// A reply (כתב תשובה) or reply-in-support-of-motion (תשובה לתגובה) may not
// raise a new cause-of-action ground or content inconsistent with the
// party's prior contentions — תקנה 18(א). The only signal available
// without a new AI call is a NEGATIVE one: this family has no confirmed
// relation at all to anything in the document(s) it was marked as
// responding to. That's a necessary but not sufficient sign of improper
// new material (a real match can be missed by recall, or the reply may
// simply rebut something in the response/defense that was never itself
// matched back to the original pleading) — hence "possible", never
// asserted as a finding, and salience "high" with confidence "low" kept
// deliberately visible in the UI rather than hidden.
//
// This only reliably covers what it was actually checked against: a
// reply marked as responding to just the defense (not also the
// complaint) can't tell "genuinely new" apart from "repeats the
// complaint in different words" — see PleadingUpload's respondsTo hint.
const SCOPE_CHECKED_DOC_TYPES = new Set(["reply", "reply_to_motion"]);

export function possibleScopeExpansion(family, relations, analysisId, docType) {
  if (!SCOPE_CHECKED_DOC_TYPES.has(docType)) return false;
  if (LIGHTWEIGHT_KINDS.has(family.node_kind)) return false;
  return !(relations ?? []).some((r) => r.subject.analysisId === analysisId && r.subject.familyId === family.id);
}

// תקנה 14(ב) (as amended תשפ"א-2020, verbatim text confirmed by the
// user — see docs/stage2-document-type-rules.md Addendum 2): the
// defendant is deemed to admit every fact in the complaint except one
// denied explicitly, in detail, and specifically in the defense's third
// (detailed) part — with an express carve-out for the amount of
// damages, which stays disputed absent an explicit admission.
//
// Scoped narrowly on purpose: the verbatim text names "הנתבע" and "כתב
// התביעה" specifically, so this only applies to a not_addressed relation
// whose unanswered fact originated in a complaint and whose silent
// document is a defense. Not yet confirmed to generalize to any other
// document-type pair (e.g. a reply's silence toward a defense) — every
// other not_addressed case keeps the softer "no response identified"
// wording.
export function isDeemedAdmission(relation, { subjectDocType, targetDocType, subjectNodeKind } = {}) {
  if (relation?.type !== "not_addressed") return false;
  if (subjectDocType !== "statement_of_claim") return false;
  if (targetDocType !== "statement_of_defense") return false;
  if (subjectNodeKind === "damages") return false;
  return true;
}

// Synthesizes one pseudo-relation per flagged family, in the same shape
// every other relation uses, so it flows through relationsForFamily /
// computeSalience / the History and alert UI with zero special-casing
// beyond the couple of null-target guards those already needed for
// not_addressed. Computed fresh at render time from already-stored
// data — never persisted onto analysis.cross_document_relations, and
// never a new AI call.
export function deriveScopeExpansionRelations(record) {
  const analysis = record?.analysis;
  if (!analysis || !SCOPE_CHECKED_DOC_TYPES.has(record.docType)) return [];
  const relations = analysis.cross_document_relations ?? [];
  const families = analysis.claim_families ?? [];
  return families
    .filter((f) => possibleScopeExpansion(f, relations, analysis.id, record.docType))
    .map((f) => ({
      id: `scope-expansion-${analysis.id}-${f.id}`,
      type: "possible_scope_expansion",
      subject: { analysisId: analysis.id, familyId: f.id },
      target: null,
      stance: null,
      confidence: "low",
      rationale: "טענה זו אינה מתקשרת לאף טענה קודמת במסמכים שסומנו כמענה — ייתכן שמדובר בחומר חדש שאינו מותר בשלב זה (תקנה 18(א)).",
    }));
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
      (r.target?.analysisId === analysisId && r.target?.familyId === familyId)
  );
}

export function highSalienceRelationsForFamily(relations, analysisId, familyId) {
  return relationsForFamily(relations, analysisId, familyId).filter((r) => computeSalience(r) === "high");
}

// Worst-first ordering when only one alert can be shown at a time (the
// compact list-row signal) — a family with several high-salience
// relations still surfaces just the most important one there.
export const ALERT_PRIORITY = ["contradicts", "not_addressed", "possible_scope_expansion", "changed", "responds_to"];

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
