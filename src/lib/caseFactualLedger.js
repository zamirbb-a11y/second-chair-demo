// Case Factual Ledger — Phase 1 of the Pleadings -> case-analysis bridge
// (see docs/pleadings-case-bridge-design.md). A pure, deterministic
// rollup of every pleading already analyzed in this case: admissions,
// disputed propositions, position changes, procedural gaps (including
// deemed admissions), possible scope-expansion flags, and relief
// requested. Every entry is a POINTER back to {analysisId, familyId} —
// never a copy of the claim text — so there is exactly one place the
// actual wording lives, and the Ledger can never drift from it.
//
// Deliberately NOT a "case facts" table: every entry keeps the same
// cautious vocabulary already used throughout the Pleadings feature
// (disputed / admitted / no response identified / deemed admission).
// Nothing here is promoted to "established fact" — the inputs (pleaded
// allegations and their cross-document relations) can never support
// that conclusion on their own. See the design doc's Phase 3 discussion
// for what a genuine "established fact" layer would need.
//
// No new AI call: this is a pure function of already-stored records,
// so it recomputes automatically and for free the moment a new
// pleading is added — nothing here needs to be re-run or migrated.

import { buildCaseRelations } from "./crossDocumentRelations.js";
import { deriveFamilies } from "./claimFamilies.js";

const RELIEF_NODE_KINDS = new Set(["remedy", "damages"]);

export function buildCaseFactualLedger(records) {
  const relations = buildCaseRelations(records);

  const admissions = [];
  const disputedPropositions = [];
  const positionChanges = [];
  const proceduralGaps = [];
  const possibleScopeExpansions = [];

  for (const r of relations) {
    if (r.type === "possible_scope_expansion") {
      possibleScopeExpansions.push(r);
    } else if (r.type === "not_addressed") {
      proceduralGaps.push(r);
    } else if (r.type === "changed") {
      positionChanges.push(r);
    } else if (r.type === "contradicts" || (r.type === "responds_to" && r.stance === "denies")) {
      disputedPropositions.push(r);
    } else if (r.type === "responds_to" && r.stance === "admits") {
      admissions.push(r);
    }
  }

  const reliefRequested = records.flatMap((r) =>
    deriveFamilies(r.analysis)
      .filter((f) => RELIEF_NODE_KINDS.has(f.node_kind))
      .map((f) => ({ analysisId: r.analysis?.id, familyId: f.id, party: r.party, docTitle: r.title }))
  );

  return { admissions, disputedPropositions, positionChanges, proceduralGaps, possibleScopeExpansions, reliefRequested };
}
