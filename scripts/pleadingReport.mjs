// Standalone RTL HTML report renderer for a PleadingAnalysis object.
// Used by test-analyze-pleading.mjs (after a live run) and by
// render-pleading-report.mjs (to re-render a saved .analysis.json).

const KIND_LABELS = {
  main_claim: "עילה מרכזית", factual_allegation: "טענה עובדתית",
  legal_proposition: "קביעה משפטית", contractual_interpretation: "פרשנות חוזית",
  denial: "הכחשה/מענה", remedy: "סעד", damages: "נזק", procedural: "דיונית",
  alternative: "חלופית", background: "רקע", conclusion: "סיכום",
};
const TYPE_LABELS = { factual: "עובדתית", legal: "משפטית", mixed: "מעורבת" };
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function renderQa(qa) {
  if (!qa) return "";
  const li = (items, cls, mark) =>
    (items ?? []).map((x) => `<li class="${cls}"><span>${mark}</span><div>${esc(x)}</div></li>`).join("");
  const flags = [
    qa.evidence_gap && `<span class="flag">פער ראייתי</span>`,
    qa.authority_gap && `<span class="flag">פער אסמכתאות</span>`,
    qa.logical_gap_flag && `<span class="flag">פער לוגי</span>`,
  ].filter(Boolean).join(" ");
  const extra = [
    qa.logical_gap && `<li class="miss"><span>△</span><div><b>פער לוגי:</b> ${esc(qa.logical_gap)}</div></li>`,
    qa.unstated_assumption && `<li class="miss"><span>△</span><div><b>הנחה סמויה:</b> ${esc(qa.unstated_assumption)}</div></li>`,
  ].filter(Boolean).join("");
  const strategy = [
    qa.relevance_check &&
      `<p class="relevance"><b>מבחן הרלוונטיות:</b> ${esc(qa.relevance_check)}</p>`,
    qa.key_vulnerability &&
      `<p class="vuln"><b>נקודת התורפה המרכזית:</b> ${esc(qa.key_vulnerability)}</p>`,
    qa.suggested_arguments?.length &&
      `<div class="suggest"><b>אפשר לטעון:</b><ul>${qa.suggested_arguments.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>`,
    qa.annexes_to_review?.length &&
      `<div class="annexes"><b>נספחים לבחינה:</b><ul>${qa.annexes_to_review.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>`,
  ].filter(Boolean).join("");
  const empty = !(qa.supported_by?.length || qa.weaknesses?.length || qa.missing?.length || extra || strategy);
  return `${flags ? `<div class="flags">${flags}</div>` : ""}
    ${empty ? `<p class="light">ביקורת מקוצרת — צומת מסוג סעד/רקע אינו נבחן ראייתית.</p>` : `<ul class="qa">
    ${li(qa.supported_by, "sup", "✓")}${li(qa.weaknesses, "weak", "−")}${li(qa.missing, "miss", "?")}${extra}</ul>${strategy}`}`;
}

function renderClaim(c, subs) {
  const spans = (c.source_spans ?? [])
    .map((s) => `<blockquote class="${s.verified ? "" : "unverified"}">${esc(s.excerpt)}${s.section_label ? `<cite>${esc(s.section_label)}${s.paragraph ? ` · פסקה ${s.paragraph}` : ""}${s.verified ? "" : " · ציטוט לא אומת מול המסמך"}</cite>` : ""}</blockquote>`)
    .join("");
  return `<article id="${esc(c.id)}">
    <header>
      <span class="cid">${esc(c.id)}</span>
      <span class="badge">${KIND_LABELS[c.node_kind] ?? esc(c.node_kind)}</span>
      <span class="badge dim">${TYPE_LABELS[c.type] ?? esc(c.type)}</span>
      ${c.relationship_type === "alternative" ? `<span class="badge alt">לחלופין</span>` : ""}
    </header>
    <h3>${esc(c.text)}</h3>
    ${c.what_it_establishes ? `<p class="light">מה זה מבסס: ${esc(c.what_it_establishes)}</p>` : ""}
    ${spans}
    ${renderQa(c.qa)}
    ${subs.map((s) => `<div class="sub">${renderClaim(s, [])}</div>`).join("")}
  </article>`;
}

