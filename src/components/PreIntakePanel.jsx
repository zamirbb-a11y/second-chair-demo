import { useState } from "react";

const ACTION_CONFIG = {
  answer:          { label: "ענה",       bg: "bg-blue-50",   text: "text-blue-600"   },
  upload_document: { label: "העלה מסמך", bg: "bg-emerald-50", text: "text-emerald-600" },
  ask_client:      { label: "שאל לקוח",  bg: "bg-amber-50",  text: "text-amber-700"  },
};

export default function PreIntakePanel({ questions, onContinue, onUploadFile, isLoading }) {
  const [texts, setTexts]       = useState(() => Object.fromEntries(questions.map((_, i) => [i, ""])));
  const [dismissed, setDismissed] = useState(new Set());

  const visible = questions.filter((_, i) => !dismissed.has(i));

  function dismiss(i) {
    setDismissed((prev) => new Set([...prev, i]));
  }

  function handleContinue() {
    const answers = questions.map((q, i) => ({
      question: q.question,
      text: texts[i] ?? "",
    }));
    onContinue(answers);
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto py-8 px-2">
      {/* Header */}
      <div>
        <h2 className="text-[18px] font-bold text-slate-800">לפני שנתחיל…</h2>
        <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">
          המערכת זיהתה מספר פריטים שיכולים לשפר משמעותית את הניתוח הראשוני.
          ענה על מה שניתן, דלג על השאר — אפשר גם להמשיך ישירות.
        </p>
      </div>

      {/* Questions */}
      {visible.length > 0 && (
        <div className="flex flex-col gap-4">
          {questions.map((q, i) => {
            if (dismissed.has(i)) return null;
            const cfg = ACTION_CONFIG[q.suggestedAction] ?? ACTION_CONFIG.answer;

            return (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3"
              >
                {/* Question + badge */}
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold text-slate-800 leading-snug">
                      {q.question}
                    </p>
                    {q.whyItMatters && (
                      <p className="text-[12px] text-slate-400 mt-1 leading-relaxed">
                        {q.whyItMatters}
                      </p>
                    )}
                  </div>
                  <span
                    className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}
                  >
                    {cfg.label}
                  </span>
                </div>

                {/* Answer textarea */}
                <textarea
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 text-[13px] text-slate-800 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-slate-300"
                  rows={3}
                  placeholder="הקלד תשובה…"
                  value={texts[i]}
                  onChange={(e) => setTexts((prev) => ({ ...prev, [i]: e.target.value }))}
                />

                {/* Actions row */}
                <div className="flex items-center gap-3">
                  {/* File upload — triggers existing handleWordUpload */}
                  <label className="text-[12px] text-indigo-600 hover:text-indigo-800 cursor-pointer border border-indigo-200 rounded-lg px-3 py-1 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                    + העלה מסמך
                    <input
                      type="file"
                      accept=".docx,.txt,.pdf"
                      className="hidden"
                      onChange={onUploadFile}
                    />
                  </label>

                  <button
                    className="text-[12px] text-slate-400 hover:text-slate-600 mr-auto transition-colors"
                    onClick={() => dismiss(i)}
                  >
                    דלג ›
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Continue button */}
      <button
        onClick={handleContinue}
        disabled={isLoading}
        className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-[14px] py-3.5 transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <span className="animate-spin inline-block text-base">⏳</span>
            מנתח…
          </>
        ) : (
          "המשך לניתוח ›"
        )}
      </button>
    </div>
  );
}
