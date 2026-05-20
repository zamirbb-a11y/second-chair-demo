export default function CollapsedCaseHeader({
  caseName,
  caseText,
  uploadedFiles,
  onAddInfo,
  onReanalyze,
  loading,
}) {
  const fileCount = uploadedFiles?.length || 0;

  const shortCaseTitle = caseName || "צד א׳ נ׳ צד ב׳";

  return (
    <section className="mb-6 border-b border-slate-300/70 bg-slate-100/60 px-2 py-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="hidden md:flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-200 text-2xl">
            📁
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {shortCaseTitle}
              {caseText?.length > 90 ? "..." : ""}
            </h2>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                תיק פעיל
              </span>

              <span>•</span>

              <span>{fileCount} קבצים</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onReanalyze}
            disabled={loading}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "מעדכן..." : "עדכן ניתוח"}
          </button>

          <button
            type="button"
            onClick={onAddInfo}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            הוסף מידע / מסמך
          </button>
        </div>
      </div>
    </section>
  );
}