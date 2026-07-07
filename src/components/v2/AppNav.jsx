import { useState } from "react";

const NAV_ITEMS = [
  { id: "case-map",      icon: "⚖",  label: "מחלוקות"      },
  { id: "legal-briefs",  icon: "§",  label: "כתבי טענות"   },
  { id: "timeline",      icon: "◷",  label: "ציר זמן"       },
  { id: "pleadings",     icon: "◻",  label: "מסמכים"        },
  { id: "discovery",     icon: "◈",  label: "עדים"          },
];

export default function AppNav({
  activeView, onChangeView,
  session, onSwitchUser, onLogout,
  savedCases = [], currentCaseId, onNewCase, onOpenCase, onDeleteCase,
}) {
  const [menuOpen, setMenuOpen]       = useState(false);
  const [casesExpanded, setCasesExpanded] = useState(false);

  const userName = session?.user?.user_metadata?.full_name || session?.user?.email || null;

  function close() { setMenuOpen(false); setCasesExpanded(false); }

  return (
    <div className="w-[72px] bg-[#1e293b] border-l border-slate-700 flex flex-col items-center flex-shrink-0 h-full">
      {/* Logo */}
      <div className="w-full h-12 flex flex-col items-center justify-center border-b border-white/10 select-none">
        <span className="text-white font-black text-[13px] leading-none tracking-tight">SC</span>
        <span className="block text-[10px] text-white/60 mt-0.5 tracking-wide">Second Chair</span>
      </div>

      {/* Nav items */}
      <div className="flex flex-col items-center gap-1 py-3 flex-1 w-full px-2">
        {NAV_ITEMS.map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => onChangeView(id)}
            title={label}
            className={[
              "w-full rounded-[9px] flex flex-col items-center justify-center gap-[3px] py-2.5 transition-all border-0 cursor-pointer",
              activeView === id
                ? "bg-white/15 text-white"
                : "text-white/70 hover:bg-white/8 hover:text-white/90",
            ].join(" ")}
          >
            <span className="text-[17px] leading-none">{icon}</span>
            <span className="text-[11px] font-medium leading-tight">{label}</span>
          </button>
        ))}
      </div>

      {/* Footer — gear with combined menu */}
      <div className="pb-3 px-2 w-full relative">
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={close} />
            <div
              className="absolute bottom-full mb-2 right-0 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50"
              dir="rtl"
            >
              {/* ── Cases ── */}
              <button
                onClick={() => { close(); onNewCase?.(); }}
                className="w-full text-right px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                + תיק חדש
              </button>
              <div className="border-t border-slate-100" />
              <button
                onClick={() => setCasesExpanded(v => !v)}
                className="w-full text-right px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-between"
              >
                <span>החלף תיק</span>
                <span className="text-slate-400 text-[10px]">{casesExpanded ? "▲" : "▼"}</span>
              </button>
              {casesExpanded && (
                <div className="max-h-48 overflow-y-auto border-t border-slate-100">
                  {savedCases.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-500">אין תיקים שמורים</div>
                  ) : (
                    savedCases.map(item => (
                      <button
                        key={item.id}
                        onClick={() => { onOpenCase?.(item.id); close(); }}
                        className={[
                          "w-full text-right px-4 py-2 text-sm transition-colors",
                          item.id === currentCaseId
                            ? "font-semibold text-slate-900 bg-slate-50"
                            : "text-slate-600 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        {item.id === currentCaseId && <span className="ml-1.5 text-xs text-slate-500">◀ נוכחי</span>}
                        {item.name}
                      </button>
                    ))
                  )}
                </div>
              )}
              {currentCaseId && (
                <>
                  <div className="border-t border-slate-100" />
                  <button
                    onClick={() => { onDeleteCase?.(currentCaseId); close(); }}
                    className="w-full text-right px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    מחק תיק
                  </button>
                </>
              )}

              {/* ── User ── */}
              <div className="bg-slate-50 border-t-2 border-slate-200">
                {userName && (
                  <div className="px-3 pt-2.5 pb-1 text-xs text-slate-500 truncate font-medium">
                    {userName}
                  </div>
                )}
                {session ? (
                  <>
                    <button
                      onClick={() => { close(); onSwitchUser?.(); }}
                      className="w-full text-right px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      החלף משתמש
                    </button>
                    <div className="border-t border-slate-200" />
                    <button
                      onClick={() => { close(); onLogout?.(); }}
                      className="w-full text-right px-3 py-2.5 text-sm text-red-600 hover:bg-red-100 transition-colors"
                    >
                      התנתק
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </>
        )}
        <button
          onClick={() => setMenuOpen(v => !v)}
          title="תפריט"
          className="w-full rounded-[9px] flex items-center justify-center py-2.5 text-white/70 hover:bg-white/8 hover:text-white/90 text-[17px] transition-all border-0 cursor-pointer"
        >
          ⚙
        </button>
      </div>
    </div>
  );
}
