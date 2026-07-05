import { useState, useRef, useEffect } from "react";

// ─── Config ────────────────────────────────────────────────────────────────────

const IMPORTANCE = {
  central:    { label: "חשיבות מרכזית" },
  secondary:  { label: "חשיבות משנית"  },
  peripheral: { label: "חשיבות שולית"  },
};

const STRENGTH = {
  strong: { label: "טענה חזקה",    dot: "bg-emerald-500" },
  medium: { label: "טענה בינונית", dot: "bg-amber-400"   },
  weak:   { label: "טענה חלשה",    dot: "bg-red-400"     },
};

// Section title labels change per side; icons stay
const SECTION_CFG = {
  opposing: {
    weaknesses:       { icon: "⚠", title: "חולשות הטענה"                     },
    contradictions:   { icon: "↯", title: "סתירות פנימיות"                   },
    missingResponses: { icon: "→", title: "מה לא נטען / פעולות נדרשות מאתנו" },
    authorities:      { icon: "⚖", title: "פסיקה וחקיקה"                       },
    qa:               { icon: "◎", title: "ניתוח הטענה"                       },
    quotes:           { icon: "❝", title: "ציטוטים מכתב הטענות"               },
  },
  ours: {
    weaknesses:       { icon: "⚠", title: "נקודות לחיזוק"           },
    contradictions:   { icon: "↩", title: "טיעון נגדי צפוי"          },
    missingResponses: { icon: "→", title: "ראיות נדרשות / פעולות"    },
    authorities:      { icon: "⚖", title: "פסיקה"                    },
    qa:               { icon: "◎", title: "הערכת עמידת הטענה"         },
    quotes:           { icon: "❝", title: "נוסח בכתב הטענות"          },
  },
};

const AUTHORITY_SIDE_LABEL = {
  supports_them: "לטובתם",
  neutral:       "ניטרלי",
  supports_us:   "לטובתנו",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function findPleading(bundles, pleadingId) {
  for (const b of bundles) {
    const p = b.pleadings.find(p => p.id === pleadingId);
    if (p) return p;
  }
  return null;
}

function findClaim(bundles, claimId) {
  for (const b of bundles) {
    for (const p of b.pleadings) {
      const c = p.claims.find(c => c.id === claimId);
      if (c) return c;
    }
  }
  return null;
}

// ─── Minimal collapsible ───────────────────────────────────────────────────────

function Section({ icon, title, count, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full text-right py-2 border-b border-slate-200 text-slate-600 hover:text-slate-800 transition-colors bg-transparent border-t-0 border-l-0 border-r-0 cursor-pointer"
      >
        <span className="text-xs">{icon}</span>
        <span className="flex-1 text-xs font-semibold">{title}</span>
        {count !== undefined && (
          <span className="text-xs text-slate-500 font-normal">{count}</span>
        )}
        <span className="text-[9px] text-slate-300">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="pt-2">{children}</div>}
    </div>
  );
}

