// Client-side orchestrator for the pleading analysis pipeline.
// Drives /api/analyze-pleading step by step (skeleton → per-claim QA →
// coverage audit (+ targeted recheck) → references), so no single server
// call can hit Vercel's maxDuration cap. Used by PleadingAnalysisView in
// the browser and by scripts/test-analyze-pleading.mjs in node.
//
// Callbacks (all optional):
//   on.stage(stage)                     "skeleton"|"claims"|"audit"|"references"|"families"|"relations"
//   on.skeleton({document, theory_of_case, claims, coverage_notes})
//   on.claim({claim_id, qa, sub_claims, source_spans})
//   on.claimError(claimId)
//   on.claimsAdded(claims)              recheck found missed claims
//   on.audit(warnings)
//   on.references({authorities, evidence_refs, quotations})
//   on.families(claimFamilies)
//   on.relations(crossDocumentRelations)
// Returns the fully assembled PleadingAnalysis (also passed to on.done).
//
// Claim Families: a derived grouping layer over `claims`, computed after
// every raw claim node is final (mains, subs, and any recheck-added
// claims). Two-stage, conservative by design — see
// src/lib/claimFamilyClustering.js and src/prompts/pleadingClaimFamilies.js:
//   1. recall — embed each node's text, cluster by cosine similarity
//      client-side (cheap, no judgment call — just proposes candidates).
//   2. confirm — a narrow LLM call per small candidate group decides which
//      members actually share one substantive proposition, and can split a
//      bad candidate back apart. When uncertain: don't merge.
// This never touches `claims` — analysis.claim_families is purely additive,
// and if it fails to compute for any reason, the raw claims stay fully
// usable with no families layer for that run.

import { buildCandidateGroups } from "./claimFamilyClustering.js";
import { buildCrossDocumentRelations, resolveSelfReferences } from "./crossDocumentRelationMatching.js";

const CLAIM_CONCURRENCY = 4;
const PARTY_LABELS = { claimant: "התובע", defendant: "הנתבע", third_party: "צד שלישי", unknown: "לא ידוע" };

async function runLimited(items, limit, worker) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(limit, queue.length) }, async () => {
      while (queue.length > 0) await worker(queue.shift());
    })
  );
}

