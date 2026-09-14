// Non-modal status pill for a pleading analysis run in progress.
// Mirrors UpdateStatusPill's pattern (fixed, non-blocking, cancel button)
// but for the pleadings pipeline — visible from any screen, since the
// underlying PleadingAnalysisView instance now stays mounted across view
// switches instead of being torn down.
export default function PleadingRunPill({ label, onCancel, onOpen }) {
  return (
    <div
      role="status"
      aria-live="polite"
      dir="rtl"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-white border border-slate-200 rounded-full ps-4 pe-2 py-2 shadow-lg"
    >
      <svg
        aria-hidden="true"
        className="w-4 h-4 animate-spin text-slate-400 flex-shrink-0"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <button
        type="button"
        onClick={onOpen}
        className="text-sm font-medium text-slate-700 hover:text-slate-900 bg-transparent border-0 cursor-pointer p-0 max-w-[260px] truncate text-right"
        title="עבור לניתוח כתב הטענות"
      >
        מנתח כתב טענות: {label}
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full px-3 py-1 border border-slate-200 bg-white cursor-pointer transition-colors flex-shrink-0"
        >
          בטל
        </button>
      )}
    </div>
  );
}
