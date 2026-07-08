// Re-render the HTML report from a saved .analysis.json — no model calls.
// Applies the current post-processing (source-span dedup + fragment-aware
// verification) so renderer/pipeline fixes show up without re-analyzing.
//
//   node scripts/render-pleading-report.mjs <file.analysis.json> [document.txt]

import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { renderReport } from "./pleadingReport.mjs";
import { verifySourceSpans } from "../src/lib/pleadingValidation.js";

const [, , jsonPath, docPath] = process.argv;
if (!jsonPath) {
  console.log("usage: node scripts/render-pleading-report.mjs <file.analysis.json> [document.txt]");
  process.exit(1);
}

const analysis = JSON.parse(readFileSync(jsonPath, "utf8"));
const documentText = docPath ? readFileSync(docPath, "utf8") : null;

function dedupeSpans(spans) {
  const seen = new Set();
  return (spans ?? []).filter((s) => {
    const key = (s.excerpt ?? "").replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

for (const node of [
  ...analysis.claims,
  ...(analysis.authorities ?? []),
  ...(analysis.evidence_refs ?? []),
  ...(analysis.quotations ?? []),
]) {
  node.source_spans = dedupeSpans(node.source_spans);
  if (documentText) {
    node.source_spans = verifySourceSpans(node, documentText).source_spans;
  }
}

const outPath = jsonPath.replace(/\.json$/, ".html");
writeFileSync(outPath, renderReport(analysis, basename(jsonPath).replace(/\.analysis\.json$/, "")), "utf8");
console.log(`rendered: ${outPath}`);
