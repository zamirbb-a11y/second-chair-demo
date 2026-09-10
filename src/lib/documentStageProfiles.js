// Document-type-aware analysis profiles for Pleadings QA (Pass 2).
//
// The bug this fixes: Pass 2's QA rules were written once and applied to
// every document type, so "this factual claim isn't backed by evidence"
// got flagged as a weakness even in a complaint or defense — where, under
// Israeli civil procedure, a party is not required to prove its factual
// allegations inside the pleading itself. The identical absence IS a real
// weakness once the case reaches written summations, when the evidentiary
// record is closed. Conflating "not yet proven" with "deficient" was the
// exact false-positive/false-negative pattern reported.
//
// Sourcing discipline: every profile note below is tagged [VERIFIED] (a
// specific תקנה of תקנות סדר הדין האזרחי, תשע"ט-2018, checked against the
// regulation text — see docs/stage2-document-type-rules.md for the full
// sourced research memo) or [PRODUCT JUDGMENT] (a litigation-practice
// inference with no regulation cited). Don't add a rule here without
// updating that memo's own verified/judgment/open-question breakdown —
// the two are meant to stay in sync and auditable against each other.
//
// This is a pure classification — no AI call, no case-level state. It
// only decides which paragraph of Pass 2 prompt guidance applies.

export const STAGE = {
  PLEADING: "pleading",   // complaint, defense, reply to defense
  MOTION: "motion",       // motion, response to motion, reply to response
  SUMMATION: "summation", // written summations
  UNKNOWN: "unknown",
};

const DOC_TYPE_TO_STAGE = {
  statement_of_claim: STAGE.PLEADING,
  statement_of_defense: STAGE.PLEADING,
  // כתב תשובה — same "not required to prove" logic as complaint/defense.
  // [VERIFIED — תקנה 18] restricts the reply's CONTENT (no new cause-of-
  // action ground, no inconsistency with prior contentions) but imposes
  // no evidentiary obligation beyond the ordinary pleading standard.
  reply: STAGE.PLEADING,
  motion: STAGE.MOTION,
  response: STAGE.MOTION,
  reply_to_motion: STAGE.MOTION,
  summation: STAGE.SUMMATION,
};

export function stageForDocType(docType) {
  return DOC_TYPE_TO_STAGE[docType] ?? STAGE.UNKNOWN;
}

// evidentiaryStandard drives which instruction paragraph Pass 2 gets
// (see buildEvidentiaryStandardBlock in pleadingPass2.js) — never a
// separate AI call, just a choice of prompt text.
export const STAGE_PROFILES = {
  [STAGE.PLEADING]: {
    label: "כתב טענות (תביעה / הגנה / תשובה)",
    evidentiaryStandard: "not_required",
    // [VERIFIED — תקנה 14] the pleading states the material facts; it
    // does not need to establish them there. [VERIFIED — תקנה 15] the
    // one real, checkable attachment duty is for a "material document"
    // (מסמך מהותי) integral to the cause of action (e.g. the contract
    // sued on) — a distinct, narrower rule from "cite evidence for every
    // factual claim," and the only evidentiary-shaped item worth flagging
    // at this stage.
  },
  [STAGE.MOTION]: {
    label: "בקשה / תגובה לבקשה / תשובה לתגובה",
    evidentiaryStandard: "affidavit_required",
    // [LIKELY, per תקנה 50] factual assertions in a motion or its
    // response are expected to be verified by an accompanying תצהיר —
    // the mirror image of the pleading-stage rule above: here, an
    // unsupported factual assertion IS a legitimate flag.
  },
  [STAGE.SUMMATION]: {
    label: "סיכומים",
    evidentiaryStandard: "record_required",
    // [PRODUCT JUDGMENT — no specific regulation found requiring a
    // record citation in summations, but this is well-understood
    // litigation practice once the evidentiary stage has closed] a
    // factual proposition with nothing in the evidentiary record behind
    // it (no exhibit, no testimony, no admission) is a real weakness
    // here, the mirror image of the pleading-stage rule.
  },
  [STAGE.UNKNOWN]: {
    label: "מסמך לא מסווג",
    // Stays on the least aggressive setting — an unclassified document
    // should never trigger a rule more eagerly than the stage it was
    // modeled on would.
    evidentiaryStandard: "not_required",
  },
};

export function stageProfileForDocType(docType) {
  return STAGE_PROFILES[stageForDocType(docType)];
}
