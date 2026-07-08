// Right panel: the selected claim in full — classification badges, QA with
// the strategy layer (relevance check, key vulnerability, suggested
// arguments, annexes to review), source quotes, and linked references.

import { useState } from "react";

const KIND_LABELS = {
  main_claim: "עילה מרכזית", factual_allegation: "טענה עובדתית",
  legal_proposition: "קביעה משפטית", contractual_interpretation: "פרשנות חוזית",
  denial: "הכחשה/מענה", remedy: "סעד", damages: "נזק", procedural: "דיונית",
  alternative: "חלופית", background: "רקע", conclusion: "סיכום",
};
const TYPE_LABELS = { factual: "עובדתית", legal: "משפטית", mixed: "מעורבת" };
const LIGHTWEIGHT = new Set(["remedy", "background", "procedural", "conclusion"]);

function QaLine({ mark, markClass, children }) {
  return (
    <li className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
      <span aria-hidden="true" className={`flex-shrink-0 font-bold w-4 text-center ${markClass}`}>{mark}</span>
      <span className="flex-1 min-w-0">{children}</span>
    </li>
  );
}

function StrategyBlock({ title, tone, items, text }) {
  const tones = {
    amber:  "bg-amber-50 border-amber-200 text-amber-900",
    red:    "bg-red-50 border-red-200 text-red-900",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-900",
    slate:  "bg-slate-50 border-slate-200 text-slate-700",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${tones[tone]}`}>
      <span className="font-bold">{title}: </span>
      {text}
      {items && (
        <ul className="mt-1 pr-5 list-disc space-y-1">
          {items.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      )}
    </div>
  );
}

function QaTab({ claim }) {
  const qa = claim.qa;
  if (!qa) return <p className="text-sm text-slate-500 italic">הביקורת לטענה זו עדיין מתבצעת…</p>;
  if (LIGHTWEIGHT.has(claim.node_kind) && !qa.supported_by?.length && !qa.weaknesses?.length && !qa.missing?.length && !qa.relevance_check) {
    return <p className="text-sm text-slate-500">צומת מסוג {KIND_LABELS[claim.node_kind]} — אינו נבחן ראייתית.</p>;
  }
  return (
    <div className="space-y-4">
      {(qa.supported_by?.length || qa.weaknesses?.length || qa.missing?.length) ? (
        <ul className="space-y-1.5">
          {(qa.supported_by ?? []).map((s, i) => <QaLine key={`s${i}`} mark="✓" markClass="text-emerald-700">{s}</QaLine>)}
          {(qa.weaknesses ?? []).map((s, i) => <QaLine key={`w${i}`} mark="−" markClass="text-red-700">{s}</QaLine>)}
          {(qa.missing ?? []).map((s, i) => <QaLine key={`m${i}`} mark="?" markClass="text-amber-700">{s}</QaLine>)}
          {qa.logical_gap && <QaLine mark="△" markClass="text-amber-700"><b>פער לוגי:</b> {qa.logical_gap}</QaLine>}
          {qa.unstated_assumption && <QaLine mark="△" markClass="text-amber-700"><b>הנחה סמויה:</b> {qa.unstated_assumption}</QaLine>}
        </ul>
      ) : null}
      {qa.relevance_check && <StrategyBlock title="מבחן הרלוונטיות" tone="amber" text={qa.relevance_check} />}
      {qa.key_vulnerability && <StrategyBlock title="נקודת התורפה המרכזית" tone="red" text={qa.key_vulnerability} />}
      {qa.suggested_arguments?.length > 0 && <StrategyBlock title="אפשר לטעון" tone="indigo" items={qa.suggested_arguments} text="" />}
      {qa.annexes_to_review?.length > 0 && <StrategyBlock title="נספחים לבחינה" tone="slate" items={qa.annexes_to_review} text="" />}
    </div>
  );
}

function SourcesTab({ claim }) {
  const spans = claim.source_spans ?? [];
  if (!spans.length) return <p className="text-sm text-slate-500">אין ציטוטי מקור לטענה זו.</p>;
  return (
    <div className="space-y-3">
      {spans.map((s, i) => (
        <blockquote
          key={i}
          className={`border-r-2 pr-3 py-1 text-sm text-slate-700 leading-relaxed ${s.verified === false ? "border-amber-300" : "border-slate-300"}`}
        >
          {s.excerpt}
          <footer className="text-xs text-slate-500 mt-1">
            {[s.section_label, s.paragraph && `פסקה ${s.paragraph}`, s.verified === false && "ציטוט לא אומת מול המסמך"]
              .filter(Boolean).join(" · ")}
          </footer>
        </blockquote>
      ))}
    </div>
  );
}

function RefsTab({ claim, analysis }) {
  const linked = (items) =>
    (items ?? []).filter((r) => (r.claim_ids ?? []).includes(claim.id) ||
      (claim.authority_ids ?? []).includes(r.id) ||
      (claim.evidence_ref_ids ?? []).includes(r.id) ||
      (claim.quotation_ids ?? []).includes(r.id));
  const authorities = linked(analysis.authorities);
  const evidence = linked(analysis.evidence_refs);
  const quotations = linked(analysis.quotations);
  if (!authorities.length && !evidence.length && !quotations.length) {
    return <p className="text-sm text-slate-500">אין אסמכתאות או ראיות המקושרות לטענה זו.</p>;
  }
  const Section = ({ title, items, render }) =>
    items.length ? (
      <div>
        <h4 className="text-xs font-bold text-slate-500 mb-1.5">{title}</h4>
        <ul className="space-y-2">{items.map((r) => <li key={r.id} className="text-sm text-slate-700 leading-relaxed">{render(r)}</li>)}</ul>
      </div>
    ) : null;
  return (
    <div className="space-y-4">
      <Section title="אסמכתאות" items={authorities} render={(r) => (
        <><span className="font-semibold">{r.raw_citation}</span>{r.proposition && <span className="text-slate-500"> — {r.proposition}</span>}</>
      )} />
      <Section title="ראיות" items={evidence} render={(r) => (
        <><span className="font-semibold">{r.label}</span>{r.description && <span className="text-slate-500"> — {r.description}</span>}</>
      )} />
      <Section title="ציטוטים" items={quotations} render={(r) => (
        <><span>"{r.text}"</span>{r.source_description && <span className="text-slate-500"> — {r.source_description}</span>}</>
      )} />
    </div>
  );
}

export default function ClaimDetail({ claim, analysis, reviewed, onToggleReviewed }) {
  const [tab, setTab] = useState("qa");

  if (!claim) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-500 p-8">
        בחר טענה מהרשימה כדי לראות את הביקורת עליה.
      </div>
    );
  }

  const tabs = [["qa", "ביקורת"], ["sources", "מקורות"], ["refs", "אסמכתאות וראיות"]];

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6" dir="rtl">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="text-xs font-bold text-slate-500">{claim.id}</span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
          {KIND_LABELS[claim.node_kind] ?? claim.node_kind}
        </span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
          {TYPE_LABELS[claim.type] ?? claim.type}
        </span>
        {claim.relationship_type === "alternative" && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">לחלופין</span>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => onToggleReviewed(claim.id)}
          aria-pressed={!!reviewed}
          className={[
            "text-xs font-semibold px-3 py-1 rounded-full border cursor-pointer transition-colors",
            reviewed
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-white border-slate-200 text-slate-600 hover:border-slate-400",
          ].join(" ")}
        >
          {reviewed ? "✓ נבדקה" : "סמן כנבדקה"}
        </button>
      </div>

      <h3 className="text-base font-bold text-slate-900 leading-snug mb-1">{claim.text}</h3>
      {claim.what_it_establishes && (
        <p className="text-sm text-slate-500 mb-4">מה זה מבסס: {claim.what_it_establishes}</p>
      )}

      <div className="flex gap-0 border-b border-slate-200 mb-4" role="tablist">
        {tabs.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={[
              "text-sm font-semibold px-4 py-2 -mb-px border-b-2 cursor-pointer bg-transparent transition-colors",
              tab === value
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-700",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "qa" && <QaTab claim={claim} />}
      {tab === "sources" && <SourcesTab claim={claim} />}
      {tab === "refs" && <RefsTab claim={claim} analysis={analysis} />}
    </div>
  );
}
