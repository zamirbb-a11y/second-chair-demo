const NAV_ITEMS = [
  { id: "case-map",  icon: "⚖",  label: "מחלוקות" },
  { id: "timeline",  icon: "◷",  label: "ציר זמן"  },
  { id: "pleadings", icon: "◻",  label: "מסמכים"   },
  { id: "discovery", icon: "◈",  label: "עדים"     },
];

export default function AppNav({ activeView, onChangeView }) {
  return (
    <div className="w-[72px] bg-white border-l border-slate-200 flex flex-col items-center flex-shrink-0 h-full">
      {/* Logo */}
      <div className="w-full py-4 text-center border-b border-slate-100 select-none">
        <span className="text-slate-900 font-black text-[13px] leading-none tracking-tight">SC</span>
        <span className="block text-[8px] text-slate-400 mt-0.5 tracking-wide">Second Chair</span>
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
                ? "bg-blue-50 text-blue-700"
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-600",
            ].join(" ")}
          >
            <span className="text-[17px] leading-none">{icon}</span>
            <span className="text-[8.5px] font-semibold leading-none">{label}</span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="pb-3 px-2 w-full">
        <button
          title="הגדרות"
          className="w-full rounded-[9px] flex items-center justify-center py-2.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 text-[17px] transition-all border-0 cursor-pointer"
        >
          ⚙
        </button>
      </div>
    </div>
  );
}
