// Pleading decomposition & QA — 3-pass pipeline streaming NDJSON.
// Pass 1: skeleton (theory of case + main claims) — one call
// Pass 2: per-claim deep analysis — N parallel calls, streamed as they land
// Pass 3: authority/evidence/quotation dedup + normalization — one call
//
// Stream protocol (one JSON object per line):
//   {type:"stage",  stage:"skeleton"|"claims"|"references"}
//   {type:"skeleton", document, theory_of_case, claims, coverage_notes}
//   {type:"claim_analysis", claim_id, sub_claims, qa, source_spans}
//   {type:"claim_error", claim_id, message}
//   {type:"references", authorities, evidence_refs, quotations}
//   {type:"done", analysis}   — the fully assembled PleadingAnalysis
//   {type:"error", message}

import { buildPass1Prompt, PASS1_SYSTEM } from "../src/prompts/pleadingPass1.js";
import { buildPass2Prompt, PASS2_SYSTEM, summarizeOtherClaims } from "../src/prompts/pleadingPass2.js";
import { buildPass3Prompt, PASS3_SYSTEM } from "../src/prompts/pleadingPass3.js";
import { validatePass1, validatePass2, verifySourceSpans } from "../src/lib/pleadingValidation.js";

const MODEL = "gpt-4.1";
const PASS2_CONTEXT_WINDOW = 3000; // chars around each source excerpt
const PASS2_FALLBACK_SLICE = 15000;

async function callModel({ system, prompt, temperature = 0.2 }) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    console.error("OpenAI call failed:", data);
    throw new Error(data?.error?.message || "OpenAI request failed");
  }
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content returned");
  return JSON.parse(content);
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
  return result; // second result is accepted as-is; errors surface via review UI
}