export function renderReport(a, sourceName) {
  const mains = a.claims.filter((c) => c.level === 1);
  const subsOf = (id) => a.claims.filter((c) => c.parent_id === id);
  const refs = (items, title) =>
    items?.length ? `<h2>${title} (${items.length})</h2>${items.map((r) => `
      <article class="ref"><header><span class="cid">${esc(r.id)}</span>
      <span class="badge dim">${esc(r.type ?? "")}</span></header>
      <h3>${esc(r.raw_citation ?? r.label ?? r.text)}</h3>
      ${r.normalized_citation ? `<p class="light">${esc(r.normalized_citation)}</p>` : ""}
      ${r.proposition ? `<p>${esc(r.proposition)}</p>` : ""}${r.description ? `<p>${esc(r.description)}</p>` : ""}
      ${r.source_description ? `<p class="light">${esc(r.source_description)}</p>` : ""}
      <p class="light">קשור לטענות: ${(r.claim_ids ?? []).map((id) => `<a href="#${esc(id)}">${esc(id)}</a>`).join(", ") || "—"}</p>
      </article>`).join("")}` : "";
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ניתוח כתב טענות — ${esc(sourceName)}</title>
<style>
  body{font-family:system-ui,"Segoe UI",sans-serif;background:#f8f9fb;color:#0f172a;margin:0;line-height:1.7}
  main{max-width:820px;margin:0 auto;padding:2.5rem 1.5rem 5rem}
  h1{font-size:1.4rem;margin:0 0 .25rem}
  h2{font-size:1.05rem;margin:2.5rem 0 .75rem;border-bottom:2px solid #0f172a;padding-bottom:.35rem}
  h3{font-size:1rem;margin:.35rem 0}
  article{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:1rem 1.25rem;margin:.75rem 0}
  article header{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}
  .cid{font-weight:700;font-size:.8rem;color:#475569}
  .badge{font-size:.72rem;font-weight:700;background:#eef2ff;color:#3730a3;border-radius:999px;padding:.1rem .6rem}
  .badge.dim{background:#f1f5f9;color:#475569}
  .badge.alt{background:#fef3c7;color:#92400e}
  .flag{font-size:.72rem;font-weight:700;background:#fef3c7;color:#92400e;border-radius:4px;padding:.1rem .5rem}
  .flags{margin:.5rem 0 0}
  .light{color:#64748b;font-size:.85rem;margin:.25rem 0}
  blockquote{margin:.6rem 0;padding:.4rem .9rem;border-right:3px solid #cbd5e1;background:#f8fafc;font-size:.85rem;color:#334155;border-radius:0 6px 6px 0}
  blockquote.unverified{border-right-color:#fbbf24}
  blockquote cite{display:block;font-style:normal;font-size:.72rem;color:#94a3b8;margin-top:.2rem}
  ul.qa{list-style:none;padding:0;margin:.6rem 0 0}
  ul.qa li{display:flex;gap:.5rem;margin:.3rem 0;font-size:.9rem}
  ul.qa li span{flex-shrink:0;font-weight:700;width:1.1rem;text-align:center}
  ul.qa li.sup span{color:#047857}
  ul.qa li.weak span{color:#b91c1c}
  ul.qa li.miss span{color:#b45309}
  .relevance{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:.5rem .9rem;font-size:.9rem;margin:.75rem 0 0}
  .vuln{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:.5rem .9rem;font-size:.9rem;margin:.75rem 0 0}
  .suggest{background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:.5rem .9rem;font-size:.9rem;margin:.6rem 0 0}
  .suggest ul{margin:.25rem 0 0;padding-right:1.2rem}
  .annexes{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:.5rem .9rem;font-size:.85rem;color:#475569;margin:.6rem 0 0}
  .annexes ul{margin:.25rem 0 0;padding-right:1.2rem}
  .sub{margin:.75rem 0 0 0;padding-right:1rem;border-right:2px solid #e2e8f0}
  .sub article{border:none;background:#f8fafc;margin:.5rem 0}
  .meta{color:#475569;font-size:.9rem}
  .notes{background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:.75rem 1.25rem;font-size:.9rem}
  a{color:#1d4ed8;text-decoration:none}
</style></head><body><main>
<h1>ניתוח כתב טענות</h1>
<p class="meta">${esc(sourceName)} · ${mains.length} טענות ראשיות · ${a.claims.length} צמתים סה"כ · ${(a.authorities ?? []).length} אסמכתאות · ${(a.evidence_refs ?? []).length} ראיות</p>
<h2>תיאוריית המקרה</h2><p>${esc(a.theory_of_case)}</p>
${a.coverage_notes ? `<div class="notes"><b>הערות כיסוי:</b> ${esc(a.coverage_notes)}</div>` : ""}
<h2>מפת הטענות</h2>
${mains.map((c) => renderClaim(c, subsOf(c.id))).join("")}
${refs(a.authorities, "אסמכתאות")}
${refs(a.evidence_refs, "ראיות")}
${refs(a.quotations, "ציטוטים")}
</main></body></html>`;
}
