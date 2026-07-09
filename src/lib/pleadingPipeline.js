// Client-side orchestrator for the pleading analysis pipeline.
// Drives /api/analyze-pleading step by step (skeleton → per-claim QA →
// coverage audit (+ targeted recheck) → references), so no single server
// call can hit Vercel's maxDuration cap. Used by PleadingAnalysisView in
// the browser and by scripts/test-analyze-pleading.mjs in node.
//
// Callbacks (all optional):
//   on.stage(stage)                     "skeleton"|"claims"|"audit"|"references"
//   on.skeleton({document, theory_of_case, claims, coverage_notes})
//   on.claim({claim_id, qa, sub_claims, source_spans})
//   on.claimError(claimId)
//   on.claimsAdded(claims)              recheck found missed claims
//   on.audit(warnings)
//   on.references({authorities, evidence_refs, quotations})
// Returns the fully assembled PleadingAnalysis (also passed to on.done).

const CLAIM_CONCURRENCY = 4;

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

  const analysis = {
    id: `pa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    document: skeleton.document,
    theory_of_case: skeleton.theory_of_case,
    claims: allClaims,
    authorities: references.authorities ?? [],
    evidence_refs: references.evidence_refs ?? [],
    quotations: references.quotations ?? [],
    coverage_notes:
      [skeleton.coverage_notes, ...auditWarnings].filter(Boolean).join(" · ") || null,
  };
  on.done?.(analysis);
  return analysis;
}
