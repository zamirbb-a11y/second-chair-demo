export default function WorkspaceSidebar({
  activeView,
  onChangeView,
}) {
  const items = [
    { id: "case-map", label: "מבט על" },
    { id: "pleadings", label: "כתבי טענות ובקשות" },
    { id: "discovery", label: "גילוי ושאלונים" },
    { id: "proofs", label: "תצהירים והוכחות" },
    { id: "summaries", label: "סיכומים / פשרה" },
  ];

  return (
    <aside
      className="
        sticky top-0 h-screen w-64
        bg-[#111827] text-white
        border-l border-blue-950/60
        p-5 flex flex-col gap-4
        shadow-xl
      "
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Second Chair
        </h2>

        <p className="text-blue-100/70 text-sm mt-2 leading-6">
          מוח תיק מתמשך — מחלוקות, ראיות ועדים.
        </p>
      </div>

      <nav className="flex flex-col gap-2 mt-6">
        {items.map((item) => {
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

      <div className="mt-auto pt-6 border-t border-white/10">
        <div className="text-[11px] font-semibold text-blue-100/50">
          Litigation Cockpit
        </div>
      </div>
    </aside>
  );
}