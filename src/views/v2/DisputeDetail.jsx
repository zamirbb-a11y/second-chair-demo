import { useState } from "react";
import InlinePendingUpdates from "./InlinePendingUpdates";

// ─── Config ───────────────────────────────────────────────────────────────────

const ENTITY_TYPES = {
  ראיה:          { bg: "bg-blue-50",    text: "text-blue-600"    },
  פסיקה:         { bg: "bg-purple-50",  text: "text-purple-600"  },
  חקיקה:         { bg: "bg-violet-50",  text: "text-violet-700"  },
  עד:            { bg: "bg-teal-50",    text: "text-teal-700"    },
  מסמך:          { bg: "bg-slate-100",  text: "text-slate-500"   },
  "פער ראייתי":  { bg: "bg-orange-50",  text: "text-orange-600"  },
  פער:           { bg: "bg-amber-50",   text: "text-amber-700"   },
  מחזק:          { bg: "bg-emerald-50", text: "text-emerald-700" },
  מקשה:          { bg: "bg-red-50",     text: "text-red-600"     },
  "שאלה ללקוח":  { bg: "bg-amber-50",   text: "text-amber-800"   },
  "ראיה להשגה":  { bg: "bg-sky-50",     text: "text-sky-600"     },
  פעולה:         { bg: "bg-indigo-50",  text: "text-indigo-600"  },
  "פער משפטי":   { bg: "bg-rose-50",    text: "text-rose-600"    },
  "מחקר משפטי":  { bg: "bg-violet-50",  text: "text-violet-600"  },
  כיוון:         { bg: "bg-indigo-50",  text: "text-indigo-600"  },
  "לא ברור":     { bg: "bg-slate-50",   text: "text-slate-500"   },
};

const STRENGTH_LABELS = {
  very_strong: "גבוה מאוד", strong: "גבוה", medium_strong: "בינוני-גבוה",
  medium: "בינוני", medium_weak: "בינוני-נמוך", weak: "נמוך",
  very_weak: "נמוך מאוד", unclear: "לא ברור",
};
const IMPORTANCE_LABELS = { central: "מרכזית", secondary: "משנית", peripheral: "שולית" };

function strengthLabel(v) { return STRENGTH_LABELS[v] ?? v ?? ""; }
function strengthBadgeClass(s) {
  if (["very_strong","strong"].includes(s)) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (s === "medium_strong") return "bg-blue-100 text-blue-800 border-blue-200";
  if (s === "medium")        return "bg-slate-100 text-slate-600 border-slate-200";
  if (s === "medium_weak")   return "bg-amber-100 text-amber-700 border-amber-200";
  if (["weak","very_weak"].includes(s)) return "bg-orange-100 text-orange-700 border-orange-200";
  return "bg-slate-100 text-slate-500 border-slate-200";
}
function workItemTag(type) {
  switch (type) {
    case "client_question":    return "שאלה ללקוח";
    case "evidence_to_obtain": return "ראיה להשגה";
    case "suggested_action":   return "פעולה";
    case "pleading_gap":       return "פער משפטי";
    case "legal_research":     return "מחקר משפטי";
    default:                   return "כיוון";
  }
}
function evidenceTag(type) {
  switch (type) {
    case "witness":  return "עד";
    case "document": return "מסמך";
    case "missing":  return "פער ראייתי";
    default:         return "ראיה";
  }
}

// Distinguish statutes/regulations from court precedents
const STATUTE_RE = /^(חוק|תקנות?|פקודת?|חוקה|הוראות?|צו)\s/;
function legalTag(text) {
  return STATUTE_RE.test(typeof text === "string" ? text : "") ? "חקיקה" : "פסיקה";
}

// ─── Entity item — expandable ─────────────────────────────────────────────────

