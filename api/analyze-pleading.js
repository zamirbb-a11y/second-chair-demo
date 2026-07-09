// Pleading decomposition & QA — stateless step executor.
//
// The analysis used to run as one long streaming function, which Vercel
// terminates at maxDuration (300s) — big pleadings died mid-run. The client
// (src/lib/pleadingPipeline.js) now orchestrates the passes as a series of
// short calls; every step here completes in well under the platform cap at
// any OpenAI rate-limit tier.
//
// POST { step, ...payload }:
//   skeleton   {pleadingText, docType, party}
//              → {document, theory_of_case, claims, coverage_notes}
//   claim      {pleadingText, claim, otherClaims}
//              → {claim_id, qa, sub_claims, source_spans,
//                 authorities, evidence_refs, quotations}   (raw refs)
//   audit      {pleadingText, nodes}
//              → {section_map, unmapped_substantive, misclassification_flags, warnings}
//   recheck    {pleadingText, unmapped, existingClaims, nextIdNumber}
//              → {claims}
//   references {rawAuthorities, rawEvidenceRefs, rawQuotations}
//              → {authorities, evidence_refs, quotations}   (deduped, ids assigned)

import { buildPass1Prompt, PASS1_SYSTEM } from "../src/prompts/pleadingPass1.js";
import { buildPass2Prompt, PASS2_SYSTEM, summarizeOtherClaims } from "../src/prompts/pleadingPass2.js";
import { buildPass3Prompt, PASS3_SYSTEM } from "../src/prompts/pleadingPass3.js";
import { buildCoverageAuditPrompt, AUDIT_SYSTEM, buildCoverageRecheckPrompt } from "../src/prompts/pleadingCoverageAudit.js";
import {
  validatePass1, validatePass2, verifySourceSpans,
  LIGHTWEIGHT_KINDS, EMPTY_QA,
} from "../src/lib/pleadingValidation.js";

const MODEL = "gpt-4.1";
// Mechanical passes (reference dedup, coverage mapping) run on mini:
// separate per-model TPM pool, ~5x cheaper, no legal judgment involved.
const MODEL_MINI = "gpt-4.1-mini";
const PASS2_CONTEXT_WINDOW = 3000; // chars around each source excerpt
const PASS2_FALLBACK_SLICE = 15000;
const RATE_LIMIT_RETRIES = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callModel({ system, prompt, temperature = 0.2, model = MODEL }) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        temperature,
      }),
    });
    const data = await response.json();
    if (response.status === 429 && attempt < RATE_LIMIT_RETRIES) {
      const hinted = parseFloat(data?.error?.message?.match(/try again in ([\d.]+)s/)?.[1]);
      const waitMs = (Number.isFinite(hinted) ? hinted * 1000 : 8000 * (attempt + 1)) + 1000;
      console.warn(`Rate limited, retry ${attempt + 1}/${RATE_LIMIT_RETRIES} in ${Math.round(waitMs)}ms`);
      await sleep(waitMs);
      continue;
    }
    if (!response.ok) {
      console.error("OpenAI call failed:", data);
      throw new Error(data?.error?.message || "OpenAI request failed");
    }
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content returned");
    return JSON.parse(content);
  }
}

// Call with one retry when the validator reports problems; validation
// feedback is appended so the retry knows what to fix.
async function callWithRetry({ system, prompt, validate }) {
  let result = await callModel({ system, prompt });
  const errors = validate(result);
  if (errors.length === 0) return result;
  console.warn("Validation failed, retrying once:", errors);
  result = await callModel({
    system,
    prompt: `${prompt}\n\n---\nהפלט הקודם נפסל מהסיבות הבאות — תקן אותן:\n${errors.join("\n")}`,
    temperature: 0.1,
  });
  return result;
}

// Deterministic dedup backstop after Pass 3 — the model occasionally
// returns the same citation twice; merge exact matches (normalized) and
// union their claim_ids and source_spans.
function dedupeReferences(items, keyFn, idPrefix) {
  const byKey = new Map();
  for (const item of items ?? []) {
    const key = (keyFn(item) ?? "").replace(/\s+/g, " ").trim().toLowerCase();
    if (!key) {
      byKey.set(Symbol(), item);
      continue;
    }
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...item });
    } else {
      existing.claim_ids = [...new Set([...(existing.claim_ids ?? []), ...(item.claim_ids ?? [])])];
      existing.source_spans = [...(existing.source_spans ?? []), ...(item.source_spans ?? [])];
      for (const field of ["normalized_citation", "verbatim_quote", "description", "proposition"]) {
        if (!existing[field] && item[field]) existing[field] = item[field];
      }
    }
  }
  return [...byKey.values()].map((item, i) => ({ ...item, id: `${idPrefix}${i + 1}` }));
}

// Targeted context for a claim call: windows around the claim's verified
// excerpts instead of the full document (falls back to a leading slice).
function buildSectionText(pleadingText, claim) {
  const normalizedDoc = pleadingText.replace(/\s+/g, " ");
  const windows = [];
  for (const span of claim.source_spans ?? []) {
    const excerpt = (span.excerpt ?? "").replace(/\s+/g, " ");
    if (!excerpt) continue;
    const idx = normalizedDoc.indexOf(excerpt);
    if (idx === -1) continue;
    const start = Math.max(0, idx - PASS2_CONTEXT_WINDOW);
    const end = Math.min(normalizedDoc.length, idx + excerpt.length + PASS2_CONTEXT_WINDOW);
    windows.push({ start, end });
  }
  if (windows.length === 0) return normalizedDoc.slice(0, PASS2_FALLBACK_SLICE);

  windows.sort((a, b) => a.start - b.start);
  const merged = [windows[0]];
  for (const w of windows.slice(1)) {
    const last = merged[merged.length - 1];
    if (w.start <= last.end) last.end = Math.max(last.end, w.end);
    else merged.push(w);
  }
  return merged
    .map((w) => normalizedDoc.slice(w.start, w.end))
    .join("\n\n[...]\n\n");
}

