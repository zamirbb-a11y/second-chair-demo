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
// Saves <file>.analysis.json and <file>.analysis.html next to the input.

import { readFileSync, writeFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { renderReport } from "./pleadingReport.mjs";

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

const res = await fetch(`${BASE}/api/analyze-pleading`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ pleadingText, docType, party }),
});

console.log("HTTP", res.status, res.headers.get("content-type"));
if (!res.ok) {
  console.log(await res.text());
  process.exit(1);
}

const t0 = Date.now();
const decoder = new TextDecoder();
let buf = "";
for await (const chunk of res.body) {
  buf += decoder.decode(chunk, { stream: true });
  let nl;
  while ((nl = buf.indexOf("\n")) !== -1) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    const ev = JSON.parse(line);
    const t = ((Date.now() - t0) / 1000).toFixed(1) + "s";
    switch (ev.type) {
      case "stage":
        console.log(`[${t}] stage: ${ev.stage}`);
        break;
      case "skeleton":
        console.log(`[${t}] skeleton: ${ev.claims.length} main claims`);
        for (const c of ev.claims) {
          const alt = c.relationship_type === "alternative" ? " [ALTERNATIVE]" : "";
          const spans = (c.source_spans ?? []).map((s) => (s.verified ? "V" : "x")).join("");
          console.log(`   ${c.id} (${c.type}/${c.node_kind})${alt} spans:${spans} — ${c.text.slice(0, 80)}`);
        }
        console.log(`   theory: ${ev.theory_of_case.slice(0, 140)}`);
        break;
      case "claims_added":
        console.log(`[${t}] RECHECK ADDED ${ev.claims.length} claims:`);
        for (const c of ev.claims) console.log(`   ${c.id} (${c.node_kind}) — ${c.text.slice(0, 80)}`);
        break;
      case "coverage_audit":
        console.log(`[${t}] coverage_audit: ${ev.warnings.length} warnings`);
        for (const w of ev.warnings) console.log(`   ! ${w}`);
        break;
      case "claim_analysis": {
        const q = ev.qa;
        console.log(
          `[${t}] claim_analysis ${ev.claim_id}: subs=${ev.sub_claims.length} sup=${q.supported_by.length} weak=${q.weaknesses.length} miss=${q.missing.length} flags: E=${q.evidence_gap} A=${q.authority_gap} L=${q.logical_gap_flag}`
        );
        for (const s of q.supported_by.slice(0, 2)) console.log(`   + ${s.slice(0, 110)}`);
        for (const s of q.weaknesses.slice(0, 2)) console.log(`   - ${s.slice(0, 110)}`);
        for (const s of q.missing.slice(0, 2)) console.log(`   ? ${s.slice(0, 110)}`);
        break;
      }
      case "claim_error":
        console.log(`[${t}] CLAIM ERROR ${ev.claim_id}: ${ev.message}`);
        break;
      case "references":
        console.log(
          `[${t}] references: ${ev.authorities.length} authorities, ${ev.evidence_refs.length} evidence, ${ev.quotations.length} quotations`
        );
        for (const a of ev.authorities)
          console.log(`   ${a.id} [${a.type}] ${a.raw_citation.slice(0, 80)} → claims ${a.claim_ids.join(",")}`);
        for (const e of ev.evidence_refs)
          console.log(`   ${e.id} [${e.type}] ${e.label} → claims ${e.claim_ids.join(",")}`);
        break;
      case "done": {
        console.log(`[${t}] done: ${ev.analysis.claims.length} total claims (incl. sub-claims)`);
        if (ev.analysis.coverage_notes) console.log(`   coverage_notes: ${ev.analysis.coverage_notes}`);
        const stem = filePath.replace(/\.[^.]+$/, "");
        writeFileSync(`${stem}.analysis.json`, JSON.stringify(ev.analysis, null, 2), "utf8");
        writeFileSync(`${stem}.analysis.html`, renderReport(ev.analysis, basename(filePath)), "utf8");
        console.log(`\nsaved: ${stem}.analysis.json`);
        console.log(`saved: ${stem}.analysis.html  <- open this in a browser`);
        break;
      }
      case "error":
        console.log(`[${t}] PIPELINE ERROR: ${ev.message}`);
        break;
    }
  }
}
