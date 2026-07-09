// Local test runner for the pleadings analysis pipeline.
//
//   1. start the dev server:  vercel dev
//   2. run:  node scripts/test-analyze-pleading.mjs <file> [docType] [party]
//
//   <file>    path to a pleading — .docx / .pdf / .txt
//   [docType] statement_of_claim | statement_of_defense | reply | motion | response | other
//             (default: statement_of_claim)
//   [party]   claimant | defendant | third_party | unknown   (default: claimant)
//
// DOCX/PDF are extracted via the local /api/upload endpoint, same as production.
// Drives the same client-orchestrated pipeline the app uses and saves
// <file>.analysis.json and <file>.analysis.html next to the input.

import { readFileSync, writeFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { renderReport } from "./pleadingReport.mjs";
import { runPleadingAnalysis } from "../src/lib/pleadingPipeline.js";

const BASE = "http://localhost:3000";
const [, , filePath, docType = "statement_of_claim", party = "claimant"] = process.argv;

if (!filePath) {
  console.log("usage: node scripts/test-analyze-pleading.mjs <file.docx|pdf|txt> [docType] [party]");
  process.exit(1);
}

let pleadingText;
if (extname(filePath).toLowerCase() === ".txt") {
  pleadingText = readFileSync(filePath, "utf8");
} else {
  console.log(`extracting text from ${basename(filePath)} via /api/upload …`);
  const form = new FormData();
  form.append("files", new Blob([readFileSync(filePath)]), basename(filePath));
  const up = await fetch(`${BASE}/api/upload`, { method: "POST", body: form });
  if (!up.ok) {
    console.error("upload failed:", up.status, await up.text());
    process.exit(1);
  }
  const data = await up.json();
  pleadingText = (data.files ?? []).map((f) => f?.text ?? "").join("\n\n");
}

console.log(`document: ${pleadingText.length} chars | type=${docType} | party=${party}\n`);
if (pleadingText.trim().length < 200) {
  console.error("extracted text is too short — extraction probably failed");
  process.exit(1);
}

const t0 = Date.now();
const t = () => ((Date.now() - t0) / 1000).toFixed(1) + "s";

const analysis = await runPleadingAnalysis({
  pleadingText,
  docType,
  party,
  endpoint: `${BASE}/api/analyze-pleading`,
  on: {
    stage: (stage) => console.log(`[${t()}] stage: ${stage}`),
    skeleton: (s) => {
      console.log(`[${t()}] skeleton: ${s.claims.length} main claims`);
      for (const c of s.claims) {
        const alt = c.relationship_type === "alternative" ? " [ALTERNATIVE]" : "";
        const spans = (c.source_spans ?? []).map((x) => (x.verified ? "V" : "x")).join("");
        console.log(`   ${c.id} (${c.type}/${c.node_kind})${alt} spans:${spans} — ${c.text.slice(0, 80)}`);
      }
      console.log(`   theory: ${s.theory_of_case.slice(0, 140)}`);
    },
    claim: (r) => {
      const q = r.qa;
      console.log(
        `[${t()}] claim ${r.claim_id}: subs=${r.sub_claims.length} sup=${q.supported_by.length} weak=${q.weaknesses.length} miss=${q.missing.length} flags: E=${q.evidence_gap} A=${q.authority_gap} L=${q.logical_gap_flag}`
      );
      for (const s of q.supported_by.slice(0, 2)) console.log(`   + ${s.slice(0, 110)}`);
      for (const s of q.weaknesses.slice(0, 2)) console.log(`   - ${s.slice(0, 110)}`);
      for (const s of q.missing.slice(0, 2)) console.log(`   ? ${s.slice(0, 110)}`);
      if (q.relevance_check) console.log(`   ◊ ${q.relevance_check.slice(0, 110)}`);
    },
    claimError: (id) => console.log(`[${t()}] CLAIM ERROR ${id}`),
    claimsAdded: (added) => {
      console.log(`[${t()}] RECHECK ADDED ${added.length} claims:`);
      for (const c of added) console.log(`   ${c.id} (${c.node_kind}) — ${c.text.slice(0, 80)}`);
    },
    audit: (warnings) => {
      console.log(`[${t()}] coverage_audit: ${warnings.length} warnings`);
      for (const w of warnings) console.log(`   ! ${w}`);
    },
    references: (refs) => {
      console.log(
        `[${t()}] references: ${refs.authorities.length} authorities, ${refs.evidence_refs.length} evidence, ${refs.quotations.length} quotations`
      );
      for (const a of refs.authorities)
        console.log(`   ${a.id} [${a.type}] ${a.raw_citation.slice(0, 80)} → claims ${a.claim_ids.join(",")}`);
      for (const e of refs.evidence_refs)
        console.log(`   ${e.id} [${e.type}] ${e.label} → claims ${e.claim_ids.join(",")}`);
    },
  },
});

console.log(`\n[${t()}] done: ${analysis.claims.length} total claims (incl. sub-claims)`);
if (analysis.coverage_notes) console.log(`   coverage_notes: ${analysis.coverage_notes}`);

const stem = filePath.replace(/\.[^.]+$/, "");
writeFileSync(`${stem}.analysis.json`, JSON.stringify(analysis, null, 2), "utf8");
writeFileSync(`${stem}.analysis.html`, renderReport(analysis, basename(filePath)), "utf8");
console.log(`\nsaved: ${stem}.analysis.json`);
console.log(`saved: ${stem}.analysis.html  <- open this in a browser`);
