import { useState } from "react";
import InlinePendingUpdates from "./InlinePendingUpdates";

// ─── Config ───────────────────────────────────────────────────────────────────

const CHIP_STYLES = {
  ראיה:         { bg: "bg-blue-50",    text: "text-blue-600"    },
  פסיקה:        { bg: "bg-purple-50",  text: "text-purple-600"  },
  חקיקה:        { bg: "bg-violet-50",  text: "text-violet-700"  },
  עד:           { bg: "bg-teal-50",    text: "text-teal-700"    },
  מסמך:         { bg: "bg-slate-100",  text: "text-slate-500"   },
  "פער ראייתי": { bg: "bg-orange-50",  text: "text-orange-600"  },
  פער:          { bg: "bg-amber-50",   text: "text-amber-700"   },
  מחזק:         { bg: "bg-emerald-50", text: "text-emerald-700" },
  מקשה:         { bg: "bg-red-50",     text: "text-red-600"     },
  "שאלה ללקוח": { bg: "bg-amber-50",   text: "text-amber-800"   },
  "ראיה להשגה": { bg: "bg-sky-50",     text: "text-sky-600"     },
  פעולה:        { bg: "bg-indigo-50",  text: "text-indigo-600"  },
  "פער משפטי":  { bg: "bg-rose-50",    text: "text-rose-600"    },
  "מחקר משפטי": { bg: "bg-violet-50",  text: "text-violet-600"  },
  כיוון:        { bg: "bg-indigo-50",  text: "text-indigo-600"  },
  "לא ברור":    { bg: "bg-slate-100",  text: "text-slate-500"   },
};
const STRENGTH_LABELS = {
  very_strong: "גבוה מאוד", strong: "גבוה", medium_strong: "בינוני-גבוה",
  medium: "בינוני", medium_weak: "בינוני-נמוך", weak: "נמוך",
  very_weak: "נמוך מאוד", unclear: "לא ברור",
};
const IMPORTANCE_LABELS = { central: "מרכזית", secondary: "משנית", peripheral: "שולית" };
const SECTION_LIMIT = 4;

function mkChip(n) { return { ...CHIP_STYLES[n], name: n }; }
function strengthLabel(v) { return STRENGTH_LABELS[v] ?? v ?? ""; }
function strengthBadgeClass(s) {
  if (["very_strong","strong"].includes(s)) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (s === "medium_strong") return "bg-blue-100 text-blue-800 border-blue-200";
  if (s === "medium")        return "bg-slate-100 text-slate-600 border-slate-200";
  if (s === "medium_weak")   return "bg-amber-100 text-amber-700 border-amber-200";
  if (["weak","very_weak"].includes(s)) return "bg-orange-100 text-orange-700 border-orange-200";
  return "bg-slate-100 text-slate-500 border-slate-200";
}
const STATUTE_RE = /^(חוק|תקנות?|פקודת?|חוקה|הוראות?|צו)\s/;
function legalChip(t) { return STATUTE_RE.test(String(t)) ? mkChip("חקיקה") : mkChip("פסיקה"); }
function evidenceOverlayChip(t) { return t === "witness" ? mkChip("עד") : t === "document" ? mkChip("מסמך") : mkChip("ראיה"); }
function workItemChip(type) { return mkChip({ client_question: "שאלה ללקוח", evidence_to_obtain: "ראיה להשגה", suggested_action: "פעולה", pleading_gap: "פער משפטי", legal_research: "מחקר משפטי" }[type] ?? "כיוון"); }
const MISSING_TYPES = new Set(["missing","missing_evidence","evidence_gap"]);

// Build a HoverItem descriptor from a retrieved precedent object.
// side: "claimant" | "defendant" | "ambiguous"
function precedentItem(p, side) {
  const text = typeof p === "string" ? p : (p.shortName ?? p.title ?? "");
  let tooltip = null;
  if (typeof p === "object") {
    if (side === "claimant")  tooltip = p.claimantUse ?? p.miniRatio ?? p.holding ?? null;
    else if (side === "defendant") tooltip = p.defenseUse ?? p.miniRatio ?? p.holding ?? null;
    else tooltip = p.miniRatio ?? (p.retrievalReasons?.length ? p.retrievalReasons.join(" | ") : null) ?? p.holding ?? null;
  }
  return { chipConfig: legalChip(text), text, tooltip };
}

// ─── HoverItem — fixed-position tooltip ──────────────────────────────────────

