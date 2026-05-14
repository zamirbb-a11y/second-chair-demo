export default function HorizontalTimeline({ items }) {
  if (!items || !items.length) {
    return (
      <p className="text-slate-500 text-sm">
        לא זוהה לוח זמנים מספק.
      </p>
    );
  }

  const timelineItems = items.slice(0, 8);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="min-w-[850px]">
        <div className="relative flex items-start justify-between gap-6 pt-2">
          <div className="absolute top-5 left-0 right-0 h-px bg-slate-300" />

          {timelineItems.map((item, index) => (
            <div
              key={index}
              className="relative z-10 w-40 text-center"
            >
              <div className="mx-auto mb-2 h-3.5 w-3.5 rounded-full border-2 border-slate-700 bg-white" />

              <div className="text-[11px] font-semibold text-slate-500">
                {item.date || "מועד לא ידוע"}
              </div>

              <div className="mt-1 text-sm font-semibold leading-5">
                {item.event || "אירוע"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
