// Derives the תקציר (summary tab) content entirely from data the pipeline
// already computed — never a new AI call, so the summary can never drift
// from the underlying claims and can appear the instant analysis finishes.
//
// Four buckets, matching docs/pleading-review-presentation-design.md's
// Part A ordering logic (cross-document alerts first, then structural,
// then per-claim), plus the two additions from the design conversation:
// a neutral "main claims" orientation list, and a severity-sorted top
// strip pulled across every category.

import { LIGHTWEIGHT_KINDS } from "./pleadingValidation.js";
import { deriveFamilies, primaryClaim } from "./claimFamilies.js";
import { relationsForFamily, alertKeyForRelation, ALERT_BANNER_TEXT, ALERT_TONE } from "./crossDocumentRelations.js";
import { pageLimitFor, checkPageLimit } from "./formalChecks.js";

const MAIN_CLAIMS_CAP = 3;
const TOP_ISSUES_CAP = 5;
const WEAKNESS_CAP = 8;
const GAP_CAP = 8;
const STRENGTH_CAP = 5;

// A lightweight node (remedy/background/procedural/conclusion) never gets
// deep QA in Pass 2 — surfacing it as a "main claim," a strength, or a
// weakness would show empty or meaningless content.
function isMainFamily(family) {
  return !LIGHTWEIGHT_KINDS.has(family.node_kind);
}

// Cross-document alerts touching this document's own families, ranked —
// deemed admissions and contradictions carry real legal consequence and
// come first; the scope-expansion flag is explicitly a low-confidence
// signal (see crossDocumentRelations.js) and sorts last among alerts.
const ALERT_RANK = [
  "deemed_admission", "contradicts", "not_addressed",
  "changed", "responds_to_partial", "responds_to_talks_past",
  "possible_scope_expansion",
];

function collectAlerts(families, allRelations, analysisId) {
  const alerts = [];
  for (const family of families) {
    for (const relation of relationsForFamily(allRelations, analysisId, family.id)) {
      const key = alertKeyForRelation(relation, analysisId, family.id);
      const label = ALERT_BANNER_TEXT[key];
      if (!label) continue; // repeats/admits/denies are the routine, unremarkable case — no alert
      alerts.push({ family, relation, key, label, tone: ALERT_TONE[key] ?? "amber" });
    }
  }
  return alerts.sort((a, b) => ALERT_RANK.indexOf(a.key) - ALERT_RANK.indexOf(b.key));
}

function structuralChecks(record) {
  const checks = [];
  const limit = pageLimitFor(record.docType, record.isInterimRelief);
  if (limit != null && record.pageCount != null) {
    const warning = checkPageLimit(record.docType, record.pageCount, record.isInterimRelief);
    checks.push({
      ok: !warning,
      label: warning ?? `עומד במגבלת ${limit} העמודים לסוג מסמך זה (${record.pageCount} עמ')`,
    });
  }
  if (record.docxCheck) {
    const findings = record.docxCheck.formatFindings ?? [];
    if (findings.length > 0) for (const f of findings) checks.push({ ok: false, label: f });
    else checks.push({ ok: true, label: "עומד בדרישות הצורניות (גופן, שוליים, גודל עמוד)" });
  }
  if (record.ocrReview?.needsManualReview) {
    checks.push({
      ok: false,
      label: `מסמך סרוק — ${record.ocrReview.unreadablePages.length} עמודים לא זוהו אוטומטית, נדרשת בדיקה ידנית`,
    });
  }
  return checks;
}

export function buildPleadingSummary({ record, allRelations }) {
  const analysis = record?.analysis;
  if (!analysis) return null;

  const claims = analysis.claims ?? [];
  const families = deriveFamilies(analysis);
  const mainFamilies = families.filter(isMainFamily);

  const mainClaims = mainFamilies
    .slice(0, MAIN_CLAIMS_CAP)
    .map((f) => ({ id: f.id, text: f.canonical_text }));

  const structural = structuralChecks(record);
  const alerts = collectAlerts(families, allRelations ?? [], analysis.id);
  const familiesWithAlert = new Set(alerts.map((a) => a.family.id));

  const weaknesses = [];
  const gaps = [];
  const strengths = [];
  for (const family of mainFamilies) {
    const claim = primaryClaim(family, claims);
    const qa = claim?.qa;
    if (!qa) continue;

    const weaknessText = qa.key_vulnerability || qa.weaknesses?.[0] || null;
    if (weaknessText) weaknesses.push({ family, text: weaknessText, hasAlert: familiesWithAlert.has(family.id) });

    if (qa.authority_gap) gaps.push({ family, text: "נטענת ללא אסמכתא משפטית" });
    if (qa.evidence_gap) gaps.push({ family, text: "נטענת ללא עיגון ראייתי הנדרש בשלב זה" });
    if (qa.logical_gap_flag && qa.logical_gap) gaps.push({ family, text: qa.logical_gap });
    for (const m of qa.missing ?? []) gaps.push({ family, text: m });

    // Curated, not exhaustive — a claim only counts as a strength worth
    // surfacing when it's genuinely clean: real support, no weakness, no
    // gap flag. Every claim has *something* in supported_by almost by
    // construction, so this list intentionally stays short.
    const isClean =
      (qa.supported_by?.length ?? 0) > 0 &&
      !weaknessText &&
      !qa.evidence_gap && !qa.authority_gap && !qa.logical_gap_flag;
    if (isClean) strengths.push({ family, text: qa.supported_by[0] });
  }

  // The handful that matter most, across every category — cross-document
  // alerts first (real legal consequence), then structural failures
  // (objective, quick to state), then whichever weaknesses aren't already
  // covered by an alert above.
  const topIssues = [];
  for (const a of alerts) {
    if (topIssues.length >= TOP_ISSUES_CAP) break;
    topIssues.push({ tone: a.tone, label: a.label, family: a.family });
  }
  for (const s of structural.filter((c) => !c.ok)) {
    if (topIssues.length >= TOP_ISSUES_CAP) break;
    topIssues.push({ tone: "red", label: s.label, family: null });
  }
  for (const w of weaknesses.filter((w) => !w.hasAlert)) {
    if (topIssues.length >= TOP_ISSUES_CAP) break;
    topIssues.push({ tone: "red", label: w.text, family: w.family });
  }

  return {
    mainClaims,
    topIssues,
    structural,
    alerts,
    weaknesses: weaknesses.slice(0, WEAKNESS_CAP),
    gaps: gaps.slice(0, GAP_CAP),
    strengths: strengths.slice(0, STRENGTH_CAP),
  };
}
