import { getEvidenceOverlays, translateEvidenceType } from "../utils/applyOverlays";

export default function EvidenceView({ overlays = [], onRollback }) {
  const evidenceOverlays = getEvidenceOverlays(overlays);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-2xl font-bold mb-4">ראיות ומסמכים</h2>
        <p className="text-slate-600">כאן יוצגו מסמכים לפי המשמעות שלהם לתיק.</p>
      </div>

      {evidenceOverlays.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
          <div className="font-bold text-slate-900 mb-3">עדכוני ראיות שאושרו</div>

          <div className="space-y-2">
            {evidenceOverlays.map((overlay) => (
              <div
                key={overlay.id}
                className="rounded-xl border border-emerald-100 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                        {translateEvidenceType(overlay.patch.evidenceType)}
                      </span>

                      <div className="font-semibold text-sm">
                        {overlay.patch.title}
                      </div>
                    </div>

                    <div className="mt-1 text-sm text-slate-600 leading-6">
                      {overlay.patch.description}
                    </div>
                  </div>

                  {onRollback && (
                    <button
                      type="button"
                      onClick={() => onRollback(overlay.id)}
                      className="shrink-0 text-xs text-red-500 hover:text-red-700"
                    >
                      בטל
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
