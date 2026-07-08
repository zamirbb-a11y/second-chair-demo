// Upload form for a new pleading: file + required metadata (type, party).
// "נתח מסמך" activates only when all three are set.

import { useState } from "react";
import { DOC_TYPE_LABELS } from "./PleadingList.jsx";

export default function PleadingUpload({ onAnalyze, onCancel, error, initial }) {
  // On a failed analysis the view remounts this form — restore the user's
  // previous selections so "the file wasn't lost" is actually true.
  const [file, setFile] = useState(initial?.file ?? null);
  const [docType, setDocType] = useState(initial?.docType ?? "");
  const [party, setParty] = useState(initial?.party ?? "");
  const [dragOver, setDragOver] = useState(false);

  const ready = file && docType && party;

  return (
    <div className="px-8 py-7 max-w-[640px]" dir="rtl">
      <button
        type="button"
        onClick={onCancel}
        className="text-sm text-slate-500 hover:text-slate-700 bg-transparent border-0 cursor-pointer p-0 mb-4"
      >
        → כל כתבי הטענות
      </button>
      <h2 className="text-xl font-bold text-slate-900 mb-1">העלאת כתב טענות</h2>
      <p className="text-sm text-slate-500 mb-6">
        המסמך מפורק למפת טענות עם ביקורת לכל טענה. הניתוח אורך מספר דקות ואפשר להמשיך לעבוד בינתיים.
      </p>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); setFile(e.dataTransfer.files?.[0] ?? null); }}
        className={[
          "flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-6 py-8 cursor-pointer transition-colors mb-5",
          dragOver ? "border-blue-400 bg-blue-50"
            : file ? "border-emerald-200 bg-emerald-50"
            : "border-slate-300 bg-white hover:border-slate-400",
        ].join(" ")}
      >
        {file ? (
          <>
            <span className="text-sm font-semibold text-emerald-700">{file.name}</span>
            <span className="text-xs text-emerald-700">לחץ להחלפת הקובץ</span>
          </>
        ) : (
          <>
            <span className="text-sm font-medium text-slate-600">גרור קובץ לכאן, או לחץ לבחירה</span>
            <span className="text-xs text-slate-500">DOCX · PDF · TXT · עד 50MB</span>
          </>
        )}
        <input
          type="file"
          accept=".docx,.txt,.pdf"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <label htmlFor="pleading-doc-type" className="block text-xs font-semibold text-slate-600 mb-1.5">
            סוג המסמך
          </label>
          <select
            id="pleading-doc-type"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-blue-400"
          >
            <option value="" disabled>בחר סוג…</option>
            {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <span className="block text-xs font-semibold text-slate-600 mb-1.5">מטעם מי הוגש</span>
          <div className="flex gap-2">
            {[["claimant", "התובע"], ["defendant", "הנתבע"]].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setParty(value)}
                aria-pressed={party === value}
                className={[
                  "flex-1 rounded-lg border text-sm font-semibold py-2 cursor-pointer transition-colors",
                  party === value
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-300 bg-white text-slate-600 hover:border-blue-300",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={!ready}
        onClick={() => onAnalyze({ file, docType, party })}
        className="rounded-lg bg-slate-900 text-white px-6 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 border-0 cursor-pointer"
      >
        נתח מסמך
      </button>
    </div>
  );
}
