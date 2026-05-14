const tabs = [
  { id: "overview", label: "מבט על" },
  { id: "theory", label: "תיאוריות התיק" },
  { id: "evidence", label: "ראיות ופערים" },
  { id: "actions", label: "מרכז פעולות" },
];

export default function Tabs({ activeTab, setActiveTab }) {
  return (
    <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur py-2">
      <div className="bg-white border rounded-2xl shadow-sm p-1.5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={
                activeTab === tab.id
                  ? "rounded-xl bg-slate-900 text-white px-3 py-2.5 text-sm font-semibold"
                  : "rounded-xl bg-slate-50 hover:bg-slate-100 px-3 py-2.5 text-sm text-slate-700"
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