// Targeted context for a Pass 2 call: windows around the claim's verified
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

  // merge overlapping windows
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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { pleadingText, docType = "other", party = "unknown" } = req.body || {};
  if (!pleadingText?.trim() || pleadingText.trim().length < 200) {
    return res.status(400).json({ error: "pleadingText missing or too short" });
  }

  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  const send = (obj) => res.write(JSON.stringify(obj) + "\n");

  try {
    // ── Pass 1: skeleton ──────────────────────────────────────────────
    send({ type: "stage", stage: "skeleton" });
    const pass1 = await callWithRetry({
      system: PASS1_SYSTEM,
      prompt: buildPass1Prompt({ pleadingText, docType, party }),
      validate: validatePass1,
    });

    const mainClaims = (pass1.claims ?? []).map((c) =>
      verifySourceSpans(
        { ...c, child_ids: [], authority_ids: [], evidence_ref_ids: [], quotation_ids: [], qa: null },
        pleadingText
      )
    );
    send({
      type: "skeleton",
      document: pass1.document,
      theory_of_case: pass1.theory_of_case,
      claims: mainClaims,
      coverage_notes: pass1.coverage_notes ?? null,
    });

    // ── Pass 2: per-claim deep analysis, parallel ─────────────────────
    send({ type: "stage", stage: "claims" });
    const rawAuthorities = [];
    const rawEvidenceRefs = [];
    const rawQuotations = [];
    const subClaimsByParent = {};

    await Promise.all(
      mainClaims.map(async (claim) => {
        try {
          const result = await callWithRetry({
            system: PASS2_SYSTEM,
            prompt: buildPass2Prompt({
              claim,
              sectionText: buildSectionText(pleadingText, claim),
              otherClaimsSummary: summarizeOtherClaims(mainClaims, claim.id),
            }),
            validate: (r) => validatePass2(r, claim.id),
          });

          const subClaims = (result.sub_claims ?? []).map((s) =>
            verifySourceSpans(
              { ...s, child_ids: [], authority_ids: [], evidence_ref_ids: [], quotation_ids: [] },
              pleadingText
            )
          );
          subClaimsByParent[claim.id] = subClaims;

          claim.qa = result.qa;
          if (Array.isArray(result.source_spans) && result.source_spans.length > 0) {
            claim.source_spans = verifySourceSpans(
              { source_spans: [...claim.source_spans, ...result.source_spans] },
              pleadingText
            ).source_spans;
          }
          claim.child_ids = subClaims.map((s) => s.id);

          for (const a of result.authorities ?? []) rawAuthorities.push({ ...a, claim_ids: [claim.id] });
          for (const e of result.evidence_refs ?? []) rawEvidenceRefs.push({ ...e, claim_ids: [claim.id] });
          for (const q of result.quotations ?? []) rawQuotations.push({ ...q, claim_ids: [claim.id] });

          send({
            type: "claim_analysis",
            claim_id: claim.id,
            sub_claims: subClaims,
            qa: result.qa,
            source_spans: claim.source_spans,
          });
        } catch (err) {
          console.error(`Pass 2 failed for ${claim.id}:`, err);
          send({ type: "claim_error", claim_id: claim.id, message: "claim analysis failed" });
        }
      })
    );

    // ── Pass 3: dedup + normalize references ──────────────────────────
    send({ type: "stage", stage: "references" });
    let references = { authorities: [], evidence_refs: [], quotations: [] };
    if (rawAuthorities.length + rawEvidenceRefs.length + rawQuotations.length > 0) {
      try {
        references = await callModel({
          system: PASS3_SYSTEM,
          prompt: buildPass3Prompt({ rawAuthorities, rawEvidenceRefs, rawQuotations }),
        });
      } catch (err) {
        console.error("Pass 3 failed, returning raw references:", err);
        references = {
          authorities: rawAuthorities.map((a, i) => ({ id: `A${i + 1}`, normalized_citation: null, ...a })),
          evidence_refs: rawEvidenceRefs.map((e, i) => ({ id: `E${i + 1}`, ...e })),
          quotations: rawQuotations.map((q, i) => ({ id: `Q${i + 1}`, ...q })),
        };
      }
    }
    send({ type: "references", ...references });

    // link claims to reference ids
    const authorityIdsByClaim = {};
    for (const a of references.authorities ?? [])
      for (const cid of a.claim_ids ?? []) (authorityIdsByClaim[cid] ??= []).push(a.id);
    const evidenceIdsByClaim = {};
    for (const e of references.evidence_refs ?? [])
      for (const cid of e.claim_ids ?? []) (evidenceIdsByClaim[cid] ??= []).push(e.id);
    const quotationIdsByClaim = {};
    for (const q of references.quotations ?? [])
      for (const cid of q.claim_ids ?? []) (quotationIdsByClaim[cid] ??= []).push(q.id);

    const allClaims = [];
    for (const claim of mainClaims) {
      claim.authority_ids = authorityIdsByClaim[claim.id] ?? [];
      claim.evidence_ref_ids = evidenceIdsByClaim[claim.id] ?? [];
      claim.quotation_ids = quotationIdsByClaim[claim.id] ?? [];
      allClaims.push(claim);
      for (const sub of subClaimsByParent[claim.id] ?? []) {
        sub.authority_ids = authorityIdsByClaim[sub.id] ?? [];
        sub.evidence_ref_ids = evidenceIdsByClaim[sub.id] ?? [];
        sub.quotation_ids = quotationIdsByClaim[sub.id] ?? [];
        allClaims.push(sub);
      }
    }

    const analysis = {
      id: `pa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      document: pass1.document,
      theory_of_case: pass1.theory_of_case,
      claims: allClaims,
      authorities: references.authorities ?? [],
      evidence_refs: references.evidence_refs ?? [],
      quotations: references.quotations ?? [],
      coverage_notes: pass1.coverage_notes ?? null,
    };
    send({ type: "done", analysis });
    res.end();
  } catch (error) {
    console.error("analyze-pleading failed:", error);
    send({ type: "error", message: "pleading analysis failed" });
    res.end();
  }
}
