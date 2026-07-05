import { useState } from "react";
import InlinePendingUpdates from "./InlinePendingUpdates";

// ─── Config ───────────────────────────────────────────────────────────────────

const CHIP_STYLES = {
  ראיה:         { bg: "bg-blue-50",    text: "text-blue-600"    },
  פסיקה:        { bg: "bg-purple-50",  text: "text-purple-600"  },
  חקיקה:        { bg: "bg-violet-50",  text: "text-violet-700"  },
  עד:           { bg: "bg-teal-50",    text: "text-teal-700"    },
  מסמך:         { bg: "bg-slate-100",  text: "text-slate-600"   },
  "פער ראייתי": { bg: "bg-orange-50",  text: "text-orange-700"  },
  פער:          { bg: "bg-amber-50",   text: "text-amber-700"   },
  מחזק:         { bg: "bg-emerald-50", text: "text-emerald-700" },
  מקשה:         { bg: "bg-red-50",     text: "text-red-700"     },
  "שאלה ללקוח": { bg: "bg-amber-50",   text: "text-amber-800"   },
  "ראיה להשגה": { bg: "bg-sky-50",     text: "text-sky-700"     },
  פעולה:        { bg: "bg-indigo-50",  text: "text-indigo-600"  },
  "פער משפטי":  { bg: "bg-rose-50",    text: "text-rose-700"    },
  "מחקר משפטי": { bg: "bg-violet-50",  text: "text-violet-600"  },
  כיוון:        { bg: "bg-indigo-50",  text: "text-indigo-600"  },
  "לא ברור":    { bg: "bg-slate-100",  text: "text-slate-600"   },
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
  return "bg-slate-100 text-slate-600 border-slate-200";
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
        {chipConfig && (
          <span className={`text-xs font-bold px-1.5 py-[3px] rounded flex-shrink-0 mt-0.5 leading-tight ${chipConfig.bg} ${chipConfig.text}`}>
            {chipConfig.name}
          </span>
        )}
        <p
          className={[
            "text-sm text-slate-700 leading-snug font-medium flex-1 min-w-0 break-words",
            tooltip ? "underline underline-offset-2 decoration-slate-300 cursor-help" : "",
          ].join(" ")}
          onMouseEnter={tooltip ? (e) => setTipPos({ x: e.clientX, y: e.clientY }) : undefined}
          onMouseLeave={tooltip ? () => setTipPos(null) : undefined}
          onMouseMove={tooltip ? (e) => setTipPos({ x: e.clientX, y: e.clientY }) : undefined}
        >
          {text}
          {isNew && (
            <span className="inline-block mr-1.5 text-xs font-bold px-1.5 py-[2px] rounded bg-amber-100 text-amber-700 border border-amber-200 leading-tight align-middle">חדש</span>
          )}
        </p>
      </div>
      {tipPos && tooltip && (
        <div
          className="z-[9999] bg-slate-900 text-white text-xs rounded-xl px-3 py-2.5 leading-relaxed shadow-xl pointer-events-none"
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
      <div className="text-xs font-semibold text-slate-500 mb-0.5">{label}</div>
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
        <span className={`text-sm font-semibold ${ac.label}`}>{title}</span>
        <div className="flex items-center gap-2">
          {has && <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${ac.badge}`}>{count}</span>}
          {has && <span className={`text-xs ${ac.label} opacity-60`}>{open ? "▴" : "▾"}</span>}
        </div>
      </button>
      {open && has && <div className="px-4 py-3 bg-white">{children}</div>}
    </div>
  );
}

// ─── ClientQuestions ──────────────────────────────────────────────────────────

function ClientQuestions({ items, issueId, onAddInfo, onIssueFileUpload, onMarkAnswered }) {
  const [state, setState] = useState({});
  function get(i) { return state[i] ?? {}; }

  function submitText(i, qText) {
    const t = get(i).text?.trim();
    if (!t) return;
    onAddInfo?.({ type: "client_answer", targetType: "issue", targetId: issueId, title: `תשובה: ${qText.slice(0, 50)}`, text: t });
    onMarkAnswered?.(issueId, qText);
    setState((s) => ({ ...s, [i]: { done: true } }));
  }

  async function submitFile(i, qText, file) {
    setState((s) => ({ ...s, [i]: { ...s[i], uploading: true } }));
    await onIssueFileUpload?.(file, issueId, `תשובה (קובץ): ${qText.slice(0, 50)}`);
    onMarkAnswered?.(issueId, qText);
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
              <span className={`text-xs font-bold px-1.5 py-[3px] rounded flex-shrink-0 mt-0.5 leading-tight ${cs.bg} ${cs.text}`}>שאלה ללקוח</span>
              <p className="text-sm text-slate-700 leading-snug font-medium">
                {qText}
                {q.isNew && <span className="inline-block mr-1.5 text-xs font-bold px-1.5 py-[2px] rounded bg-amber-100 text-amber-700 border border-amber-200 leading-tight align-middle">חדש</span>}
              </p>
            </div>
            {s.mode === "answering" ? (
              <div className="mr-[46px] space-y-1.5">
                <textarea value={s.text ?? ""} onChange={(e) => setState((st) => ({ ...st, [i]: { ...s, text: e.target.value } }))} rows={2} autoFocus placeholder="תשובת הלקוח..." className="w-full text-[12px] border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 resize-none bg-white leading-relaxed" />
                {onIssueFileUpload && (
                  <label className={["flex items-center gap-1.5 text-[11px] cursor-pointer border rounded-lg px-3 py-1.5 transition-colors", s.uploading ? "border-slate-200 bg-slate-50 text-slate-400" : "border-dashed border-amber-300 text-amber-600 hover:border-amber-400"].join(" ")}>
                    {s.uploading ? "מעלה..." : s.fileName ? `✓ ${s.fileName}` : "+ צרף קובץ"}
                    <input type="file" accept=".docx,.txt,.pdf" className="hidden" disabled={s.uploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setState((st) => ({ ...st, [i]: { ...s, fileName: file.name } }));
                        await submitFile(i, qText, file);
                      }}
                    />
                  </label>
                )}
                <div className="flex gap-2">
                  <button onClick={() => submitText(i, qText)} disabled={!s.text?.trim()} className="text-[11px] bg-slate-900 text-white px-3 py-1.5 rounded-lg border-0 cursor-pointer disabled:opacity-40 hover:bg-slate-800">שמור תשובה</button>
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

// ─── ClickableInfoItem — expandable item with text + file input, triggers reanalysis ──

function ClickableInfoItem({ chipConfig, text, isNew, issueId, onAddInfo, onIssueFileUpload, updateType, placeholder, saveLabel, onAnswered }) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [fileState, setFileState] = useState({ name: null, uploading: false });
  const [done, setDone] = useState(false);

  if (done) return null;

  function handleSubmitText() {
    if (!answer.trim()) return;
    onAddInfo?.({ type: updateType, targetType: "issue", targetId: issueId, title: `${saveLabel}: ${text.slice(0, 50)}`, text: answer.trim() });
    onAnswered?.(text);
    setDone(true);
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file || !onIssueFileUpload) return;
    setFileState({ name: file.name, uploading: true });
    await onIssueFileUpload(file, issueId, `${saveLabel} (קובץ): ${text.slice(0, 50)}`);
    onAnswered?.(text);
    setDone(true);
  }

  return (
    <div className="py-2 border-b border-slate-100 last:border-0">
      <div className="flex items-start gap-1.5 cursor-pointer" onClick={() => setOpen((v) => !v)}>
        {chipConfig && (
          <span className={`text-xs font-bold px-1.5 py-[3px] rounded flex-shrink-0 mt-0.5 leading-tight ${chipConfig.bg} ${chipConfig.text}`}>
            {chipConfig.name}
          </span>
        )}
        <p className="text-[12.5px] text-slate-700 leading-snug font-medium flex-1 min-w-0 break-words underline underline-offset-2 decoration-amber-300">
          {text}
          {isNew && <span className="inline-block mr-1.5 text-xs font-bold px-1.5 py-[2px] rounded bg-amber-100 text-amber-700 border border-amber-200 leading-tight align-middle">חדש</span>}
        </p>
        <span className="text-[11px] text-slate-400 flex-shrink-0 mt-0.5">{open ? "▴" : "▾"}</span>
      </div>
      {open && (
        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
          <textarea
            autoFocus
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            placeholder={placeholder}
            className="w-full text-[12px] border border-amber-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400 resize-none bg-white leading-relaxed"
          />
          <label className={["flex items-center gap-1.5 text-[11px] cursor-pointer border rounded-lg px-3 py-1.5 transition-colors", fileState.uploading ? "border-slate-200 bg-slate-50 text-slate-400" : fileState.name ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-dashed border-amber-300 text-amber-600 hover:border-amber-400"].join(" ")}>
            {fileState.uploading ? "מעלה..." : fileState.name ? `✓ ${fileState.name}` : "+ צרף קובץ"}
            <input type="file" accept=".docx,.txt,.pdf" className="hidden" disabled={fileState.uploading} onChange={handleFile} />
          </label>
          <div className="flex gap-2">
            <button onClick={handleSubmitText} disabled={!answer.trim() || fileState.uploading} className="flex-1 py-1.5 bg-slate-900 text-white rounded-lg text-[11px] font-bold disabled:opacity-40 cursor-pointer border-0">{saveLabel}</button>
            <button onClick={() => setOpen(false)} className="py-1.5 px-3 text-[11px] text-slate-400 bg-transparent border-0 cursor-pointer">סגור</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ClickableQuestionItem(props) {
  return <ClickableInfoItem {...props} updateType="client_answer" placeholder="תשובת הלקוח..." saveLabel="שמור תשובה" />;
}

function ClickableGapItem(props) {
  return <ClickableInfoItem {...props} updateType="case_text_update" placeholder="הוסף מידע רלוונטי לפער זה..." saveLabel="שמור מידע" />;
}

// ─── AdversarialReviewPanel — red-team findings from second AI pass ──────────

const IMPACT_META = {
  no_change:                { text: "אין שינוי צפוי בהערכה",                color: "slate"  },
  slightly_weaker:          { text: "מחליש מעט את העמדה",                    color: "amber"  },
  materially_weaker:        { text: "מחליש מהותית את העמדה",                 color: "orange" },
  assessment_should_change: { text: "הערכת הסיכויים זקוקה לבחינה מחדש",     color: "red"    },
};
const ADVERSARIAL_COLORS = {
  slate:  { border: "border-slate-200",  head: "bg-slate-50",   label: "text-slate-600",  badge: "bg-slate-100 text-slate-500",   dot: "bg-slate-400"  },
  amber:  { border: "border-amber-200",  head: "bg-amber-50",   label: "text-amber-800",  badge: "bg-amber-100 text-amber-700",   dot: "bg-amber-400"  },
  orange: { border: "border-orange-200", head: "bg-orange-50",  label: "text-orange-800", badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  red:    { border: "border-red-200",    head: "bg-red-50",     label: "text-red-800",    badge: "bg-red-100 text-red-700",       dot: "bg-red-500"    },
};

function AdversarialReviewPanel({ review, isLoading, onRetry }) {
  const isMaterial =
    review?.impactOnAssessment === "materially_weaker" ||
    review?.impactOnAssessment === "assessment_should_change";
  const [open, setOpen] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);

  if (!review) {
    if (isLoading) {
      return (
        <div className="mt-4 mb-1 flex items-center gap-2 text-[11.5px] text-slate-400">
          <span className="animate-spin inline-block">⏳</span>
          מנתח עמדת הצד שכנגד…
        </div>
      );
    }
    if (!onRetry) return null;
    return (
      <div className="mt-4 mb-1">
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
        >
          ⟳ נסה שוב
        </button>
      </div>
    );
  }

  const impact = IMPACT_META[review.impactOnAssessment] ?? IMPACT_META.no_change;
  const colors = ADVERSARIAL_COLORS[impact.color];

  const hasDetails =
    review.vulnerableAssumptions?.length > 0 ||
    review.adverseEvidence?.length > 0 ||
    review.missingEvidenceThatMatters?.length > 0 ||
    review.judgeConcern;

  return (
    <div className={`mt-6 border ${colors.border} rounded-xl overflow-hidden`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-5 py-3 ${colors.head} border-0 cursor-pointer`}
      >
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full ${colors.dot} flex-shrink-0`} />
          <span className={`text-[12.5px] font-semibold ${colors.label}`}>ניתוח הצד שכנגד</span>
          {isMaterial && (
            <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>{impact.text}</span>
          )}
        </div>
        <span className={`text-[11px] ${colors.label} opacity-60`}>{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="px-5 py-4 bg-white space-y-3">
          {review.strongestAttack && (
            <div>
              <div className="text-[9px] font-bold text-slate-400 tracking-[0.08em] uppercase mb-1">למה אנחנו עלולים להפסיד?</div>
              <p className="text-[13px] text-slate-800 leading-relaxed">{review.strongestAttack}</p>
            </div>
          )}
          {review.opposingCounselLikelyArgument && (
            <div>
              <div className="text-[9px] font-bold text-slate-400 tracking-[0.08em] uppercase mb-1">מה הצד השני יטען?</div>
              <p className="text-[13px] text-slate-700 leading-relaxed">{review.opposingCounselLikelyArgument}</p>
            </div>
          )}
          {review.recommendedNextStep && (
            <div>
              <div className="text-[9px] font-bold text-slate-400 tracking-[0.08em] uppercase mb-1">מה צריך להשיג כדי לחזק את התיק?</div>
              <p className="text-[13px] text-slate-700 font-medium leading-relaxed">{review.recommendedNextStep}</p>
            </div>
          )}

          {hasDetails && (
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => setFullOpen((v) => !v)}
                className="text-[11px] text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer p-0"
              >
                {fullOpen ? "הסתר ניתוח מלא ▴" : "הצג ניתוח מלא ▾"}
              </button>

              {fullOpen && (
                <div className="mt-3 space-y-3">
                  {review.vulnerableAssumptions?.length > 0 && (
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 tracking-[0.08em] uppercase mb-1">הנחות שניתן לקעקע</div>
                      <ul className="space-y-1">
                        {review.vulnerableAssumptions.map((a, i) => (
                          <li key={i} className="text-[12.5px] text-slate-700 flex items-start gap-1.5">
                            <span className="text-slate-300 mt-[3px] flex-shrink-0">—</span>{a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {review.adverseEvidence?.length > 0 && (
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 tracking-[0.08em] uppercase mb-1">ראיות שסותרות</div>
                      <ul className="space-y-1">
                        {review.adverseEvidence.map((e, i) => (
                          <li key={i} className="text-[12.5px] text-slate-700 flex items-start gap-1.5">
                            <span className="text-slate-300 mt-[3px] flex-shrink-0">—</span>{e}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {review.missingEvidenceThatMatters?.length > 0 && (
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 tracking-[0.08em] uppercase mb-1">ראיות חסרות שמחלישות</div>
                      <ul className="space-y-1">
                        {review.missingEvidenceThatMatters.map((m, i) => (
                          <li key={i} className="text-[12.5px] text-slate-700 flex items-start gap-1.5">
                            <span className="text-slate-300 mt-[3px] flex-shrink-0">—</span>{m}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {review.judgeConcern && (
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 tracking-[0.08em] uppercase mb-1">חשש פוטנציאלי של השופט</div>
                      <p className="text-[13px] text-slate-700 leading-relaxed">{review.judgeConcern}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
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

function DetailPaneView({ pane, onBack, zones, accordions, issue, onWorkspaceUpdate, onInfoUpdate, onIssueFileUpload, onMarkQuestionAnswered }) {
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
          <ClientQuestions items={accordions.questions} issueId={issue.id} onAddInfo={onInfoUpdate ?? onWorkspaceUpdate} onIssueFileUpload={onIssueFileUpload} onMarkAnswered={onMarkQuestionAnswered} />
        </AccordionPanel>
        <AccordionPanel title="פערים ראייתיים" count={accordions.gaps.length} accentColor="orange">
          <div>{accordions.gaps.map((item, i) => <ClickableGapItem key={i} {...item} issueId={issue.id} onAddInfo={onInfoUpdate ?? onWorkspaceUpdate} onIssueFileUpload={onIssueFileUpload} />)}</div>
        </AccordionPanel>
        <AccordionPanel title="צעדים להמשך" count={accordions.steps.length} accentColor="indigo">
          <div>{accordions.steps.map((item, i) =>
            item.chipConfig?.name === "שאלה ללקוח"
              ? <ClickableQuestionItem key={i} {...item} issueId={issue.id} onAddInfo={onInfoUpdate ?? onWorkspaceUpdate} onIssueFileUpload={onIssueFileUpload} onAnswered={(t) => onMarkQuestionAnswered?.(issue.id, t)} />
              : <HoverItem key={i} {...item} />
          )}</div>
        </AccordionPanel>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DisputeDetail({
  issue, latestDelta,
  onUpdateIssue,
  onApproveAll,
  onAcceptAssessmentChange, onRejectAssessmentChange,
  onAcceptEvidenceUpdate, onRejectEvidenceUpdate,
  onAcceptContradiction, onRejectContradiction,
  onAcceptWorkItem, onRejectWorkItem,
  onMarkQuestionAnswered,
  onWorkspaceUpdate, onInfoUpdate, onIssueFileUpload, clientRole = "claimant", ourSideLabel, opposingSideLabel, retrievedPrecedents,
  adversarialReview, isAdversarialLoading, onAnalyzeIssue,
  onOpenChat,
}) {
  const [detailPane, setDetailPane] = useState(null); // null | "our" | "opposing" | "ambiguous"
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "full"
  const [descExpanded, setDescExpanded] = useState(false);

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

  // ── Classify retrieved precedents by helps + clientRole ───────────────────
  const isDefendant  = clientRole === "defendant";
  const ourHelpKey   = isDefendant ? "defense" : "claimant";
  const theirHelpKey = isDefendant ? "claimant" : "defense";

  const ourPrecedents = (retrievedPrecedents ?? [])
    .filter(p => typeof p === "object" && p.helps?.toLowerCase() === ourHelpKey)
    .map(p => precedentItem(p, isDefendant ? "defendant" : "claimant"))
    .filter(x => x.text);

  const opposingPrecedents = (retrievedPrecedents ?? [])
    .filter(p => typeof p === "object" && p.helps?.toLowerCase() === theirHelpKey)
    .map(p => precedentItem(p, isDefendant ? "claimant" : "defendant"))
    .filter(x => x.text);

  const ambiguousPrecedents = (retrievedPrecedents ?? [])
    .filter(p => {
      const h = typeof p === "object" ? p.helps?.toLowerCase() : null;
      return h !== ourHelpKey && h !== theirHelpKey;
    })
    .map(p => precedentItem(p, "ambiguous"))
    .filter(x => x.text);

  // ── Zone A: our evidence + our precedents ──────────────────────────────────
  const ourParty = isDefendant ? "defendant" : "claimant";
  const newEvidenceOverlays = evidenceOverlays.filter((e) => !MISSING_TYPES.has(e.patch?.evidenceType ?? e.patch?.type));
  const ourEvidence = [
    ...(issue.linkedEvidence ?? []).map((e) => ({ chipConfig: mkChip("ראיה"), text: typeof e === "string" ? e : (e.title ?? ""), tooltip: typeof e === "object" ? (e.description ?? null) : null })),
    ...(issue.linkedWitnesses ?? []).map((w) => ({ chipConfig: mkChip("עד"), text: typeof w === "string" ? w : (w.name ?? w.title ?? ""), tooltip: typeof w === "object" ? (w.testimony ?? w.description ?? null) : null })),
    ...newEvidenceOverlays.filter((e) => { const bp = e.patch?.benefitsParty ?? "claimant"; return bp === ourParty || bp === "both"; }).map((e) => ({ chipConfig: evidenceOverlayChip(e.patch?.evidenceType ?? e.patch?.type), text: e.patch?.title ?? "", tooltip: e.patch?.description ?? null, isNew: true })),
    ...contradictionOverlays.filter((c) => c.patch?.direction === "hurts_them").map((c) => ({ chipConfig: mkChip("מחזק"), text: c.patch?.description ?? c.patch?.title ?? "", isNew: true })),
  ].filter((x) => x.text);

  // ── Zone B: challenge points from initial analysis + hurts_us contradictions ─
  const opposingParty = isDefendant ? "claimant" : "defendant";
  const opposingEvidence = [
    ...(issue.challengePoints ?? []).map((cp) => ({ chipConfig: mkChip("מקשה"), text: typeof cp === "string" ? cp : (cp.title ?? cp.description ?? ""), tooltip: typeof cp === "object" ? (cp.description ?? null) : null })),
    ...newEvidenceOverlays.filter((e) => { const bp = e.patch?.benefitsParty ?? "claimant"; return bp === opposingParty; }).map((e) => ({ chipConfig: evidenceOverlayChip(e.patch?.evidenceType ?? e.patch?.type), text: e.patch?.title ?? "", tooltip: e.patch?.description ?? null, isNew: true })),
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
  const answeredQuestions = issue.answeredQuestions ?? new Set();
  const clientQuestions = [
    ...(issue.actionItems?.clientQuestions ?? []),
    ...workItemOverlays
      .filter((w) => w.type === "client_question")
      .map((w) => ({ text: w.title ?? "", isNew: true })),
  ].filter((q) => {
    const raw = (typeof q === "string" ? q : (q.question ?? q.text ?? "")).trim();
    if (!raw) return false;
    const norm = raw.replace(/\s+/g, " ").replace(/[?!.،]+$/, "").toLowerCase();
    return !([...answeredQuestions].some(a =>
      a.replace(/\s+/g, " ").replace(/[?!.،]+$/, "").toLowerCase() === norm
    ));
  });

  const evidenceGaps = (() => {
    const seen = new Set();
    return [
      ...(issue.missingInfo ?? []).map((m) => ({ chipConfig: mkChip("פער"), text: m })),
      ...evidenceOverlays.filter((e) => MISSING_TYPES.has(e.patch?.evidenceType ?? e.patch?.type)).map((e) => ({ chipConfig: mkChip("פער ראייתי"), text: e.patch?.title ?? "", tooltip: e.patch?.description ?? null, isNew: true })),
    ].filter((x) => {
      if (!x.text) return false;
      const key = x.text.trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  const nextSteps = [
    ...workItemOverlays
      .filter((w) => w.type !== "client_question")
      .map((w) => ({ chipConfig: workItemChip(w.type), text: w.title ?? "", tooltip: w.description ?? null, isNew: true })),
    ...(issue.actionItems?.suggestedActions ?? []).map((a) => ({ chipConfig: mkChip("פעולה"), text: typeof a === "string" ? a : (a.title ?? a.description ?? ""), tooltip: typeof a === "object" ? (a.description ?? null) : null })),
  ].filter((x) => x.text);

  const accordions = { questions: clientQuestions, gaps: evidenceGaps, steps: nextSteps };

  // ── Zone descriptors passed to detail pane ─────────────────────────────────
  // When clientRole === "defendant", swap narratives and evidence zones so the
  // "our" column reflects the defending side, not the claimant side.
  const zones = {
    our: {
      label: ourSideLabel ?? "הצד שלנו",
      narrative: isDefendant ? opposingNarrative : claimantNarrative,
      sections: [
        { label: "ראיות תומכות", items: isDefendant ? opposingEvidence : ourEvidence },
        { label: "פסיקה תומכת", items: ourPrecedents },
      ],
    },
    opposing: {
      label: opposingSideLabel ?? "הצד שכנגד",
      narrative: isDefendant ? claimantNarrative : opposingNarrative,
      sections: [
        { label: "טיעונים מקשים", items: isDefendant ? ourEvidence : opposingEvidence },
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
  const ourMore       = Math.max(0, zones.our.sections[0].items.length - SECTION_LIMIT) + Math.max(0, zones.our.sections[1].items.length - SECTION_LIMIT);
  const opposingMore  = Math.max(0, zones.opposing.sections[0].items.length - SECTION_LIMIT) + Math.max(0, zones.opposing.sections[1].items.length - SECTION_LIMIT);
  const ambiguousMore = Math.max(0, legalSources.length - SECTION_LIMIT) + Math.max(0, unclearContradictions.length - SECTION_LIMIT);

  const synthesis = [coreDispute, summary].filter(Boolean).join(" — ");

  // Top items for overview tab — isNew (AI-enriched) first
  const topEvidence = [
    ...ourEvidence.filter(e => e.isNew), ...opposingEvidence.filter(e => e.isNew),
    ...ourEvidence.filter(e => !e.isNew), ...opposingEvidence.filter(e => !e.isNew),
  ].slice(0, 3);
  const topGaps = evidenceGaps.slice(0, 3);

  return (
    <div className="w-full relative">
      <div className="px-8 py-6">

        {/* Title + badges */}
        <div className="mb-4">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="text-[19px] font-bold text-slate-900 leading-tight">{issue.title}</h1>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold bg-slate-900 text-white rounded-md px-2.5 py-1">{importanceLabel}</span>
              {strength && <span title={`סיכויי הטענה של ${zones.our.label ?? "הצד שלנו"} לנצח בטענה זו`} className={`text-[11px] font-semibold border rounded-md px-2.5 py-1 ${strengthBadgeClass(strength)}`}>{strengthLabel(strength)}</span>}
              {isUpdated && (
                <span className="inline-flex items-center gap-1 text-[9.5px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <span className="w-1 h-1 rounded-full bg-amber-400 inline-block" />עודכן
                </span>
              )}
            </div>
          </div>
        </div>

        {synthesis && (
          <div className="mt-3 mb-4">
            <p className={`text-[15.5px] text-slate-800 leading-[1.8] font-normal ${descExpanded ? "" : "line-clamp-1"}`}>
              {synthesis}
            </p>
            <button
              onClick={() => setDescExpanded(v => !v)}
              className="mt-1 text-[11px] text-blue-500 hover:text-blue-700 bg-transparent border-0 cursor-pointer p-0"
            >
              {descExpanded ? "הסתר ▴" : "הצג עוד ▾"}
            </button>
          </div>
        )}

        <InlinePendingUpdates
          issue={issue} latestDelta={latestDelta}
          onApproveAll={onApproveAll}
          onAcceptAssessmentChange={onAcceptAssessmentChange} onRejectAssessmentChange={onRejectAssessmentChange}
          onAcceptEvidenceUpdate={onAcceptEvidenceUpdate} onRejectEvidenceUpdate={onRejectEvidenceUpdate}
          onAcceptContradiction={onAcceptContradiction} onRejectContradiction={onRejectContradiction}
          onAcceptWorkItem={onAcceptWorkItem} onRejectWorkItem={onRejectWorkItem}
        />

        {/* Tab bar */}
        <div className="flex gap-1 mt-4 mb-5 border-b border-slate-200 items-center">
          {[["overview", "מבט על"], ["full", "ניתוח מלא"], ["adversarial", "הצד שכנגד"]].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 text-[12.5px] font-semibold border-b-2 -mb-px transition-colors cursor-pointer bg-transparent ${
                activeTab === id
                  ? "border-slate-800 text-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
          <div className="flex-1" />
          {onOpenChat && (
            <button
              onClick={() => onOpenChat(issue.id, issue.title)}
              className="mb-px flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-semibold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
              title="שאל שאלה על סוגיה זו"
            >
              <span>💬</span>
              <span>שאל</span>
            </button>
          )}
        </div>

        {/* ── Overview tab — 2×2 KPI cards ──────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-2 gap-3">

            {/* Strongest argument */}
            <div className="border border-emerald-100 rounded-xl p-4 bg-emerald-50/30">
              <div className="text-[9px] font-bold text-emerald-600 tracking-[0.08em] uppercase mb-2">מה עומד לזכותנו?</div>
              {isAdversarialLoading && !adversarialReview
                ? <span className="text-[11px] text-slate-400 flex items-center gap-1.5"><span className="animate-spin inline-block">⏳</span> מנתח…</span>
                : adversarialReview?.strongestArgument
                  ? <p className="text-[12px] text-slate-800 leading-relaxed">{adversarialReview.strongestArgument}</p>
                  : <p className="text-[12px] text-slate-400">אין ניתוח עדיין</p>
              }
            </div>

            {/* Risk */}
            <div className="border border-red-100 rounded-xl p-4 bg-red-50/30">
              <div className="text-[9px] font-bold text-red-400 tracking-[0.08em] uppercase mb-2">מה הסיכון המרכזי?</div>
              {isAdversarialLoading && !adversarialReview
                ? <span className="text-[11px] text-slate-400 flex items-center gap-1.5"><span className="animate-spin inline-block">⏳</span> מנתח…</span>
                : adversarialReview?.strongestAttack
                  ? <p className="text-[12px] text-slate-800 leading-relaxed">{adversarialReview.strongestAttack}</p>
                  : <p className="text-[12px] text-slate-400">אין ניתוח עדיין</p>
              }
            </div>

            {/* Gap */}
            <div className="border border-amber-100 rounded-xl p-4 bg-amber-50/30">
              <div className="text-[9px] font-bold text-amber-600 tracking-[0.08em] uppercase mb-2">מה חסר לנו?</div>
              {topGaps[0]
                ? <p className="text-[12px] text-slate-700 leading-relaxed">{topGaps[0].text}</p>
                : <p className="text-[12px] text-slate-400">לא זוהו פערים</p>
              }
            </div>

            {/* Action */}
            <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/20">
              <div className="text-[9px] font-bold text-indigo-600 tracking-[0.08em] uppercase mb-2">מה הפעולה הבאה?</div>
              {(adversarialReview?.recommendedNextStep || nextSteps[0])
                ? <p className="text-[12px] text-slate-700 font-medium leading-relaxed">
                    {adversarialReview?.recommendedNextStep ?? nextSteps[0]?.text}
                  </p>
                : <p className="text-[12px] text-slate-400">טרם הוגדרה פעולה</p>
              }
            </div>

          </div>
        )}

        {/* ── Full analysis tab ────────────────────────────────────────────── */}
        {activeTab === "full" && (
          <>
            {/* Assessment history */}
            {(issue.overlays?.assessmentChanges ?? [])
              .filter(o => o.patch?.field === "legalAssessment.summary" && o.patch?.previousValue)
              .map((o, i) => (
                <div key={i} className="mt-2 mb-4 border-r-2 border-amber-300 pr-3 py-1">
                  <div className="text-[9px] font-bold text-amber-600 tracking-[0.07em] uppercase mb-0.5">הסיכום הקודם</div>
                  <p className="text-[12.5px] text-slate-400 leading-[1.7] line-through">{o.patch.previousValue}</p>
                  {o.patch.reason && <p className="text-[11px] text-amber-600 mt-0.5">סיבה: {o.patch.reason}</p>}
                </div>
              ))
            }

            {/* Three columns */}
            <div className="grid grid-cols-3 gap-6 mb-6 mt-6">
              <div className="min-w-0 overflow-hidden">
                <div className="h-[3px] rounded-full bg-emerald-300 mb-3" />
                <div className="text-[12.5px] font-bold text-emerald-700 mb-2">{zones.our.label}</div>
                {zones.our.narrative && <p className="text-[13px] text-slate-700 leading-[1.7] mb-1 break-words">{zones.our.narrative}</p>}
                <SectionBlock label="ראיות תומכות" items={zones.our.sections[0].items} limit={SECTION_LIMIT} />
                <SectionBlock label="פסיקה תומכת" items={zones.our.sections[1].items} limit={SECTION_LIMIT} />
                <DetailLink moreCount={ourMore} onClick={() => setDetailPane("our")} />
              </div>

              <div className="min-w-0 overflow-hidden">
                <div className="h-[3px] rounded-full bg-amber-300 mb-3" />
                <div className="text-[12.5px] font-bold text-amber-700 mb-2">{zones.opposing.label}</div>
                {zones.opposing.narrative && <p className="text-[13px] text-slate-700 leading-[1.7] mb-1 break-words">{zones.opposing.narrative}</p>}
                <SectionBlock label="טיעונים מקשים" items={zones.opposing.sections[0].items} limit={SECTION_LIMIT} />
                <SectionBlock label="פסיקה לצד שכנגד" items={zones.opposing.sections[1].items} limit={SECTION_LIMIT} />
                {!zones.opposing.narrative && !zones.opposing.sections[0].items.length && !zones.opposing.sections[1].items.length && (
                  <p className="text-[12px] text-slate-300 italic mt-2">טרם זוהו טיעונים נגדיים.</p>
                )}
                <DetailLink moreCount={opposingMore} onClick={() => setDetailPane("opposing")} />
              </div>

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

            {/* Three accordion panels */}
            <div className="border-t border-slate-100 pt-4 grid grid-cols-3 gap-4 items-start">
              <AccordionPanel title="שאלות ללקוח" count={clientQuestions.length} accentColor="amber">
                <ClientQuestions items={clientQuestions} issueId={issue.id} onAddInfo={onInfoUpdate ?? onWorkspaceUpdate} onIssueFileUpload={onIssueFileUpload} />
              </AccordionPanel>
              <AccordionPanel title="פערים ראייתיים" count={evidenceGaps.length} accentColor="orange">
                <div>{evidenceGaps.map((item, i) => <ClickableGapItem key={i} {...item} issueId={issue.id} onAddInfo={onInfoUpdate ?? onWorkspaceUpdate} onIssueFileUpload={onIssueFileUpload} />)}</div>
              </AccordionPanel>
              <AccordionPanel title="צעדים להמשך" count={nextSteps.length} accentColor="indigo">
                <div>{nextSteps.map((item, i) =>
                  item.chipConfig?.name === "שאלה ללקוח"
                    ? <ClickableQuestionItem key={i} {...item} issueId={issue.id} onAddInfo={onInfoUpdate ?? onWorkspaceUpdate} onIssueFileUpload={onIssueFileUpload} onAnswered={(t) => onMarkQuestionAnswered?.(issue.id, t)} />
                    : <HoverItem key={i} {...item} />
                )}</div>
              </AccordionPanel>
            </div>
          </>
        )}

        {/* ── הצד שכנגד tab ────────────────────────────────────────────── */}
        {activeTab === "adversarial" && (
          isAdversarialLoading && !adversarialReview
            ? <div className="text-[12px] text-slate-400 flex items-center gap-2 py-4"><span className="animate-spin inline-block">⏳</span> מנתח עמדת הצד שכנגד…</div>
            : !adversarialReview
              ? <div className="py-4">
                  {onAnalyzeIssue && <button onClick={() => onAnalyzeIssue(issue.id, issue.title, issue.description ?? "")} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] text-slate-400 bg-slate-50 hover:bg-slate-100 cursor-pointer">⟳ נסה שוב</button>}
                </div>
              : <div className="space-y-3">

                  {/* Top 2×2 */}
                  <div className="grid grid-cols-2 gap-3">
                    {adversarialReview.strongestAttack && (
                      <div className="border border-red-100 rounded-xl p-4 bg-red-50/30">
                        <div className="text-[9px] font-bold text-red-400 tracking-[0.08em] uppercase mb-2">הטיעון החזק ביותר נגדנו</div>
                        <p className="text-[12px] text-slate-800 leading-relaxed">{adversarialReview.strongestAttack}</p>
                      </div>
                    )}
                    {adversarialReview.opposingCounselLikelyArgument && (
                      <div className="border border-orange-100 rounded-xl p-4 bg-orange-50/20">
                        <div className="text-[9px] font-bold text-orange-500 tracking-[0.08em] uppercase mb-2">מה עוה"ד יריב יפתח איתו</div>
                        <p className="text-[12px] text-slate-700 leading-relaxed">{adversarialReview.opposingCounselLikelyArgument}</p>
                      </div>
                    )}
                    {adversarialReview.judgeConcern && (
                      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                        <div className="text-[9px] font-bold text-slate-400 tracking-[0.08em] uppercase mb-2">חשש פוטנציאלי של השופט</div>
                        <p className="text-[12px] text-slate-700 leading-relaxed">{adversarialReview.judgeConcern}</p>
                      </div>
                    )}
                    {adversarialReview.recommendedNextStep && (
                      <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/20">
                        <div className="text-[9px] font-bold text-indigo-600 tracking-[0.08em] uppercase mb-2">פעולה מומלצת</div>
                        <p className="text-[12px] text-slate-700 font-medium leading-relaxed">{adversarialReview.recommendedNextStep}</p>
                      </div>
                    )}
                  </div>

                  {/* Arrays */}
                  {(adversarialReview.vulnerableAssumptions?.length > 0 ||
                    adversarialReview.adverseEvidence?.length > 0 ||
                    adversarialReview.missingEvidenceThatMatters?.length > 0) && (
                    <div className="grid grid-cols-3 gap-3">
                      {adversarialReview.vulnerableAssumptions?.length > 0 && (
                        <div className="border border-slate-100 rounded-xl p-4">
                          <div className="text-[9px] font-bold text-slate-400 tracking-[0.08em] uppercase mb-2">הנחות שניתן לקעקע</div>
                          <ul className="space-y-1.5">{adversarialReview.vulnerableAssumptions.map((a, i) => (
                            <li key={i} className="text-[12px] text-slate-700 flex items-start gap-1.5"><span className="text-slate-300 flex-shrink-0 mt-0.5">—</span>{a}</li>
                          ))}</ul>
                        </div>
                      )}
                      {adversarialReview.adverseEvidence?.length > 0 && (
                        <div className="border border-slate-100 rounded-xl p-4">
                          <div className="text-[9px] font-bold text-slate-400 tracking-[0.08em] uppercase mb-2">ראיות שסותרות</div>
                          <ul className="space-y-1.5">{adversarialReview.adverseEvidence.map((e, i) => (
                            <li key={i} className="text-[12px] text-slate-700 flex items-start gap-1.5"><span className="text-slate-300 flex-shrink-0 mt-0.5">—</span>{e}</li>
                          ))}</ul>
                        </div>
                      )}
                      {adversarialReview.missingEvidenceThatMatters?.length > 0 && (
                        <div className="border border-slate-100 rounded-xl p-4">
                          <div className="text-[9px] font-bold text-slate-400 tracking-[0.08em] uppercase mb-2">ראיות חסרות שמחלישות</div>
                          <ul className="space-y-1.5">{adversarialReview.missingEvidenceThatMatters.map((m, i) => (
                            <li key={i} className="text-[12px] text-slate-700 flex items-start gap-1.5"><span className="text-slate-300 flex-shrink-0 mt-0.5">—</span>{m}</li>
                          ))}</ul>
                        </div>
                      )}
                    </div>
                  )}

                </div>
        )}

      </div>

      {/* White overlay detail pane */}
      {detailPane && (
        <div className="absolute inset-0 z-50 bg-white overflow-y-auto shadow-[-6px_0_32px_rgba(0,0,0,0.10)]">
          <DetailPaneView
            pane={detailPane}
            onBack={() => setDetailPane(null)}
            zones={zones}
            accordions={accordions}
            issue={issue}
            onWorkspaceUpdate={onWorkspaceUpdate}
            onInfoUpdate={onInfoUpdate}
            onIssueFileUpload={onIssueFileUpload}
            onMarkQuestionAnswered={onMarkQuestionAnswered}
          />
        </div>
      )}

    </div>
  );
}