function BulletList({ items }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 rounded-lg bg-white border border-slate-100 px-3 py-2">
          <span className="w-1 h-1 rounded-full bg-slate-400 mt-[6px] flex-shrink-0" />
          <span className="text-sm text-slate-700 leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Claim card (used in PleadingDetail list) ──────────────────────────────────

function ClaimCard({
  claim, isSourceForMerge, isMergeTarget,
  onSelect, onRename, onDelete, onSplit, onStartMerge, onCompleteMerge,
}) {
  const [hovered,   setHovered]   = useState(false);
  const [editing,   setEditing]   = useState(false);
  const [editValue, setEditValue] = useState(claim.title);
  const inputRef = useRef(null);

  const isPending = claim.status === "pending";
  const str = STRENGTH[claim.strength] ?? STRENGTH.medium;

  function commitRename() {
    const t = editValue.trim();
    if (t && t !== claim.title) onRename?.(t);
    else setEditValue(claim.title);
    setEditing(false);
  }

  const cardCls = [
    "rounded-xl border px-3 py-2.5 flex items-start gap-3 transition-all",
    isSourceForMerge ? "border-amber-300 bg-amber-50 ring-2 ring-amber-200" :
    isMergeTarget    ? "border-emerald-300 bg-emerald-50 cursor-pointer hover:ring-2 hover:ring-emerald-200" :
    isPending        ? "border-slate-200 bg-slate-50" :
                       "border-slate-200 bg-white cursor-pointer hover:bg-slate-50 hover:shadow-sm",
  ].join(" ");

  return (
    <div
      className={cardCls}
      onClick={() => {
        if (editing) return;
        if (isMergeTarget) { onCompleteMerge?.(); return; }
        if (!isSourceForMerge && !isPending) onSelect?.();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            autoFocus
            dir="rtl"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { setEditValue(claim.title); setEditing(false); }
            }}
            className="text-sm font-semibold w-full border border-blue-300 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-blue-200 bg-white"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <p className={`text-sm font-semibold leading-snug ${isPending ? "text-slate-500" : "text-slate-800"}`}>
            {claim.title}
          </p>
        )}
        {!isPending && claim.qa?.answer && !editing && (
          <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">{claim.qa.answer}</p>
        )}
        {isPending && !editing && (
          <p className="text-xs text-slate-500 mt-0.5 italic">ממתין לניתוח AI</p>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
        {isMergeTarget ? (
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full px-2 py-0.5">
            מזג לכאן ←
          </span>
        ) : isSourceForMerge ? (
          <span className="text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
            מקור המיזוג
          </span>
        ) : (
          <>
            {!isPending && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${str.dot}`} />}
            {hovered && !editing && (
              <div className="flex items-center gap-0.5 mr-1" onClick={e => e.stopPropagation()}>
                <button
                  title="שנה שם"
                  onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); }}
                  className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors bg-transparent border-0 cursor-pointer text-[11px]"
                >✎</button>
                <button
                  title="פצל לשתי טענות"
                  onClick={() => onSplit?.()}
                  className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors bg-transparent border-0 cursor-pointer text-[11px]"
                >⟊</button>
                <button
                  title="מזג עם טענה אחרת"
                  onClick={() => onStartMerge?.()}
                  className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors bg-transparent border-0 cursor-pointer text-[11px] font-bold"
                >⊕</button>
                <button
                  title="מחק טענה"
                  onClick={() => { if (window.confirm(`למחוק את הטענה "${claim.title}"?`)) onDelete?.(); }}
                  className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors bg-transparent border-0 cursor-pointer text-[12px] leading-none"
                >×</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Claim detail — two-column ─────────────────────────────────────────────────

function ClaimDetail({ claim, onAskAI, onRename, onDelete, onSplit }) {
  const [renamingTitle, setRenamingTitle] = useState(false);
  const [renameValue,   setRenameValue]   = useState(claim.title);
  const renameRef = useRef(null);

  const side       = claim.side ?? "opposing";
  const cfg        = SECTION_CFG[side];
  const importance = IMPORTANCE[claim.importance] ?? IMPORTANCE.secondary;
  const strength   = STRENGTH[claim.strength] ?? STRENGTH.medium;
  const isPending  = claim.status === "pending";

  // Keep renameValue in sync if the claim prop is swapped (e.g. after external rename)
  useEffect(() => { setRenameValue(claim.title); setRenamingTitle(false); }, [claim.id]);

  function commitRename() {
    const t = renameValue.trim();
    if (t && t !== claim.title) onRename?.(t);
    else setRenameValue(claim.title);
    setRenamingTitle(false);
  }

  const ACTION_BTN = "text-xs px-2 py-0.5 rounded border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-white transition-all cursor-pointer bg-transparent";
  const ACTION_BTN_RED = `${ACTION_BTN} hover:!text-red-500 hover:!border-red-200 hover:!bg-red-50`;

  // ── Pending claim ─────────────────────────────────────────────────────────────
  if (isPending) {
    return (
      <div className="space-y-4" dir="rtl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 font-medium mb-1">
              {claim.type === "main" ? "טענה מרכזית" : "טענת משנה"}
              {" · "}
              {side === "opposing" ? "כתב הצד שכנגד" : "כתב טענות שלנו"}
            </p>
            {renamingTitle ? (
              <input
                ref={renameRef}
                autoFocus
                dir="rtl"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={e => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") { setRenameValue(claim.title); setRenamingTitle(false); }
                }}
                className="text-lg font-bold text-slate-900 w-full border-b-2 border-blue-400 outline-none bg-transparent pb-0.5"
              />
            ) : (
              <h2 className="text-xl font-bold text-slate-900 leading-snug">{claim.title}</h2>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 pt-1">
            {onRename && !renamingTitle && (
              <button
                onClick={() => { setRenamingTitle(true); setTimeout(() => renameRef.current?.focus(), 0); }}
                className={ACTION_BTN}
              >✎ שנה שם</button>
            )}
            {onDelete && (
              <button
                onClick={() => { if (window.confirm(`למחוק את הטענה "${claim.title}"?`)) onDelete(); }}
                className={ACTION_BTN_RED}
              >× מחק</button>
            )}
          </div>
        </div>

        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center space-y-1">
          <p className="text-sm text-slate-500 font-medium">ממתין לניתוח AI</p>
          <p className="text-sm text-slate-600 leading-relaxed">
            הטענה נוצרה ידנית. ניתוח אוטומטי יתווסף בגרסה הבאה של המערכת.
          </p>
        </div>
      </div>
    );
  }

  // ── Analyzed claim ────────────────────────────────────────────────────────────
  function buildPrompt(mode) {
    const parts = [];
    if (mode === "counter") {
      parts.push(`נסח תגובה לטענת הצד שכנגד:`);
      parts.push(`טענה: ${claim.title}`);
      if (claim.qa?.answer) parts.push(`ניתוח: ${claim.qa.answer}`);
      if (claim.weaknesses?.length) parts.push(`חולשות שזוהו: ${claim.weaknesses.join(" | ")}`);
    } else {
      parts.push(`שפר את הניסוח וחזק את הטיעון:`);
      parts.push(`טענה: ${claim.title}`);
      if (claim.qa?.answer) parts.push(`ניסוח נוכחי: ${claim.qa.answer}`);
      if (claim.weaknesses?.length) parts.push(`נקודות לשיפור: ${claim.weaknesses.join(" | ")}`);
    }
    return parts.join("\n");
  }

  return (
    <div className="space-y-5" dir="rtl">

      {/* ── Header ── */}
      <div className="space-y-2">
        <p className="text-xs text-slate-500 font-medium">
          {claim.type === "main" ? "טענה מרכזית" : "טענת משנה"}
          {" · "}
          {side === "opposing" ? "כתב הצד שכנגד" : "כתב טענות שלנו"}
        </p>

        {renamingTitle ? (
          <input
            ref={renameRef}
            autoFocus
            dir="rtl"
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { setRenameValue(claim.title); setRenamingTitle(false); }
            }}
            className="text-xl font-bold text-slate-900 w-full border-b-2 border-blue-400 outline-none bg-transparent pb-0.5"
          />
        ) : (
          <h2 className="text-xl font-bold text-slate-900 leading-snug">{claim.title}</h2>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-slate-500 border border-slate-200 rounded-full px-2.5 py-0.5">
              {importance.label}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500 border border-slate-200 rounded-full px-2.5 py-0.5">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${strength.dot}`} />
              {strength.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
            {/* Structural actions */}
            {onRename && !renamingTitle && (
              <button
                onClick={() => { setRenamingTitle(true); setTimeout(() => renameRef.current?.focus(), 0); }}
                className={ACTION_BTN}
                title="שנה שם טענה"
              >✎ שנה שם</button>
            )}
            {onSplit && (
              <button onClick={onSplit} className={ACTION_BTN} title="פצל לשתי טענות">⟊ פצל</button>
            )}
            {onDelete && (
              <button
                onClick={() => { if (window.confirm(`למחוק את הטענה "${claim.title}"?`)) onDelete(); }}
                className={ACTION_BTN_RED}
                title="מחק טענה"
              >× מחק</button>
            )}
            {/* AI actions */}
            {onAskAI && (
              <>
                <button
                  onClick={() => onAskAI(buildPrompt("counter"))}
                  className="text-xs px-2.5 py-1 rounded-full border border-slate-200 text-slate-500 hover:text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50 transition-all cursor-pointer bg-white"
                  title="בקש מהבינה המלאכותית לנסח תגובה לטענה זו"
                >💬 נסח תגובה</button>
                <button
                  onClick={() => onAskAI(buildPrompt("improve"))}
                  className="text-xs px-2.5 py-1 rounded-full border border-slate-200 text-slate-500 hover:text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50 transition-all cursor-pointer bg-white"
                  title="בקש מהבינה המלאכותית לשפר את ניסוח הטענה"
                >✏️ שפר ניסוח</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── QA — full width ── */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 space-y-1.5">
        <p className="text-xs font-semibold text-slate-500">{claim.qa?.question}</p>
        <p className="text-sm text-slate-800 leading-relaxed">{claim.qa?.answer}</p>
      </div>

      {/* ── Two-column grid ── */}
      <div className="grid grid-cols-[55fr_45fr] gap-5">

        {/* Right column — action items (first in RTL = right side) */}
        <div className="space-y-4">
          {claim.weaknesses?.length > 0 && (
            <Section icon={cfg.weaknesses.icon} title={cfg.weaknesses.title} count={claim.weaknesses.length} defaultOpen={true}>
              <BulletList items={claim.weaknesses} />
            </Section>
          )}
          {claim.contradictions?.length > 0 && (
            <Section icon={cfg.contradictions.icon} title={cfg.contradictions.title} count={claim.contradictions.length} defaultOpen={true}>
              <BulletList items={claim.contradictions} />
            </Section>
          )}
          {claim.missingResponses?.length > 0 && (
            <Section icon={cfg.missingResponses.icon} title={cfg.missingResponses.title} count={claim.missingResponses.length} defaultOpen={true}>
              <BulletList items={claim.missingResponses} />
            </Section>
          )}
        </div>

        {/* Left column — reference material */}
        <div className="space-y-4">
          {claim.sourceSpans?.length > 0 && (
            <Section icon={cfg.quotes.icon} title={cfg.quotes.title} count={claim.sourceSpans.length} defaultOpen={true}>
              <div className="space-y-2">
                {claim.sourceSpans.map((s, i) => (
                  <blockquote key={i} className="rounded-lg bg-white border border-slate-100 border-r-2 border-r-slate-400 px-3 py-2 text-sm text-slate-600 italic leading-relaxed">
                    "{s.text}"
                    <span className="block text-xs text-slate-500 not-italic mt-0.5">סעיף {s.paragraph}</span>
                  </blockquote>
                ))}
              </div>
            </Section>
          )}

          {claim.authorities?.length > 0 && (
            <Section icon={cfg.authorities.icon} title={cfg.authorities.title} count={claim.authorities.length} defaultOpen={true}>
              <div className="space-y-2">
                {claim.authorities.map((a, i) => (
                  <div key={i} className="rounded-lg bg-white border border-slate-100 px-3 py-2.5 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12.5px] font-semibold text-slate-800 leading-snug">{a.name}</p>
                      <span className="text-[10px] text-slate-400 flex-shrink-0 pt-0.5">
                        {AUTHORITY_SIDE_LABEL[a.side] ?? ""}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 leading-snug">{a.relevance}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Pleading overview (one document selected) ─────────────────────────────────

function PleadingDetail({ pleading, onSelectClaim, onAddClaim, onRenameClaim, onDeleteClaim, onSplitClaim, onMergeClaims }) {
  const [addingClaim,    setAddingClaim]    = useState(false);
  const [newClaimTitle,  setNewClaimTitle]  = useState("");
  const [mergingClaimId, setMergingClaimId] = useState(null);
  const addInputRef = useRef(null);

  const isOpp      = pleading.side === "opposing";
  const mainClaims = pleading.claims.filter(c => c.type === "main" || !c.parentId);
  const central    = mainClaims.filter(c => c.importance === "central");

  function handleAddClaim() {
    const t = newClaimTitle.trim();
    if (!t) return;
    onAddClaim?.(t);
    setNewClaimTitle("");
    setAddingClaim(false);
  }

  return (
    <div className="space-y-4" dir="rtl">

      {/* ── Document header ── */}
      <div className={`rounded-2xl border p-4 ${isOpp ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`text-xs font-semibold mb-0.5 ${isOpp ? "text-red-600" : "text-emerald-700"}`}>
              {isOpp ? "כתב הצד שכנגד" : "כתב טענות שלנו"}
            </p>
            <p className="text-base font-bold text-slate-900">{pleading.docType}</p>
            {pleading.filedBy && (
              <p className="text-xs text-slate-500 mt-0.5">{pleading.filedBy} · הוגש {pleading.filedAt}</p>
            )}
          </div>
          <div className="flex gap-4 flex-shrink-0">
            <div className="text-center">
              <p className="text-xl font-bold text-slate-800 tabular-nums">{mainClaims.length}</p>
              <p className="text-xs text-slate-600">טענות</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-blue-600 tabular-nums">{central.length}</p>
              <p className="text-xs text-slate-600">מרכזיות</p>
            </div>
          </div>
        </div>
        {pleading.summary && (
          <p className="text-sm text-slate-600 leading-relaxed mt-3">{pleading.summary}</p>
        )}
      </div>

      {/* ── Claims list ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 font-semibold">טענות</p>
          {mergingClaimId && (
            <button
              onClick={() => setMergingClaimId(null)}
              className="text-xs text-slate-500 hover:text-slate-600 cursor-pointer bg-transparent border-0 flex items-center gap-1"
            >
              × ביטול מיזוג
            </button>
          )}
        </div>

        {mainClaims.length > 0 ? (
          mainClaims.map(claim => (
            <ClaimCard
              key={claim.id}
              claim={claim}
              isSourceForMerge={mergingClaimId === claim.id}
              isMergeTarget={mergingClaimId !== null && mergingClaimId !== claim.id}
              onSelect={() => onSelectClaim(pleading.bundleId, pleading.id, claim.id)}
              onRename={(newTitle) => onRenameClaim?.(claim.id, newTitle)}
              onDelete={() => {
                onDeleteClaim?.(claim.id);
                if (mergingClaimId === claim.id) setMergingClaimId(null);
              }}
              onSplit={() => onSplitClaim?.(claim.id)}
              onStartMerge={() => setMergingClaimId(claim.id)}
              onCompleteMerge={() => {
                onMergeClaims?.(mergingClaimId, claim.id);
                setMergingClaimId(null);
              }}
            />
          ))
        ) : (
          <p className="text-xs text-slate-500 text-center py-3">אין טענות עדיין</p>
        )}

        {/* Add claim row */}
        {addingClaim ? (
          <div className="flex gap-2 pt-1">
            <input
              ref={addInputRef}
              autoFocus
              dir="rtl"
              value={newClaimTitle}
              onChange={e => setNewClaimTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") handleAddClaim();
                if (e.key === "Escape") { setNewClaimTitle(""); setAddingClaim(false); }
              }}
              placeholder="כותרת הטענה…"
              className="flex-1 text-sm border border-blue-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 bg-white"
            />
            <button
              onClick={handleAddClaim}
              disabled={!newClaimTitle.trim()}
              className="px-3 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg disabled:opacity-30 cursor-pointer border-0 hover:bg-slate-700 transition-colors"
            >הוסף</button>
            <button
              onClick={() => { setNewClaimTitle(""); setAddingClaim(false); }}
              className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 bg-transparent border-0 cursor-pointer"
            >ביטול</button>
          </div>
        ) : (
          <button
            onClick={() => setAddingClaim(true)}
            className="w-full py-2 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500 hover:border-slate-300 hover:text-slate-600 hover:bg-slate-50 transition-all bg-transparent cursor-pointer mt-1"
          >
            + הוסף טענה
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Bundle overview ───────────────────────────────────────────────────────────

function BundleDetail({ bundle, onSelectPleading }) {
  const uploaded = bundle.pleadings.filter(p => p.status === "analyzed");
  const pending  = bundle.pleadings.filter(p => p.status === "pending");

  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <p className="text-xs text-slate-500 font-semibold mb-1">אגד כתבי טענות</p>
        <h2 className="text-lg font-bold text-slate-900">{bundle.label}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{uploaded.length} מתוך {bundle.pleadings.length} הועלו</p>
      </div>

      {uploaded.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 font-semibold">הועלו ונותחו</p>
          {uploaded.map(p => {
            const isOpp = p.side === "opposing";
            const mainCount = p.claims.filter(c => c.type === "main" || !c.parentId).length;
            return (
              <div
                key={p.id}
                className={`rounded-xl border p-3.5 flex items-center gap-3 cursor-pointer hover:brightness-95 hover:shadow-sm transition-all ${isOpp ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"}`}
                onClick={() => onSelectPleading(bundle.id, p.id)}
              >
                <div className="flex-1">
                  <span className={`text-xs font-semibold ${isOpp ? "text-red-600" : "text-emerald-700"}`}>
                    {isOpp ? "שכנגד" : "שלנו"}
                  </span>
                  <p className="text-sm font-bold text-slate-900">{p.docType}</p>
                  {p.filedBy && <p className="text-xs text-slate-500 mt-0.5">{p.filedBy} · {p.filedAt}</p>}
                  {p.summary && <p className="text-xs text-slate-600 mt-1 leading-snug line-clamp-2">{p.summary}</p>}
                </div>
                <div className="text-center flex-shrink-0">
                  <p className="text-xl font-bold text-slate-700 tabular-nums">{mainCount}</p>
                  <p className="text-xs text-slate-600">טענות</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 font-semibold">ממתינים להעלאה</p>
          {pending.map(p => {
            const isOpp = p.side === "opposing";
            return (
              <div key={p.id} className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3.5 flex items-center gap-3">
                <div className="flex-1">
                  <span className={`text-xs font-semibold ${isOpp ? "text-red-400" : "text-emerald-500"}`}>
                    {isOpp ? "שכנגד" : "שלנו"}
                  </span>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">{p.docType}</p>
                </div>
                <button className="rounded-lg bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 hover:bg-slate-700 transition-colors border-0 cursor-pointer flex-shrink-0">
                  העלה
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Top-level overview ────────────────────────────────────────────────────────

function BundlesOverview({ bundles, onSelectBundle, onSelectPleading }) {
  return (
    <div className="space-y-5" dir="rtl">
      <p className="text-xs text-slate-500 font-semibold">כתבי טענות — סקירה</p>
      {bundles.map(bundle => {
        const uploaded = bundle.pleadings.filter(p => p.status === "analyzed").length;
        const total    = bundle.pleadings.length;
        return (
          <div key={bundle.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div
              className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100 hover:shadow-sm transition-all"
              onClick={() => onSelectBundle(bundle.id)}
            >
              <p className="text-[13px] font-bold text-slate-800">{bundle.label}</p>
              <span className="text-[11px] text-slate-400 tabular-nums">{uploaded}/{total}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {bundle.pleadings.map(p => {
                const isOpp    = p.side === "opposing";
                const isPending = p.status === "pending";
                return (
                  <div
                    key={p.id}
                    className={`px-4 py-2.5 flex items-center gap-3 transition-all ${isPending ? "opacity-50" : "cursor-pointer hover:bg-slate-50 hover:shadow-sm"}`}
                    onClick={() => !isPending && onSelectPleading(bundle.id, p.id)}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isPending ? "bg-slate-300" : "bg-emerald-400"}`} />
                    <span className="text-[12.5px] text-slate-700 flex-1">{p.docType}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${isOpp ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
                      {isOpp ? "שכנגד" : "שלנו"}
                    </span>
                    {!isPending && (
                      <span className="text-[10px] text-slate-400">{p.claims.filter(c => !c.parentId).length} טענות</span>
                    )}
                  </div>
                );
              })}
              {bundle.pleadings.length === 0 && (
                <div className="px-4 py-3 text-[12px] text-slate-400 text-center">אין כתבי טענות — גרור לכאן או לחץ על העלאה</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Upload placeholder ────────────────────────────────────────────────────────

function PleadingUpload() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white text-center px-8 py-16 gap-4" dir="rtl">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">⚖</div>
      <div className="space-y-1">
        <p className="text-[15px] font-bold text-slate-800">ניתוח כתבי טענות</p>
        <p className="text-[13px] text-slate-400 max-w-xs leading-relaxed">
          העלה כתב תביעה, כתב הגנה, תגובה לתביעה שכנגד — המערכת תנתח טענה אחר טענה
        </p>
      </div>
      <button className="mt-2 rounded-xl bg-slate-900 text-white text-[13px] font-semibold px-5 py-2.5 hover:bg-slate-800 transition-colors border-0 cursor-pointer">
        העלה כתב טענות
      </button>
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────

export default function PleadingView({
  bundles, selectedBundleId, selectedPleadingId, selectedClaimId,
  onSelectBundle, onSelectPleading, onSelectClaim, onAskAI, onUpdateBundles,
}) {
  if (!bundles?.length) return <PleadingUpload />;

  // ── Mutation helpers ─────────────────────────────────────────────────────────

  function mutatePleading(transform) {
    if (!onUpdateBundles || !selectedBundleId || !selectedPleadingId) return;
    onUpdateBundles(bundles.map(b =>
      b.id !== selectedBundleId ? b : {
        ...b,
        pleadings: b.pleadings.map(p =>
          p.id !== selectedPleadingId ? p : transform(p)
        ),
      }
    ));
  }

  function addClaim(title) {
    const pleading = findPleading(bundles, selectedPleadingId);
    mutatePleading(p => ({
      ...p,
      claims: [...p.claims, {
        id: `claim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        side: pleading?.side ?? "opposing",
        pleadingId: selectedPleadingId,
        title,
        type: "main",
        parentId: null,
        importance: "secondary",
        strength: "medium",
        status: "pending",
        qa: null,
        sourceSpans: [],
        weaknesses: [],
        contradictions: [],
        missingResponses: [],
        authorities: [],
      }],
    }));
  }

  function renameClaim(claimId, newTitle) {
    mutatePleading(p => ({
      ...p,
      claims: p.claims.map(c => c.id !== claimId ? c : { ...c, title: newTitle }),
    }));
  }

  function deleteClaim(claimId) {
    mutatePleading(p => ({
      ...p,
      claims: p.claims.filter(c => c.id !== claimId && c.parentId !== claimId),
    }));
    if (selectedClaimId === claimId) {
      onSelectPleading(selectedBundleId, selectedPleadingId);
    }
  }

  function splitClaim(claimId) {
    mutatePleading(p => {
      const idx = p.claims.findIndex(c => c.id === claimId);
      if (idx === -1) return p;
      const orig = p.claims[idx];
      const newClaim = {
        id: `claim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        side: orig.side,
        pleadingId: orig.pleadingId,
        title: `${orig.title} — המשך`,
        type: orig.type,
        parentId: orig.parentId,
        importance: orig.importance,
        strength: "medium",
        status: "pending",
        qa: null,
        sourceSpans: [],
        weaknesses: [],
        contradictions: [],
        missingResponses: [],
        authorities: [],
      };
      const next = [...p.claims];
      next.splice(idx + 1, 0, newClaim);
      return { ...p, claims: next };
    });
  }

  function mergeClaims(claimId1, claimId2) {
    mutatePleading(p => {
      const c1 = p.claims.find(c => c.id === claimId1);
      const c2 = p.claims.find(c => c.id === claimId2);
      if (!c1 || !c2) return p;
      const merged = {
        ...c1,
        title: `${c1.title} / ${c2.title}`,
        status: "pending",
        qa: null,
        weaknesses:       [...(c1.weaknesses       ?? []), ...(c2.weaknesses       ?? [])],
        contradictions:   [...(c1.contradictions   ?? []), ...(c2.contradictions   ?? [])],
        missingResponses: [...(c1.missingResponses ?? []), ...(c2.missingResponses ?? [])],
        authorities:      [...(c1.authorities      ?? []), ...(c2.authorities      ?? [])],
        sourceSpans:      [...(c1.sourceSpans      ?? []), ...(c2.sourceSpans      ?? [])],
      };
      return {
        ...p,
        claims: p.claims
          .filter(c => c.id !== claimId2 && c.parentId !== claimId2)
          .map(c => c.id === claimId1 ? merged : c),
      };
    });
    if (selectedClaimId === claimId2) {
      onSelectClaim(selectedBundleId, selectedPleadingId, claimId1);
    }
  }

  // ── Routing ──────────────────────────────────────────────────────────────────

  if (selectedClaimId) {
    const claim = findClaim(bundles, selectedClaimId);
    return claim ? (
      <ClaimDetail
        claim={claim}
        onAskAI={onAskAI}
        onRename={(title) => renameClaim(selectedClaimId, title)}
        onDelete={() => deleteClaim(selectedClaimId)}
        onSplit={() => splitClaim(selectedClaimId)}
      />
    ) : null;
  }

  if (selectedPleadingId) {
    const pleading = findPleading(bundles, selectedPleadingId);
    return pleading ? (
      <PleadingDetail
        pleading={pleading}
        onSelectClaim={onSelectClaim}
        onAddClaim={addClaim}
        onRenameClaim={renameClaim}
        onDeleteClaim={deleteClaim}
        onSplitClaim={splitClaim}
        onMergeClaims={mergeClaims}
      />
    ) : null;
  }

  if (selectedBundleId) {
    const bundle = bundles.find(b => b.id === selectedBundleId);
    return bundle ? <BundleDetail bundle={bundle} onSelectPleading={onSelectPleading} /> : null;
  }

  return <BundlesOverview bundles={bundles} onSelectBundle={onSelectBundle} onSelectPleading={onSelectPleading} />;
}
