const NAV_ITEMS = [
  { id: "case-map", label: "ניתוח בסיסי" },
  { id: "pleadings", label: "כתבי טענות ובקשות" },
  { id: "discovery", label: "גילוי ושאלונים" },
  { id: "proofs", label: "תצהירים והוכחות" },
  { id: "summaries", label: "סיכומים / פשרה" },
];

const TOOL_ITEMS = [
  { id: "timeline", label: "ציר זמן", icon: "◷" },
];

export default function WorkspaceSidebar({ activeView, onChangeView }) {
  return (
    <aside
      className="
        sticky top-0 h-screen w-64
        bg-[#111827] text-white
        border-l border-blue-950/60
        p-5 flex flex-col
        shadow-xl
      "
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Second Chair</h2>
        <p className="text-[13px] font-semibold text-white/80 mt-2 leading-snug">
          מרכז הבקרה לליטיגציה
        </p>
        <p className="text-[12px] text-blue-100/50 mt-0.5">
          מחלוקות, ראיות ומהלכים
        </p>
      </div>

      <nav className="flex flex-col gap-1.5 mt-7">
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeView(item.id)}
              className={`
                text-right rounded-2xl px-4 py-3
                text-sm font-medium
                transition-all duration-150
                border
                ${
                  isActive
                    ? "bg-blue-950/70 text-white border-blue-700/60 shadow-sm"
                    : "text-blue-100/75 border-transparent hover:bg-white/5 hover:text-white hover:border-blue-900/60"
                }
              `}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-6 pt-5 border-t border-white/10">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2.5 px-1">
          כלי עבודה
        </div>

        <div className="flex flex-col gap-1.5">
          {TOOL_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeView(item.id)}
                className={`
                  text-right rounded-xl px-4 py-2.5
                  text-sm font-medium
                  transition-all duration-150
                  border flex items-center gap-2
                  ${
                    isActive
                      ? "bg-white/10 text-white border-white/15 shadow-sm"
                      : "text-blue-100/60 border-transparent hover:bg-white/5 hover:text-white/90 hover:border-white/10"
                  }
                `}
              >
                <span className="text-base leading-none opacity-60">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-white/10">
        <div className="text-[11px] font-semibold text-blue-100/30">
          Litigation Cockpit
        </div>
      </div>
    </aside>
  );
}