function HoverItem({ chipConfig, text, tooltip, isNew }) {
  const [tipPos, setTipPos] = useState(null);
  if (!text) return null;

  const tipLeft = tipPos
    ? Math.min(Math.max(8, tipPos.x - 140), window.innerWidth - 288)
    : 0;

  return (
    <div className="py-2 border-b border-slate-100 last:border-0">
      <div className="flex items-start gap-1.5">
        {isNew && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-[5px]" />}
        {chipConfig && (
          <span className={`text-[9px] font-bold px-1.5 py-[3px] rounded flex-shrink-0 mt-0.5 leading-none ${chipConfig.bg} ${chipConfig.text}`}>
            {chipConfig.name}
          </span>
        )}
        <p
          className={[
            "text-[12.5px] text-slate-700 leading-snug font-medium flex-1 min-w-0 break-words",
            tooltip ? "underline underline-offset-2 decoration-slate-300 cursor-help" : "",
          ].join(" ")}
          onMouseEnter={tooltip ? (e) => setTipPos({ x: e.clientX, y: e.clientY }) : undefined}
          onMouseLeave={tooltip ? () => setTipPos(null) : undefined}
          onMouseMove={tooltip ? (e) => setTipPos({ x: e.clientX, y: e.clientY }) : undefined}
        >
          {text}
        </p>
      </div>
      {tipPos && tooltip && (
        <div
          className="z-[9999] bg-slate-900 text-white text-[11px] rounded-xl px-3 py-2.5 leading-relaxed shadow-xl pointer-events-none"
          style={{ position: "fixed", top: tipPos.y - 8, left: tipLeft, transform: "translateY(-100%)", maxWidth: 280, minWidth: 160 }}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}

// ─── SectionBlock — labelled item list with optional preview limit ────────────

function SectionBlock({ label, items, limit }) {
  if (!items.length) return null;
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <div className="mt-3">
      <div className="text-[9px] font-bold text-slate-400 tracking-[0.08em] uppercase mb-0.5">{label}</div>
      <div>{shown.map((item, i) => <HoverItem key={i} {...item} />)}</div>
    </div>
  );
}

// ─── AccordionPanel ───────────────────────────────────────────────────────────

function AccordionPanel({ title, count, accentColor, children }) {
  const [open, setOpen] = useState(false);
  const ac = {
    amber:  { border: "border-amber-200",  head: "bg-amber-50",   label: "text-amber-800",  badge: "bg-amber-100 text-amber-700"  },
    orange: { border: "border-orange-200", head: "bg-orange-50",  label: "text-orange-800", badge: "bg-orange-100 text-orange-700" },
    indigo: { border: "border-indigo-200", head: "bg-indigo-50",  label: "text-indigo-800", badge: "bg-indigo-100 text-indigo-700" },
  }[accentColor] ?? {};
  const has = count > 0;
  return (
    <div className={`border ${ac.border} rounded-xl overflow-hidden self-start`}>
      <button
        onClick={() => has && setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 ${ac.head} border-0 ${has ? "cursor-pointer" : "cursor-default opacity-50"} transition-opacity`}
      >
        <span className={`text-[12.5px] font-semibold ${ac.label}`}>{title}</span>
        <div className="flex items-center gap-2">
          {has && <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${ac.badge}`}>{count}</span>}
          {has && <span className={`text-[11px] ${ac.label} opacity-60`}>{open ? "▴" : "▾"}</span>}
        </div>
      </button>
      {open && has && <div className="px-4 py-3 bg-white">{children}</div>}
    </div>
  );
}

// ─── ClientQuestions ──────────────────────────────────────────────────────────

function ClientQuestions({ items, issueId, onAddInfo }) {
  const [state, setState] = useState({});
  function get(i) { return state[i] ?? {}; }
  function submit(i, qText) {
    const t = get(i).text?.trim();
    if (!t) return;
    onAddInfo?.({ type: "case_text_update", targetType: "issue", targetId: issueId, title: `תשובה: ${qText.slice(0,50)}`, text: t });
    setState((s) => ({ ...s, [i]: { done: true } }));
  }
  const cs = CHIP_STYLES["שאלה ללקוח"];
  return (
    <div>
      {items.map((q, i) => {
        if (get(i).done) return null;
        const qText = typeof q === "string" ? q : (q.question ?? q.text ?? "");
        const s = get(i);
        return (
          <div key={i} className="py-2.5 border-b border-slate-100 last:border-0">
            <div className="flex items-start gap-2 mb-1.5">
              <span className={`text-[9px] font-bold px-1.5 py-[3px] rounded flex-shrink-0 mt-0.5 leading-none ${cs.bg} ${cs.text}`}>שאלה ללקוח</span>
              <p className="text-[12.5px] text-slate-700 leading-snug font-medium">{qText}</p>
            </div>
            {s.mode === "answering" ? (
              <div className="mr-[46px]">
                <textarea value={s.text ?? ""} onChange={(e) => setState((st) => ({ ...st, [i]: { ...s, text: e.target.value } }))} rows={2} autoFocus placeholder="תשובת הלקוח..." className="w-full text-[12px] border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 resize-none bg-white leading-relaxed" />
                <div className="flex gap-2 mt-1.5">
                  <button onClick={() => submit(i, qText)} disabled={!s.text?.trim()} className="text-[11px] bg-slate-900 text-white px-3 py-1.5 rounded-lg border-0 cursor-pointer disabled:opacity-40 hover:bg-slate-800">שמור</button>
                  <button onClick={() => setState((st) => ({ ...st, [i]: { mode: null } }))} className="text-[11px] text-slate-400 bg-transparent border-0 cursor-pointer">ביטול</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setState((st) => ({ ...st, [i]: { mode: "answering", text: "" } }))} className="text-[11px] text-blue-500 hover:text-blue-600 bg-transparent border-0 cursor-pointer p-0 mr-[46px]">✎ הכנס תשובה</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── DetailLink — "N more → פירוט" shown at bottom of column ─────────────────

function DetailLink({ moreCount, onClick }) {
  if (moreCount <= 0) return null;
  return (
    <button
      onClick={onClick}
      className="mt-3 text-[11px] text-blue-500 hover:text-blue-700 bg-transparent border-0 cursor-pointer p-0 flex items-center gap-1"
    >
      <span className="text-slate-400">ועוד {moreCount} —</span>
      <span className="font-semibold underline underline-offset-2">פירוט</span>
    </button>
  );
}

// ─── Detail pane — white overlay on top of the three-column view ──────────────

function DetailPaneView({ pane, onBack, zones, accordions, issue, onWorkspaceUpdate }) {
  const z = zones[pane];
  const accentClasses = { our: "bg-emerald-300", opposing: "bg-amber-300", ambiguous: "bg-slate-300" };
  const labelClasses  = { our: "text-emerald-700", opposing: "text-amber-700", ambiguous: "text-slate-600" };

  return (
    <div className="px-8 py-6 flex flex-col min-h-full">
      {/* Back */}
      <button
        onClick={onBack}
        className="mb-5 self-start flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-800 bg-transparent border-0 cursor-pointer p-0"
      >
        <span className="text-[14px]">←</span> חזור
      </button>

      {/* Column header */}
      <div className={`h-[3px] rounded-full ${accentClasses[pane]} mb-3`} />
      <div className={`text-[14px] font-bold mb-4 ${labelClasses[pane]}`}>{z.label}</div>

      {/* Narrative */}
      {z.narrative && (
        <p className="text-[14px] text-slate-700 leading-[1.75] mb-4">{z.narrative}</p>
      )}

      {/* All sections — no limit */}
      {z.sections.map(({ label, items }) => (
        <SectionBlock key={label} label={label} items={items} />
      ))}

      {/* Accordions at bottom */}
      <div className="mt-auto pt-6 border-t border-slate-100 grid grid-cols-3 gap-4 items-start">
        <AccordionPanel title="שאלות ללקוח" count={accordions.questions.length} accentColor="amber">
          <ClientQuestions items={accordions.questions} issueId={issue.id} onAddInfo={onWorkspaceUpdate} />
        </AccordionPanel>
        <AccordionPanel title="פערים ראייתיים" count={accordions.gaps.length} accentColor="orange">
          <div>{accordions.gaps.map((item, i) => <HoverItem key={i} {...item} />)}</div>
        </AccordionPanel>
        <AccordionPanel title="צעדים להמשך" count={accordions.steps.length} accentColor="indigo">
          <div>{accordions.steps.map((item, i) => <HoverItem key={i} {...item} />)}</div>
        </AccordionPanel>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DisputeDetail({
  issue, latestDelta,
  onUpdateIssue,
  onAcceptAssessmentChange, onRejectAssessmentChange,
  onAcceptEvidenceUpdate, onRejectEvidenceUpdate,
  onAcceptContradiction, onRejectContradiction,
  onAcceptWorkItem, onRejectWorkItem,
  onWorkspaceUpdate, ourSideLabel, opposingSideLabel, retrievedPrecedents,
}) {
  const [detailPane, setDetailPane] = useState(null); // null | "our" | "opposing" | "ambiguous"

  if (!issue) return null;

  const effective       = issue.effectiveLegal ?? {};
  const strength        = effective.strength;
  const summary         = effective.summary;
  const relevantLaw     = effective.relevantLaw ?? issue.legalAssessment?.relevantLaw ?? [];
  const importanceLabel = IMPORTANCE_LABELS[issue.importance] ?? issue.importance;
  const isUpdated       = (issue.updatedLegalFields?.length ?? 0) > 0;

  const evidenceOverlays      = issue.overlays?.evidence ?? [];
  const contradictionOverlays = issue.overlays?.contradictions ?? [];
  const workItemOverlays      = issue.overlays?.workItems ?? [];

  const claimantNarrative = issue.partyPositions?.claimant;
  const opposingNarrative = issue.partyPositions?.defendant;
  const coreDispute       = issue.partyPositions?.coreDispute || issue.legalAssessment?.coreDispute;

  // ── Classify retrieved precedents by the `helps` field ────────────────────
  const ourPrecedents = (retrievedPrecedents ?? [])
    .filter(p => typeof p === "object" && p.helps?.toLowerCase() === "claimant")
    .map(p => precedentItem(p, "claimant"))
    .filter(x => x.text);

  const opposingPrecedents = (retrievedPrecedents ?? [])
    .filter(p => typeof p === "object" && p.helps?.toLowerCase() === "defendant")
    .map(p => precedentItem(p, "defendant"))
    .filter(x => x.text);

  const ambiguousPrecedents = (retrievedPrecedents ?? [])
    .filter(p => {
      const h = typeof p === "object" ? p.helps?.toLowerCase() : null;
      return h !== "claimant" && h !== "defendant";
    })
    .map(p => precedentItem(p, "ambiguous"))
    .filter(x => x.text);

  // ── Zone A: our evidence + our precedents ──────────────────────────────────
  const ourEvidence = [
    ...(issue.linkedEvidence ?? []).map((e) => ({ chipConfig: mkChip("ראיה"), text: typeof e === "string" ? e : (e.title ?? ""), tooltip: typeof e === "object" ? (e.description ?? null) : null })),
    ...(issue.linkedWitnesses ?? []).map((w) => ({ chipConfig: mkChip("עד"), text: typeof w === "string" ? w : (w.name ?? w.title ?? ""), tooltip: typeof w === "object" ? (w.testimony ?? w.description ?? null) : null })),
    ...evidenceOverlays.filter((e) => !MISSING_TYPES.has(e.patch?.evidenceType ?? e.patch?.type)).map((e) => ({ chipConfig: evidenceOverlayChip(e.patch?.evidenceType ?? e.patch?.type), text: e.patch?.title ?? "", tooltip: e.patch?.description ?? null, isNew: true })),
    ...contradictionOverlays.filter((c) => c.patch?.direction === "hurts_them").map((c) => ({ chipConfig: mkChip("מחזק"), text: c.patch?.description ?? c.patch?.title ?? "", isNew: true })),
  ].filter((x) => x.text);

  // ── Zone B: opposing evidence + opposing precedents ────────────────────────
  const opposingEvidence = [
    ...contradictionOverlays.filter((c) => c.patch?.direction === "hurts_us").map((c) => ({ chipConfig: mkChip("מקשה"), text: c.patch?.description ?? c.patch?.title ?? "", tooltip: c.patch?.severity ? `עוצמה: ${c.patch.severity === "high" ? "גבוהה" : c.patch.severity === "medium" ? "בינונית" : "נמוכה"}` : null, isNew: true })),
  ].filter((x) => x.text);

  // ── Zone C: relevantLaw (always ambiguous) + ambiguous precedents ──────────
  const legalSources = [
    ...relevantLaw.map((a) => {
      const o = typeof a === "object" && a !== null;
      const raw = o ? (a.citation ?? a.title ?? JSON.stringify(a)) : String(a);
      return { chipConfig: legalChip(raw), text: raw, tooltip: o ? (a.summary ?? a.relevance ?? null) : null };
    }),
    ...ambiguousPrecedents,
  ].filter((x) => x.text);

  const unclearContradictions = [
    ...contradictionOverlays.filter((c) => !["hurts_us","hurts_them"].includes(c.patch?.direction)).map((c) => ({ chipConfig: mkChip("לא ברור"), text: c.patch?.description ?? c.patch?.title ?? "", isNew: true })),
  ].filter((x) => x.text);

  // ── Accordion data ─────────────────────────────────────────────────────────
  const clientQuestions = issue.actionItems?.clientQuestions ?? [];

  const evidenceGaps = [
    ...(issue.missingInfo ?? []).map((m) => ({ chipConfig: mkChip("פער"), text: m })),
    ...(issue.actionItems?.missingEvidence ?? []).map((m) => ({ chipConfig: mkChip("פער ראייתי"), text: typeof m === "string" ? m : (m.title ?? m.description ?? ""), tooltip: typeof m === "object" ? (m.description ?? null) : null })),
    ...evidenceOverlays.filter((e) => MISSING_TYPES.has(e.patch?.evidenceType ?? e.patch?.type)).map((e) => ({ chipConfig: mkChip("פער ראייתי"), text: e.patch?.title ?? "", tooltip: e.patch?.description ?? null, isNew: true })),
  ].filter((x) => x.text);

  const nextSteps = [
    ...workItemOverlays.map((w) => ({ chipConfig: workItemChip(w.type), text: w.title ?? "", tooltip: w.description ?? null, isNew: true })),
    ...(issue.actionItems?.suggestedActions ?? []).map((a) => ({ chipConfig: mkChip("פעולה"), text: typeof a === "string" ? a : (a.title ?? a.description ?? ""), tooltip: typeof a === "object" ? (a.description ?? null) : null })),
  ].filter((x) => x.text);

  const accordions = { questions: clientQuestions, gaps: evidenceGaps, steps: nextSteps };

  // ── Zone descriptors passed to detail pane ─────────────────────────────────
  const zones = {
    our: {
      label: ourSideLabel ?? "גרסת המבקש",
      narrative: claimantNarrative,
      sections: [
        { label: "ראיות תומכות", items: ourEvidence },
        { label: "פסיקה תומכת", items: ourPrecedents },
      ],
    },
    opposing: {
      label: opposingSideLabel ?? "גרסת המשיב",
      narrative: opposingNarrative,
      sections: [
        { label: "טיעונים מקשים", items: opposingEvidence },
        { label: "פסיקה לצד שכנגד", items: opposingPrecedents },
      ],
    },
    ambiguous: {
      label: "לא חד משמעי",
      narrative: null,
      sections: [
        { label: "פסיקה וחקיקה", items: legalSources },
        { label: "ראיות וסתירות", items: unclearContradictions },
      ],
    },
  };

  // ── Column more-count helpers ──────────────────────────────────────────────
  const ourMore       = Math.max(0, ourEvidence.length - SECTION_LIMIT) + Math.max(0, ourPrecedents.length - SECTION_LIMIT);
  const opposingMore  = Math.max(0, opposingEvidence.length - SECTION_LIMIT) + Math.max(0, opposingPrecedents.length - SECTION_LIMIT);
  const ambiguousMore = Math.max(0, legalSources.length - SECTION_LIMIT) + Math.max(0, unclearContradictions.length - SECTION_LIMIT);

  const synthesis = [coreDispute, summary].filter(Boolean).join(" — ");

  // ── Three-column view (always rendered) ───────────────────────────────────
  return (
    <div className="w-full relative">

      {/* Main three-column content */}
      <div className="px-8 py-6">

        {/* Title + badges */}
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <h1 className="text-[19px] font-bold text-slate-900 leading-tight">{issue.title}</h1>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold bg-slate-900 text-white rounded-md px-2.5 py-1">{importanceLabel}</span>
            {strength && <span className={`text-[11px] font-semibold border rounded-md px-2.5 py-1 ${strengthBadgeClass(strength)}`}>{strengthLabel(strength)}</span>}
            {isUpdated && (
              <span className="inline-flex items-center gap-1 text-[9.5px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <span className="w-1 h-1 rounded-full bg-amber-400 inline-block" />עודכן
              </span>
            )}
          </div>
        </div>

        <InlinePendingUpdates
          issue={issue} latestDelta={latestDelta}
          onAcceptAssessmentChange={onAcceptAssessmentChange} onRejectAssessmentChange={onRejectAssessmentChange}
          onAcceptEvidenceUpdate={onAcceptEvidenceUpdate} onRejectEvidenceUpdate={onRejectEvidenceUpdate}
          onAcceptContradiction={onAcceptContradiction} onRejectContradiction={onRejectContradiction}
          onAcceptWorkItem={onAcceptWorkItem} onRejectWorkItem={onRejectWorkItem}
        />

        {synthesis && (
          <p className="text-[15.5px] text-slate-800 leading-[1.8] font-normal mt-3 mb-5">{synthesis}</p>
        )}

        {/* Three columns */}
        <div className="grid grid-cols-3 gap-6 mb-6">

          {/* Zone A — our side (rightmost in RTL) */}
          <div className="min-w-0 overflow-hidden">
            <div className="h-[3px] rounded-full bg-emerald-300 mb-3" />
            <div className="text-[12.5px] font-bold text-emerald-700 mb-2">{zones.our.label}</div>
            {claimantNarrative && <p className="text-[13px] text-slate-700 leading-[1.7] mb-1 break-words">{claimantNarrative}</p>}
            <SectionBlock label="ראיות תומכות" items={ourEvidence} limit={SECTION_LIMIT} />
            <SectionBlock label="פסיקה תומכת" items={ourPrecedents} limit={SECTION_LIMIT} />
            <DetailLink moreCount={ourMore} onClick={() => setDetailPane("our")} />
          </div>

          {/* Zone B — opposing (middle) */}
          <div className="min-w-0 overflow-hidden">
            <div className="h-[3px] rounded-full bg-amber-300 mb-3" />
            <div className="text-[12.5px] font-bold text-amber-700 mb-2">{zones.opposing.label}</div>
            {opposingNarrative && <p className="text-[13px] text-slate-700 leading-[1.7] mb-1 break-words">{opposingNarrative}</p>}
            <SectionBlock label="טיעונים מקשים" items={opposingEvidence} limit={SECTION_LIMIT} />
            <SectionBlock label="פסיקה לצד שכנגד" items={opposingPrecedents} limit={SECTION_LIMIT} />
            {!opposingNarrative && !opposingEvidence.length && !opposingPrecedents.length && (
              <p className="text-[12px] text-slate-300 italic mt-2">טרם זוהו טיעונים נגדיים.</p>
            )}
            <DetailLink moreCount={opposingMore} onClick={() => setDetailPane("opposing")} />
          </div>

          {/* Zone C — ambiguous (leftmost in RTL) */}
          <div className="min-w-0 overflow-hidden">
            <div className="h-[3px] rounded-full bg-slate-300 mb-3" />
            <div className="text-[12.5px] font-bold text-slate-500 mb-2">לא חד משמעי</div>
            <SectionBlock label="פסיקה וחקיקה" items={legalSources} limit={SECTION_LIMIT} />
            <SectionBlock label="ראיות וסתירות" items={unclearContradictions} limit={SECTION_LIMIT} />
            {!legalSources.length && !unclearContradictions.length && (
              <p className="text-[12px] text-slate-300 italic mt-2">אין פריטים לא חד משמעיים.</p>
            )}
            <DetailLink moreCount={ambiguousMore} onClick={() => setDetailPane("ambiguous")} />
          </div>

        </div>

        {/* Three accordion panels — items-start prevents grid stretch */}
        <div className="border-t border-slate-100 pt-4 grid grid-cols-3 gap-4 items-start">
          <AccordionPanel title="שאלות ללקוח" count={clientQuestions.length} accentColor="amber">
            <ClientQuestions items={clientQuestions} issueId={issue.id} onAddInfo={onWorkspaceUpdate} />
          </AccordionPanel>
          <AccordionPanel title="פערים ראייתיים" count={evidenceGaps.length} accentColor="orange">
            <div>{evidenceGaps.map((item, i) => <HoverItem key={i} {...item} />)}</div>
          </AccordionPanel>
          <AccordionPanel title="צעדים להמשך" count={nextSteps.length} accentColor="indigo">
            <div>{nextSteps.map((item, i) => <HoverItem key={i} {...item} />)}</div>
          </AccordionPanel>
        </div>

      </div>

      {/* White overlay — covers the main content column (positioned relative to the App column) */}
      {detailPane && (
        <div className="absolute inset-0 z-50 bg-white overflow-y-auto shadow-[-6px_0_32px_rgba(0,0,0,0.10)]">
          <DetailPaneView
            pane={detailPane}
            onBack={() => setDetailPane(null)}
            zones={zones}
            accordions={accordions}
            issue={issue}
            onWorkspaceUpdate={onWorkspaceUpdate}
          />
        </div>
      )}

    </div>
  );
}