function EntityItem({ tag, text, detail, meta, isNew }) {
  const [expanded, setExpanded] = useState(false);
  const config = ENTITY_TYPES[tag] ?? null;
  const isPrecedent = tag === "פסיקה";
  if (!text) return null;

  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-start gap-3">
        {isNew && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-2" title="נוסף לאחר הניתוח הראשוני" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-0.5">
            {config && (
              <span className={`text-[9px] font-bold px-1.5 py-[3px] rounded flex-shrink-0 mt-0.5 leading-none ${config.bg} ${config.text}`}>
                {tag}
              </span>
            )}
            <p className="text-[13.5px] text-slate-700 leading-[1.6] font-medium">{text}</p>
          </div>

          {detail && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="text-[11px] text-slate-300 hover:text-blue-500 bg-transparent border-0 cursor-pointer mt-0.5 mr-[30px]"
            >
              {isPrecedent ? "▸ הרלוונטיות לתיק" : "▸ הרחב"}
            </button>
          )}
          {expanded && (
            <div className="mt-2 mr-[30px] bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
              {isPrecedent && (
                <div className="text-[9.5px] font-bold text-purple-500 tracking-wide uppercase mb-1.5">
                  הרלוונטיות לתיק זה
                </div>
              )}
              <p className="text-[12.5px] text-slate-500 leading-relaxed">{detail}</p>
              {meta && <p className="text-[11px] text-slate-300 mt-1">{meta}</p>}
              <button
                onClick={() => setExpanded(false)}
                className="mt-2 text-[10.5px] text-slate-300 hover:text-slate-500 bg-transparent border-0 cursor-pointer"
              >
                ▴ סגור
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Unresolved block — evidence/precedents with unclear directional impact ───
// Not collapsible. Only shows when there are genuinely ambiguous items.

function UnresolvedBlock({ items }) {
  if (!items.length) return null;

  return (
    <div className="mt-7 pt-6 border-t border-slate-100">
      <div className="text-[9.5px] font-bold text-slate-400 tracking-[0.08em] uppercase mb-4">
        ראיות ופסיקה שהשפעתן לא ברורה
      </div>
      <div>
        {items.map((item, i) => (
          <EntityItem key={i} {...item} />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DisputeDetail({
  issue,
  latestDelta,
  onUpdateIssue,
  onAcceptAssessmentChange,
  onRejectAssessmentChange,
  onAcceptEvidenceUpdate,
  onRejectEvidenceUpdate,
  onAcceptContradiction,
  onRejectContradiction,
  onAcceptWorkItem,
  onRejectWorkItem,
  onWorkspaceUpdate,
  ourSideLabel,
  opposingSideLabel,
  retrievedPrecedents,   // string[] from analysis.retrievedPrecedents (bank)
}) {
  if (!issue) return null;

  const effective   = issue.effectiveLegal ?? {};
  const strength    = effective.strength;
  const summary     = effective.summary;
  const relevantLaw = effective.relevantLaw ?? issue.legalAssessment?.relevantLaw ?? [];
  const importanceLabel = IMPORTANCE_LABELS[issue.importance] ?? issue.importance;
  const isUpdated   = (issue.updatedLegalFields?.length ?? 0) > 0;

  const evidenceOverlays      = issue.overlays?.evidence ?? [];
  const contradictionOverlays = issue.overlays?.contradictions ?? [];
  const workItemOverlays      = issue.overlays?.workItems ?? [];

  const claimantNarrative = issue.partyPositions?.claimant;
  const opposingNarrative = issue.partyPositions?.defendant;
  const coreDispute = issue.partyPositions?.coreDispute || issue.legalAssessment?.coreDispute;

  // Entities supporting our client's narrative — includes evidence, witnesses,
  // precedents (bank + analysis), statutes, and gap/question items
  const ourEntities = [
    ...(issue.linkedEvidence ?? []).map((e) => ({ tag: "ראיה", text: e, isNew: false })),
    ...(issue.linkedWitnesses ?? []).map((w) => ({
      tag: "עד",
      text: typeof w === "string" ? w : (w.name ?? w.title ?? ""),
      detail: typeof w === "object" ? (w.testimony ?? w.description ?? null) : null,
      isNew: false,
    })),
    ...evidenceOverlays
      .filter((e) => e.patch?.type !== "missing" && e.patch?.evidenceType !== "missing_evidence" && e.patch?.evidenceType !== "evidence_gap")
      .map((e) => ({
        tag: evidenceTag(e.patch?.type),
        text: e.patch?.title ?? "",
        detail: e.patch?.description ?? null,
        meta: e.patch?.source ? `מקור: ${e.patch.source}` : null,
        isNew: true,
      })),
    // Statutes and case law from the per-issue analysis
    ...relevantLaw.map((a) => {
      const o = typeof a === "object" && a !== null;
      const rawText = o ? (a.citation ?? a.title ?? JSON.stringify(a)) : String(a);
      return {
        tag: legalTag(rawText),
        text: rawText,
        detail: o && a.citation && a.title ? a.title : (o && a.summary ? a.summary : null),
        meta: o && a.year ? `שנה: ${a.year}` : null,
        isNew: false,
      };
    }),
    // Bank precedents (case-level, retrieved from the vector store)
    ...(retrievedPrecedents ?? []).map((p) => ({
      tag: "פסיקה",
      text: typeof p === "string" ? p : (p.citation ?? p.title ?? JSON.stringify(p)),
      detail: typeof p === "object" ? (p.summary ?? p.relevance ?? null) : null,
      isNew: false,
    })),
    ...contradictionOverlays
      .filter((c) => c.patch?.direction === "hurts_them")
      .map((c) => ({ tag: "מחזק", text: c.patch?.description ?? c.patch?.title ?? "", isNew: true })),
    // Missing evidence and client questions — belong here, not in a separate drawer
    ...(issue.missingInfo ?? []).map((m) => ({ tag: "פער", text: m, isNew: false })),
    ...(issue.actionItems?.clientQuestions ?? []).map((q) => ({
      tag: "שאלה ללקוח",
      text: typeof q === "string" ? q : (q.question ?? q.text ?? ""),
      detail: typeof q === "object" ? (q.context ?? null) : null,
      isNew: false,
    })),
    ...(issue.actionItems?.missingEvidence ?? []).map((m) => ({
      tag: "פער ראייתי",
      text: typeof m === "string" ? m : (m.title ?? m.description ?? ""),
      detail: typeof m === "object" ? (m.description ?? null) : null,
      isNew: false,
    })),
    ...evidenceOverlays
      .filter((e) => e.patch?.type === "missing" || e.patch?.evidenceType === "missing_evidence" || e.patch?.evidenceType === "evidence_gap")
      .map((e) => ({ tag: "פער ראייתי", text: e.patch?.title ?? "", detail: e.patch?.description ?? null, isNew: true })),
  ].filter((x) => x.text);

  // Entities constituting the opposing tension
  const opposingEntities = [
    ...contradictionOverlays
      .filter((c) => c.patch?.direction === "hurts_us")
      .map((c) => ({ tag: "מקשה", text: c.patch?.description ?? c.patch?.title ?? "", isNew: true })),
  ].filter((x) => x.text);

  // Unresolved: contradictions where direction is genuinely unclear
  const unresolvedItems = [
    ...contradictionOverlays
      .filter((c) => !["hurts_us", "hurts_them"].includes(c.patch?.direction))
      .map((c) => ({
        tag: "לא ברור",
        text: c.patch?.description ?? c.patch?.title ?? "",
        detail: c.patch?.severity
          ? `עוצמה: ${c.patch.severity === "high" ? "גבוהה" : c.patch.severity === "medium" ? "בינונית" : "נמוכה"}`
          : null,
        isNew: true,
      })),
  ].filter((x) => x.text);

  // Game changers — accepted work items and suggested actions
  const gameChangers = [
    ...workItemOverlays.map((w) => ({
      tag: workItemTag(w.type), text: w.title ?? "", detail: w.description ?? null, isNew: true,
    })),
    ...(issue.actionItems?.suggestedActions ?? []).map((a) => ({
      tag: "פעולה",
      text: typeof a === "string" ? a : (a.title ?? a.description ?? ""),
      detail: typeof a === "object" ? (a.description ?? null) : null,
      isNew: false,
    })),
  ].filter((x) => x.text);

  const synthesis = [coreDispute, summary].filter(Boolean).join(" — ");
  const hasNarrative = claimantNarrative || opposingNarrative
    || ourEntities.length > 0 || opposingEntities.length > 0;

  return (
    <div className="w-full px-10 py-8">

      {/* ── Title + inline badges ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap mb-6">
        <h1 className="text-[20px] font-bold text-slate-900 leading-tight">
          {issue.title}
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold bg-slate-900 text-white rounded-md px-2.5 py-1">
            {importanceLabel}
          </span>
          {strength && (
            <span className={`text-[11px] font-semibold border rounded-md px-2.5 py-1 ${strengthBadgeClass(strength)}`}>
              {strengthLabel(strength)}
            </span>
          )}
          {isUpdated && (
            <span className="inline-flex items-center gap-1 text-[9.5px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              <span className="w-1 h-1 rounded-full bg-amber-400 inline-block" />
              עודכן
            </span>
          )}
        </div>
      </div>

      {/* Pending updates */}
      <InlinePendingUpdates
        issue={issue}
        latestDelta={latestDelta}
        onAcceptAssessmentChange={onAcceptAssessmentChange}
        onRejectAssessmentChange={onRejectAssessmentChange}
        onAcceptEvidenceUpdate={onAcceptEvidenceUpdate}
        onRejectEvidenceUpdate={onRejectEvidenceUpdate}
        onAcceptContradiction={onAcceptContradiction}
        onRejectContradiction={onRejectContradiction}
        onAcceptWorkItem={onAcceptWorkItem}
        onRejectWorkItem={onRejectWorkItem}
      />

      {/* ── Synthesis — dominant reading ─────────────────────────────────────── */}
      {synthesis && (
        <div className="mt-5 mb-10">
          <p className="text-[17px] text-slate-800 leading-[1.85] font-normal">
            {synthesis}
          </p>
        </div>
      )}

      {/* ── Two-zone narrative surface ───────────────────────────────────────── */}
      {hasNarrative && (
        <div className="grid grid-cols-2 gap-16 mb-10">

          {/* Zone A — our client's narrative */}
          <div>
            <div className="h-[3px] rounded-full bg-emerald-300 mb-6" />
            {ourSideLabel && (
              <div className="text-[13px] font-bold text-emerald-700 mb-4">{ourSideLabel}</div>
            )}

            {claimantNarrative && (
              <p className="text-[15px] text-slate-700 leading-[1.78] mb-6">
                {claimantNarrative}
              </p>
            )}

            {ourEntities.length > 0 && (
              <div>
                {ourEntities.map((item, i) => (
                  <EntityItem key={i} {...item} />
                ))}
              </div>
            )}

            {/* Unresolved — only genuinely ambiguous direction items */}
            <UnresolvedBlock items={unresolvedItems} />
          </div>

          {/* Zone B — competing narrative and tensions */}
          <div>
            <div className="h-[3px] rounded-full bg-amber-300 mb-6" />
            {opposingSideLabel && (
              <div className="text-[13px] font-bold text-amber-700 mb-4">{opposingSideLabel}</div>
            )}

            {opposingNarrative && (
              <p className="text-[15px] text-slate-700 leading-[1.78] mb-6">
                {opposingNarrative}
              </p>
            )}

            {opposingEntities.length > 0 && (
              <div>
                {opposingEntities.map((item, i) => (
                  <EntityItem key={i} {...item} />
                ))}
              </div>
            )}

            {!opposingNarrative && opposingEntities.length === 0 && (
              <p className="text-[13.5px] text-slate-300 italic">
                טרם זוהו טיעונים נגדיים ספציפיים.
              </p>
            )}
          </div>

        </div>
      )}

      {/* ── Game changers ────────────────────────────────────────────────────── */}
      {gameChangers.length > 0 && (
        <div className="border-t border-slate-100 pt-8 mb-8">
          <div className="text-[9.5px] font-bold text-blue-600 tracking-[0.1em] uppercase mb-6">
            מה עלול לשנות את התמונה
          </div>
          <div className="grid grid-cols-2 gap-x-16">
            {gameChangers.map((item, i) => (
              <EntityItem key={i} {...item} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
