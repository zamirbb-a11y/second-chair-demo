import { useEffect, useRef, useState } from "react";

const SECTION_CONFIG = {
  fact:     { label: "עובדות",       badge: "bg-blue-50 text-blue-700 border-blue-200" },
  legal:    { label: "ניתוח משפטי", badge: "bg-violet-50 text-violet-700 border-violet-200" },
  strategy: { label: "המלצה",       badge: "bg-amber-50 text-amber-700 border-amber-200" },
  product:  { label: "מדריך שימוש", badge: "bg-teal-50 text-teal-700 border-teal-200" },
};

const SOURCE_ICON = { document: "📄", precedent: "⚖️", issue: "📋", evidence: "🔍" };

const UPDATE_CONFIG = {
  new_work_item:     { label: "פעולה",      icon: "✅", badge: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  new_evidence:      { label: "ראיה חדשה", icon: "📄", badge: "text-blue-700 bg-blue-50 border-blue-200" },
  new_contradiction: { label: "סתירה",      icon: "⚡", badge: "text-red-700 bg-red-50 border-red-200" },
  new_question:      { label: "שאלה",       icon: "❓", badge: "text-emerald-700 bg-emerald-50 border-emerald-200" },
};

const GLOBAL_PROMPTS = [
  "מה החוזקות העיקריות שלנו?",
  "מה החולשות שצריך לטפל?",
  "אילו פסיקות רלוונטיות?",
  "מה יטען הצד שכנגד?",
  "מה הפעולות הדחופות ביותר?",
];

const ISSUE_PROMPTS = [
  "מה הראיות התומכות בסוגיה?",
  "מה מחליש את עמדתנו?",
  "אילו פסיקות רלוונטיות?",
  "מה יטען הצד שכנגד?",
  "נסח טיעון משפטי",
];

const COLLAPSED_H  = 52;   // px — bar only
const DEFAULT_THREAD_H = 200; // px
const MIN_THREAD_H = 120;
const MAX_THREAD_H = 540;

export default function CaseChatPanel({
  issueContext,
  chatHistory = [],
  onMessage,
  onAcceptUpdate,
  onRejectUpdate,
  onClose,
  isLoading,
}) {
  const [input, setInput]         = useState("");
  const [expanded, setExpanded]   = useState(false);
  const [threadH, setThreadH]     = useState(DEFAULT_THREAD_H);
  const [dismissedIds, setDismissedIds] = useState(new Set());

  const inputRef   = useRef(null);
  const endRef     = useRef(null);
  const lastAiRef  = useRef(null);
  const resizeRef  = useRef(null); // { startY, startH }
  const panelRef   = useRef(null);

  const hasMessages = chatHistory.length > 0;

  // Auto-expand only when a new message is being sent (loading starts), not on history reload
  useEffect(() => {
    if (isLoading) setExpanded(true);
  }, [isLoading]);

  // Auto-scroll to bottom after expand transition, or immediately on new messages
  useEffect(() => {
    if (!expanded) return;
    const timer = setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 240); // wait for height transition (220ms)
    return () => clearTimeout(timer);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    // When loading starts, scroll to bottom (shows typing indicator)
    if (isLoading) { endRef.current?.scrollIntoView({ behavior: "smooth" }); return; }
    // When AI response arrives, scroll to top of that message
    const lastMsg = chatHistory[chatHistory.length - 1];
    if (lastMsg?.role === "assistant" && lastAiRef.current) {
      lastAiRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [chatHistory, isLoading]);

  // Focus input when expanding
  useEffect(() => {
    if (expanded) setTimeout(() => inputRef.current?.focus(), 60);
  }, [expanded]);

  // Collapse on outside click
  useEffect(() => {
    if (!expanded) return;
    function onMouseDown(e) {
      if (resizeRef.current) return; // mid-drag
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [expanded]);

  // Resize drag (top edge)
  useEffect(() => {
    function onMove(e) {
      if (!resizeRef.current) return;
      const delta = resizeRef.current.startY - e.clientY; // drag up → bigger
      setThreadH(Math.max(MIN_THREAD_H, Math.min(MAX_THREAD_H, resizeRef.current.startH + delta)));
    }
    function onUp() { resizeRef.current = null; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  function startResize(e) {
    resizeRef.current = { startY: e.clientY, startH: threadH };
    e.preventDefault();
  }

  function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    setExpanded(true);
    onMessage(text);
  }

  const prompts = issueContext ? ISSUE_PROMPTS : GLOBAL_PROMPTS;

  return (
    <div
      ref={panelRef}
      dir="rtl"
      className="shrink-0 bg-slate-50 flex flex-col rounded-xl mx-3 mb-3"
      style={{ border: "1.5px solid #a5b4fc", boxShadow: "0 4px 24px rgba(99,102,241,0.18), 0 1px 6px rgba(99,102,241,0.10)", height: expanded ? threadH + COLLAPSED_H : COLLAPSED_H, transition: "height 0.22s ease" }}
    >
      {/* ── Resize handle (visible only when expanded) ── */}
      {expanded && (
        <div
          onMouseDown={startResize}
          className="h-2.5 shrink-0 flex items-center justify-center cursor-ns-resize hover:bg-slate-50 transition-colors"
        >
          <div className="w-10 h-[3px] rounded-full bg-slate-200" />
        </div>
      )}

      {/* ── Thread area ── */}
      {expanded && (
        <div
          className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-3"
        >
          {!hasMessages && !isLoading && (
            /* Suggested prompts when empty */
            <div className="flex flex-wrap gap-2 pt-1">
              {prompts.map((p) => (
                <button
                  key={p}
                  onClick={() => { setInput(p); inputRef.current?.focus(); }}
                  className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-3 py-1 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {chatHistory.map((msg, index) => {
            const isLastAi = msg.role === "assistant" && index === chatHistory.length - 1;
            return (
              <div key={msg.id} ref={isLastAi ? lastAiRef : null}>
                <ChatMessage
                  message={msg}
                  dismissedIds={dismissedIds}
                  onAcceptUpdate={onAcceptUpdate}
                  onRejectUpdate={(id) => {
                    setDismissedIds((p) => new Set([...p, id]));
                    onRejectUpdate(id);
                  }}
                  onQuickAction={(text) => { setInput(text); inputRef.current?.focus(); }}
                />
              </div>
            );
          })}

          {isLoading && <TypingIndicator />}
          <div ref={endRef} />
        </div>
      )}

      {/* ── Input bar ── */}
      <div
        className="shrink-0 h-[52px] flex items-center gap-2.5 px-5 cursor-pointer"
        onClick={() => !expanded && setExpanded(true)}
      >
        {/* Collapse / icon */}
        <span className="text-indigo-500 shrink-0 text-[16px] leading-none">
          {expanded ? "💬" : "💬"}
        </span>

        {/* Issue pill */}
        {issueContext && (
          <span className="shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 max-w-[140px] truncate">
            {issueContext.title}
          </span>
        )}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); if (!expanded) setExpanded(true); }}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
          placeholder={
            isLoading      ? "ממתין לתשובה…"
            : issueContext ? `שאל על "${issueContext.title}"…`
            : "שאל שאלה על התיק או על המערכת…"
          }
          disabled={isLoading}
          className="flex-1 bg-transparent text-[13.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:opacity-50 cursor-text"
        />

        {/* Loading dots */}
        {isLoading && (
          <span className="shrink-0 flex gap-1 items-center">
            {[0,1,2].map(i => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block"
                style={{ animation: `chat-dot 1.2s ease-in-out ${i * 0.18}s infinite` }} />
            ))}
          </span>
        )}

        {/* Send */}
        <button
          onClick={(e) => { e.stopPropagation(); handleSend(); }}
          disabled={!input.trim() || isLoading}
          className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer border-0 text-base"
        >
          ↵
        </button>

        {/* Collapse (when expanded) */}
        {expanded && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer bg-transparent border-0 text-base leading-none"
            title="כווץ"
          >
            ▾
          </button>
        )}

        {/* Close */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer bg-transparent border-0 text-xl leading-none"
          title="סגור"
        >
          ×
        </button>
      </div>

      <style>{`
        @keyframes chat-dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.75); }
          40%            { opacity: 1;   transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-end">
      <div className="flex gap-1.5 items-center px-4 py-3 bg-slate-100 rounded-2xl rounded-bl-sm">
        {[0,1,2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"
            style={{ animation: `chat-dot 1.2s ease-in-out ${i * 0.18}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

function ChatMessage({ message, dismissedIds, onAcceptUpdate, onRejectUpdate, onQuickAction }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-start">
        <div className="bg-slate-900 text-white text-[13px] px-4 py-2.5 rounded-2xl rounded-br-sm leading-relaxed"
          style={{ overflowWrap: "break-word", wordBreak: "break-word" }}>
          {message.content}
        </div>
      </div>
    );
  }

  if (message.errorText) {
    return (
      <div className="flex justify-end">
        <div className="bg-red-50 border border-red-200 text-red-700 text-[12px] px-4 py-2.5 rounded-2xl rounded-bl-sm leading-relaxed w-full"
          style={{ overflowWrap: "break-word", wordBreak: "break-word" }}>
          <span className="font-semibold">שגיאה: </span>{message.errorText}
        </div>
      </div>
    );
  }

  const { sections = [], sources = [], proposedUpdates = [], limitations = [], nextBestActions = [] } = message;
  const visible = proposedUpdates.filter(u => !dismissedIds.has(u.id));

  return (
    <div className="flex justify-end">
      <div className="flex flex-col gap-2 w-full">

        {sections.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm shadow-slate-100">
            <p className="text-[13px] text-slate-800 leading-[1.8] whitespace-pre-wrap"
              style={{ overflowWrap: "break-word", wordBreak: "break-word" }}>
              {sections.map(s => s.content).join("\n\n")}
            </p>
          </div>
        )}

        {(sources.length > 0 || limitations.length > 0) && (
          <div className="flex gap-1.5 self-start">
            {sources.length > 0 && (
              <div className="relative group">
                <span className="text-[10px] text-slate-400 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 cursor-default select-none transition-colors rounded-full px-2 py-0.5 inline-block">
                  מקורות
                </span>
                <div className="absolute bottom-full right-0 mb-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-3 hidden group-hover:block z-20 text-right" dir="rtl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">מקורות</p>
                  <div className="flex flex-col gap-1.5">
                    {sources.map((src, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="shrink-0 text-[11px]">{SOURCE_ICON[src.type] ?? "📌"}</span>
                        <span className="text-[11px] text-slate-700 leading-snug">
                          <span className="font-medium">{src.label}</span>
                          {src.excerpt && <span className="text-slate-400"> — {src.excerpt}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {limitations.length > 0 && (
              <div className="relative group">
                <span className="text-[10px] text-slate-400 hover:text-amber-600 bg-slate-100 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 cursor-default select-none transition-colors rounded-full px-2 py-0.5 inline-block">
                  הערות
                </span>
                <div className="absolute bottom-full right-0 mb-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-3 hidden group-hover:block z-20 text-right" dir="rtl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">הערות</p>
                  <div className="flex flex-col gap-1">
                    {limitations.map((lim, i) => (
                      <p key={i} className="text-[11px] text-slate-500 leading-snug">{lim}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {visible.map(update => {
          const cfg = UPDATE_CONFIG[update.type] ?? UPDATE_CONFIG.new_work_item;
          return (
            <div key={update.id} className={`rounded-xl border px-3 py-2.5 ${cfg.badge}`}>
              <div className="flex items-start gap-2">
                <span className="text-sm shrink-0 mt-0.5">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wide opacity-60 mb-0.5">{cfg.label} מוצעת</p>
                  <p className="text-[12px] leading-snug" style={{ overflowWrap: "break-word" }}>{update.description}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => { onAcceptUpdate(update); onRejectUpdate(update.id); }}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white border border-current hover:opacity-80 cursor-pointer">אשר</button>
                  <button onClick={() => onRejectUpdate(update.id)}
                    className="text-[11px] px-2 py-1 rounded-lg bg-white/60 border border-current opacity-50 hover:opacity-30 cursor-pointer">×</button>
                </div>
              </div>
            </div>
          );
        })}

        {nextBestActions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1 pt-0.5">
            {nextBestActions.map((action, i) => (
              <button
                key={i}
                onClick={() => onQuickAction?.(action)}
                className="text-[10.5px] text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1 hover:bg-indigo-100 hover:border-indigo-400 transition-colors cursor-pointer"
              >
                {action}
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
