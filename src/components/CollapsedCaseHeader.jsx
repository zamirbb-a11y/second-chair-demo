export default function CollapsedCaseHeader({
  caseText,
  uploadedFiles,
  onEdit,
  onAddInfo,
  onReanalyze,
  loading,
}) {
  const shortCase =
    caseText?.trim()?.slice(0, 120) || "תיק ללא תיאור מקרה";

  return (
    <section className="bg-white border rounded-2xl shadow-sm p-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-slate-500 mb-1">
            תיק פעיל · {uploadedFiles.length} קבצים
          </div>

          <div className="font-semibold truncate">
            {shortCase}
            {caseText?.length > 120 ? "..." : ""}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onEdit}
            className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-slate-50"
          >
            ערוך קלט
          </button>

          <button
            onClick={onAddInfo}
            className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-slate-50"
          >
            הוסף מידע
          </button>

          <button
            onClick={onReanalyze}
            disabled={loading}
            className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? "מנתח..." : "נתח מחדש"}
          </button>
        </div>
      </div>
    </section>
  );
}
