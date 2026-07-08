// Flat, newest-first list of analyzed pleadings for the current case.
// Entry point of the כתבי טענות view; upload CTA pinned at the top.

import { useState } from "react";

export const DOC_TYPE_LABELS = {
  statement_of_claim:   "כתב תביעה",
  statement_of_defense: "כתב הגנה",
  reply:                "כתב תשובה",
  motion:               "בקשה",
  response:             "תגובה",
  other:                "כתב טענות",
};

export const PARTY_LABELS = {
  claimant:    "מטעם התובע",
  defendant:   "מטעם הנתבע",
  third_party: "צד שלישי",
  unknown:     "",
};

export function claimGapCount(analysis) {
  return (analysis?.claims ?? []).filter(
    (c) => c.qa && (c.qa.evidence_gap || c.qa.authority_gap || c.qa.logical_gap_flag)
  ).length;
}

export default function PleadingList({ records, onOpen, onUploadNew, onRemove }) {
  return (
    <div className="px-8 py-7 max-w-[820px]" dir="rtl">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold text-slate-900">כתבי טענות</h2>
        <button
          type="button"
          onClick={onUploadNew}
          className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800 border-0 cursor-pointer"
        >
          + העלה כתב טענות
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        פירוק כתב טענות למפת טענות עם ביקורת לכל טענה: מה תומך, מה מחליש, מה חסר.
      </p>

      {records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <p className="text-sm font-semibold text-slate-700 mb-1">אין עדיין ניתוחים בתיק זה</p>
          <p className="text-sm text-slate-500 mb-4">
            העלה כתב תביעה, כתב הגנה או כל כתב טענות אחר — הניתוח אורך מספר דקות.
          </p>
          <button
            type="button"
            onClick={onUploadNew}
            className="rounded-lg bg-slate-900 text-white px-5 py-2 text-sm font-semibold hover:bg-slate-800 border-0 cursor-pointer"
          >
            העלה כתב טענות
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {records.map((r) => {
            const gaps = claimGapCount(r.analysis);
            const mains = (r.analysis?.claims ?? []).filter((c) => c.level === 1).length;
            return (
              <div
                key={r.id}
                className="group flex items-center gap-4 px-5 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onOpen(r.id)}
                  className="flex-1 min-w-0 flex items-center gap-4 text-right cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {DOC_TYPE_LABELS[r.docType] ?? r.docType}
                      </span>
                      {PARTY_LABELS[r.party] && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          {PARTY_LABELS[r.party]}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        {new Date(r.createdAt).toLocaleDateString("he-IL")}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                      {r.title}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-xs text-slate-500">
                    <span>{mains} טענות</span>
                    {gaps > 0 && (
                      <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                        <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        {gaps} פערים
                      </span>
                    )}
                  </div>
                </button>
                <RemoveButton onConfirm={() => onRemove(r.id)} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RemoveButton({ onConfirm }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <span className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-slate-500">למחוק?</span>
        <button
          type="button"
          onClick={() => { onConfirm(); setConfirming(false); }}
          className="px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-md border-0 cursor-pointer hover:bg-red-600"
        >
          מחק
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="px-2.5 py-1 bg-white text-slate-500 text-xs border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50"
        >
          ביטול
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label="מחק ניתוח"
      className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity text-slate-500 hover:text-red-500 text-sm leading-none flex-shrink-0 bg-transparent border-0 cursor-pointer"
    >
      ×
    </button>
  );
}