export async function runPleadingAnalysis({
  pleadingText,
  docType = "other",
  party = "unknown",
  priorDocs = [], // [{analysisId, party, families}] — the pleading(s) this one was explicitly marked as responding to at upload time
  endpoint = "/api/analyze-pleading",
  signal,
  on = {},
}) {
  async function post(step, payload) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step, ...payload }),
      signal,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || `step ${step} failed (${res.status})`);
    }
    return res.json();
  }

  // ── Pass 1: skeleton ────────────────────────────────────────────────
  on.stage?.("skeleton");
  const skeleton = await post("skeleton", { pleadingText, docType, party });
  const mainClaims = skeleton.claims;
  on.skeleton?.(skeleton);

  // ── Pass 2: per-claim QA, limited concurrency ───────────────────────
  on.stage?.("claims");
  const rawAuthorities = [];
  const rawEvidenceRefs = [];
  const rawQuotations = [];
  const subClaimsByParent = {};
  const failedClaims = [];

  async function analyzeClaim(claim) {
    try {
      const result = await post("claim", {
        pleadingText,
        claim,
        otherClaims: mainClaims.filter((c) => c.id !== claim.id).map((c) => ({ id: c.id, text: c.text })),
        theoryOfCase: skeleton.theory_of_case,
      });
      claim.qa = result.qa;
      claim.source_spans = result.source_spans ?? claim.source_spans;
      claim.child_ids = (result.sub_claims ?? []).map((s) => s.id);
      subClaimsByParent[claim.id] = result.sub_claims ?? [];
      rawAuthorities.push(...(result.authorities ?? []));
      rawEvidenceRefs.push(...(result.evidence_refs ?? []));
      rawQuotations.push(...(result.quotations ?? []));
      on.claim?.(result);
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      console.error(`claim ${claim.id} analysis failed:`, err);
      failedClaims.push(claim);
    }
  }

  await runLimited(mainClaims, CLAIM_CONCURRENCY, analyzeClaim);

  // Second chance for claims that failed during the parallel burst —
  // serial, after the rate-limit window has recovered.
  if (failedClaims.length > 0) {
    const secondChance = failedClaims.splice(0);
    await runLimited(secondChance, 1, analyzeClaim);
    for (const claim of failedClaims) on.claimError?.(claim.id);
  }

  // ── Coverage audit (internal) + targeted recheck ────────────────────
  on.stage?.("audit");
  const auditWarnings = [];
  try {
    const auditNodes = [
      ...mainClaims.map((c) => ({ id: c.id, node_kind: c.node_kind, text: c.text })),
      ...Object.values(subClaimsByParent).flat().map((s) => ({ id: s.id, node_kind: s.node_kind, text: s.text })),
      ...rawAuthorities.map((a, i) => ({ id: `rawA${i + 1}`, node_kind: "authority", text: a.raw_citation })),
      ...rawEvidenceRefs.map((e, i) => ({ id: `rawE${i + 1}`, node_kind: "evidence", text: e.label })),
    ];
    const audit = await post("audit", { pleadingText, nodes: auditNodes });

    const unmapped = audit.unmapped_substantive ?? [];
    if (unmapped.length > 0) {
      const nextIdNumber =
        Math.max(0, ...mainClaims.map((c) => parseInt(String(c.id).replace(/^C/, ""), 10) || 0)) + 1;
      const recheck = await post("recheck", {
        pleadingText,
        unmapped,
        existingClaims: mainClaims.map((c) => ({ id: c.id, text: c.text })),
        nextIdNumber,
      });
      const added = recheck.claims ?? [];
      if (added.length > 0) {
        mainClaims.push(...added);
        on.claimsAdded?.(added);
        await runLimited(added, CLAIM_CONCURRENCY, analyzeClaim);
        if (failedClaims.length > 0) {
          await runLimited(failedClaims.splice(0), 1, analyzeClaim);
          for (const claim of failedClaims) on.claimError?.(claim.id);
        }
        auditWarnings.push(`בדיקת כיסוי: נוספו ${added.length} טענות שלא נקלטו בחילוץ הראשון.`);
      } else {
        for (const u of unmapped) {
          auditWarnings.push(
            `בדיקת כיסוי: ${u.section ?? "מקטע"}${u.paragraphs ? ` פסקאות ${u.paragraphs}` : ""} לא מופה לטענה — נבדק מחדש ולא נמצאה טענה חסרה.`
          );
        }
      }
    }
    for (const f of audit.misclassification_flags ?? []) {
      auditWarnings.push(`בדיקת סיווג: ${f.claim_id} סווג כ-${f.current_kind} — ${f.note}`);
    }
    for (const w of audit.warnings ?? []) auditWarnings.push(w);
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    console.error("Coverage audit failed (non-blocking):", err);
    auditWarnings.push("בדיקת הכיסוי הפנימית לא הושלמה בריצה זו.");
  }
  on.audit?.(auditWarnings);

  // ── Pass 3: reference dedup + normalization ─────────────────────────
  on.stage?.("references");
  const references = await post("references", { rawAuthorities, rawEvidenceRefs, rawQuotations });
  on.references?.(references);

  // ── Assemble the final PleadingAnalysis ─────────────────────────────
  const idsByClaim = (items) => {
    const map = {};
    for (const r of items ?? [])
      for (const cid of r.claim_ids ?? []) (map[cid] ??= []).push(r.id);
    return map;
  };
  const authorityIds = idsByClaim(references.authorities);
  const evidenceIds = idsByClaim(references.evidence_refs);
  const quotationIds = idsByClaim(references.quotations);

  const allClaims = [];
  for (const claim of mainClaims) {
    claim.authority_ids = authorityIds[claim.id] ?? [];
    claim.evidence_ref_ids = evidenceIds[claim.id] ?? [];
    claim.quotation_ids = quotationIds[claim.id] ?? [];
    allClaims.push(claim);
    for (const sub of subClaimsByParent[claim.id] ?? []) {
      sub.authority_ids = authorityIds[sub.id] ?? [];
      sub.evidence_ref_ids = evidenceIds[sub.id] ?? [];
      sub.quotation_ids = quotationIds[sub.id] ?? [];
      allClaims.push(sub);
    }
  }

  // ── Claim Families: cluster restated occurrences (recall + confirm) ──
  on.stage?.("families");
  const claimFamilies = await buildClaimFamilies(allClaims, post);
  on.families?.(claimFamilies);

  // ── Cross-document relations: only runs when this document was marked,
  // at upload, as responding to specific prior pleading(s). Additive and
  // fail-safe — see crossDocumentRelationMatching.js.
  const analysisId = `pa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  on.stage?.("relations");
  let crossDocumentRelations = [];
  if (priorDocs.length > 0) {
    try {
      const raw = await buildCrossDocumentRelations(claimFamilies, priorDocs, post, {
        currentParty: PARTY_LABELS[party] ?? party,
        priorParty: PARTY_LABELS[priorDocs[0]?.party] ?? priorDocs[0]?.party,
      });
      crossDocumentRelations = resolveSelfReferences(raw, analysisId);
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      console.error("Cross-document relations failed (non-blocking):", err);
      crossDocumentRelations = [];
    }
  }
  on.relations?.(crossDocumentRelations);

  const analysis = {
    id: analysisId,
    document: skeleton.document,
    theory_of_case: skeleton.theory_of_case,
    claims: allClaims,
    claim_families: claimFamilies,
    cross_document_relations: crossDocumentRelations,
    respondsTo: priorDocs.map((d) => d.analysisId),
    authorities: references.authorities ?? [],
    evidence_refs: references.evidence_refs ?? [],
    quotations: references.quotations ?? [],
    coverage_notes:
      [skeleton.coverage_notes, ...auditWarnings].filter(Boolean).join(" · ") || null,
  };
  on.done?.(analysis);
  return analysis;
}

// Two-stage, conservative clustering over the final claim set. Never
// throws — any failure (network, malformed response, a candidate group
// the model didn't fully partition) falls back to each claim being its
// own singleton family, so a bad clustering run degrades to "no grouping
// benefit," never to lost or duplicated claims.
export async function buildClaimFamilies(allClaims, post) {
  if (allClaims.length === 0) return [];
  const claimById = new Map(allClaims.map((c) => [c.id, c]));

  let embeddings = [];
  try {
    const items = allClaims.map((c) => ({ id: c.id, text: c.text }));
    ({ embeddings = [] } = await post("embed", { items }));
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    console.error("Claim Families embedding failed (non-blocking):", err);
    embeddings = [];
  }

  // Any claim the embed step couldn't return a vector for (a total
  // failure above, or one item skipped server-side — e.g. empty text on a
  // malformed sub-claim) still needs a family. Never let it just vanish.
  const embeddedIds = new Set(embeddings.map((e) => e.id));
  const missingSingletons = allClaims.filter((c) => !embeddedIds.has(c.id)).map((c) => [c.id]);
  const candidateGroups = [...buildCandidateGroups(embeddings), ...missingSingletons];

  const confirmed = [];
  async function confirmGroup(ids) {
    if (ids.length < 2) {
      confirmed.push({ member_ids: ids, canonical_text: claimById.get(ids[0])?.text ?? "" });
      return;
    }
    try {
      const members = ids.map((id) => {
        const c = claimById.get(id);
        return { id, text: c?.text, verbatim: c?.verbatim, node_kind: c?.node_kind };
      });
      const result = await post("confirmFamily", { members });
      const families = result.families ?? [];
      const returned = families.flatMap((f) => f.member_ids ?? []);
      const coversExactly =
        returned.length === ids.length && ids.every((id) => returned.includes(id));
      if (!coversExactly) throw new Error("confirmFamily response did not partition the input ids");
      confirmed.push(...families);
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      console.error("Claim Families confirm failed for group, keeping members separate:", ids, err);
      for (const id of ids) confirmed.push({ member_ids: [id], canonical_text: claimById.get(id)?.text ?? "" });
    }
  }
  await runLimited(candidateGroups, CLAIM_CONCURRENCY, confirmGroup);

  return confirmed.map((fam, i) => {
    const members = fam.member_ids.map((id) => claimById.get(id)).filter(Boolean);
    // Prefer a member that actually carries QA as the "primary" one shown
    // by default — a lightweight node (remedy/background/etc.) shouldn't
    // stand in for a family that has a fully-analyzed member.
    const primary = members.find((m) => m.qa) ?? members[0];
    const spans = fam.member_ids.flatMap((id) =>
      (claimById.get(id)?.source_spans ?? []).map((s) => ({ ...s, origin_claim_id: id }))
    );
    return {
      id: `F${i + 1}`,
      canonical_text: fam.canonical_text || primary?.text || "",
      node_kind: primary?.node_kind ?? null,
      member_ids: fam.member_ids,
      primary_member_id: primary?.id ?? fam.member_ids[0],
      rationale: fam.rationale ?? null,
      spans,
      case_relations: [], // reserved for a later cross-document pass — see project notes
    };
  });
}