const claimDefaults = { child_ids: [], authority_ids: [], evidence_ref_ids: [], quotation_ids: [] };

function withDefaults(claim, pleadingText) {
  return verifySourceSpans({ ...claimDefaults, qa: null, ...claim }, pleadingText);
}

// ── Step handlers ───────────────────────────────────────────────────────────

async function stepSkeleton({ pleadingText, docType = "other", party = "unknown" }) {
  const pass1 = await callWithRetry({
    system: PASS1_SYSTEM,
    prompt: buildPass1Prompt({ pleadingText, docType, party }),
    validate: validatePass1,
  });
  return {
    document: pass1.document,
    theory_of_case: pass1.theory_of_case,
    claims: (pass1.claims ?? []).map((c) => withDefaults(c, pleadingText)),
    coverage_notes: pass1.coverage_notes ?? null,
  };
}

async function stepClaim({ pleadingText, claim, otherClaims = [], theoryOfCase = null }) {
  // Lightweight kinds (remedy, background, procedural, conclusion) are
  // listed but not QA'd — a prayer for relief must not be flagged for
  // evidence gaps like a factual allegation.
  if (LIGHTWEIGHT_KINDS.has(claim.node_kind)) {
    return {
      claim_id: claim.id,
      qa: { ...EMPTY_QA },
      sub_claims: [],
      source_spans: claim.source_spans ?? [],
      authorities: [], evidence_refs: [], quotations: [],
    };
  }

  const result = await callWithRetry({
    system: PASS2_SYSTEM,
    prompt: buildPass2Prompt({
      claim,
      sectionText: buildSectionText(pleadingText, claim),
      otherClaimsSummary: otherClaims.map((c) => `${c.id}: ${c.text}`).join("\n") || "(אין)",
      theoryOfCase,
    }),
    validate: (r) => validatePass2(r, claim.id),
  });

  const subClaims = (result.sub_claims ?? []).map((s) => withDefaults({ ...s, qa: s.qa ?? null }, pleadingText));

  // Merge Pass 1 + Pass 2 source quotes, deduped on normalized excerpt —
  // Pass 2 often re-quotes what Pass 1 found under a different label.
  const seen = new Set();
  const mergedSpans = [...(claim.source_spans ?? []), ...(result.source_spans ?? [])].filter((s) => {
    const key = (s.excerpt ?? "").replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const tag = (items) => (items ?? []).map((r) => ({ ...r, claim_ids: [claim.id] }));

  return {
    claim_id: claim.id,
    qa: result.qa,
    sub_claims: subClaims,
    source_spans: verifySourceSpans({ source_spans: mergedSpans }, pleadingText).source_spans,
    authorities: tag(result.authorities),
    evidence_refs: tag(result.evidence_refs),
    quotations: tag(result.quotations),
  };
}

async function stepAudit({ pleadingText, nodes }) {
  return callModel({
    system: AUDIT_SYSTEM,
    prompt: buildCoverageAuditPrompt({ pleadingText, nodes }),
    model: MODEL_MINI,
  });
}

async function stepRecheck({ pleadingText, unmapped, existingClaims, nextIdNumber }) {
  const recheck = await callModel({
    system: PASS1_SYSTEM,
    prompt: buildCoverageRecheckPrompt({ pleadingText, unmapped, existingClaims, nextIdNumber }),
  });
  return { claims: (recheck.claims ?? []).map((c) => withDefaults(c, pleadingText)) };
}

async function stepReferences({ rawAuthorities = [], rawEvidenceRefs = [], rawQuotations = [] }) {
  let references = { authorities: [], evidence_refs: [], quotations: [] };
  if (rawAuthorities.length + rawEvidenceRefs.length + rawQuotations.length > 0) {
    try {
      references = await callModel({
        system: PASS3_SYSTEM,
        prompt: buildPass3Prompt({ rawAuthorities, rawEvidenceRefs, rawQuotations }),
        model: MODEL_MINI,
      });
    } catch (err) {
      console.error("Pass 3 failed, returning raw references:", err);
      references = {
        authorities: rawAuthorities.map((a) => ({ normalized_citation: null, ...a })),
        evidence_refs: rawEvidenceRefs,
        quotations: rawQuotations,
      };
    }
  }
  return {
    authorities: dedupeReferences(references.authorities, (a) => a.raw_citation, "A"),
    evidence_refs: dedupeReferences(references.evidence_refs, (e) => e.label, "E"),
    quotations: dedupeReferences(references.quotations, (q) => q.text, "Q"),
  };
}

const STEPS = {
  skeleton: stepSkeleton,
  claim: stepClaim,
  audit: stepAudit,
  recheck: stepRecheck,
  references: stepReferences,
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { step, ...payload } = req.body || {};
  const run = STEPS[step];
  if (!run) return res.status(400).json({ error: `unknown step: ${step}` });
  if (["skeleton", "claim", "audit", "recheck"].includes(step)) {
    if (!payload.pleadingText?.trim() || payload.pleadingText.trim().length < 200) {
      return res.status(400).json({ error: "pleadingText missing or too short" });
    }
  }

  try {
    const result = await run(payload);
    return res.status(200).json(result);
  } catch (error) {
    console.error(`analyze-pleading step "${step}" failed:`, error);
    if (/insufficient_quota|exceeded your current quota/i.test(error?.message ?? "")) {
      return res.status(402).json({ error: "insufficient_quota" });
    }
    return res.status(500).json({ error: `step ${step} failed` });
  }
}
