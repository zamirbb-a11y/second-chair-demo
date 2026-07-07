// Non-modal status pill for incremental analysis updates.
// Replaces the full-screen AnalysisLoadingOverlay for mode="update":
// the lawyer keeps working with valid data while the update runs.
export default function UpdateStatusPill({ onCancel }) {
  return (
    <div
      role="status"
      aria-live="polite"
      dir="rtl"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-white border border-slate-200 rounded-full ps-4 pe-2 py-2 shadow-lg"
    >
      <svg
        aria-hidden="true"
        className="w-4 h-4 animate-spin text-slate-400"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="text-sm font-medium text-slate-700">
        מעדכן את ניתוח התיק…
      </span>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full px-3 py-1 border border-slate-200 bg-white cursor-pointer transition-colors"
        >
          בטל
        </button>
      )}
    </div>
  );
}
