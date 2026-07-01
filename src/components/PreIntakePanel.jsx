import { useState } from "react";

const ACTION_CONFIG = {
  answer:          { label: "ענה",       bg: "bg-blue-50",   text: "text-blue-600"   },
  upload_document: { label: "העלה מסמך", bg: "bg-emerald-50", text: "text-emerald-600" },
  ask_client:      { label: "שאל לקוח",  bg: "bg-amber-50",  text: "text-amber-700"  },
};

export default function PreIntakePanel({
  questions = [],
  detectedParties = [],
  clientName: initialClientName = "",
  clientRole: initialClientRole = "claimant",
  onContinue,
  onUploadFile,
  isLoading,
}) {
  const [texts, setTexts]             = useState(() => Object.fromEntries(questions.map((_, i) => [i, ""])));
  const [dismissed, setDismissed]     = useState(new Set());
  const [selectedIdx, setSelectedIdx] = useState(
    detectedParties.length > 0 && initialClientName
      ? detectedParties.findIndex((p) => p === initialClientName)
      : detectedParties.length > 0 ? 0 : null
  );
  const [customName, setCustomName]   = useState(initialClientName || "");
  const [role, setRole]               = useState(initialClientRole);

  const resolvedClientName =
    selectedIdx !== null && detectedParties[selectedIdx]
      ? detectedParties[selectedIdx]
      : customName;

  function dismiss(i) {
    setDismissed((prev) => new Set([...prev, i]));
  }

  function handleContinue() {
    const answers = questions.map((q, i) => ({ question: q.question, text: texts[i] ?? "" }));
    onContinue({ answers, clientName: resolvedClientName, clientRole: role });
  }

  const hasParties = detectedParties.length >= 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 flex flex-col overflow-hidden"
        style={{ maxHeight: "88vh" }}
        dir="rtl"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-[16px] font-bold text-slate-800">לפני שנתחיל…</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">
            זהה את הלקוח שלנו, ענה על מה שניתן — ניתן להמשיך ישירות.
          </p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-5">

          {/* ─── Party selection ─── */}
          <div className="flex flex-col gap-3">
            <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">מי הלקוח שלנו?</p>

            {hasParties ? (
              <div className="flex gap-2">
                {detectedParties.map((party, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedIdx(i); setCustomName(""); }}
                    className={`flex-1 rounded-xl border text-[13px] font-semibold py-2.5 px-3 transition-all ${
                      selectedIdx === i
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-slate-50"
                    }`}
                  >
                    {party}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={customName}
                onChange={(e) => { setCustomName(e.target.value); setSelectedIdx(null); }}
                placeholder="שם הלקוח / הצד שאנו מייצגים"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 text-[13px] text-slate-800 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-slate-300"
              />
            )}

            {/* Role toggle */}
            <div className="flex gap-2">
              {[
                { value: "claimant",  label: "תובע / מבקש" },
                { value: "defendant", label: "נתבע / משיב" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setRole(value)}
                  className={`flex-1 rounded-xl border text-[12px] font-medium py-2 transition-all ${
                    role === value
                      ? "border-slate-500 bg-slate-800 text-white"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          {questions.length > 0 && (
            <hr className="border-slate-100" />
          )}

          {/* ─── Questions ─── */}
          {questions.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">פרטים נוספים</p>
              {questions.map((q, i) => {
                if (dismissed.has(i)) return null;
                const cfg = ACTION_CONFIG[q.suggestedAction] ?? ACTION_CONFIG.answer;

                return (
                  <div
                    key={i}
                    className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col gap-2.5"
                  >
                    <div className="flex items-start gap-2">
                      <p className="flex-1 text-[13px] font-semibold text-slate-800 leading-snug">
                        {q.question}
                      </p>
                      <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                    </div>

                    <textarea
                      className="w-full rounded-xl border border-slate-200 bg-white text-[13px] text-slate-800 p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-slate-300"
                      rows={2}
                      placeholder="הקלד תשובה…"
                      value={texts[i]}
                      onChange={(e) => setTexts((prev) => ({ ...prev, [i]: e.target.value }))}
                    />

                    <div className="flex items-center gap-3">
                      <label className="text-[11px] text-indigo-600 hover:text-indigo-800 cursor-pointer border border-indigo-200 rounded-lg px-2.5 py-1 bg-white hover:bg-indigo-50 transition-colors">
                        + העלה מסמך
                        <input type="file" accept=".docx,.txt,.pdf" className="hidden" onChange={onUploadFile} />
                      </label>
                      <button
                        className="text-[11px] text-slate-400 hover:text-slate-600 mr-auto transition-colors"
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
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 border-t border-slate-100">
          <button
            onClick={handleContinue}
            disabled={isLoading}
            className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-[14px] py-3 transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <><span className="animate-spin inline-block">⏳</span> מנתח…</>
            ) : (
              "המשך לניתוח ›"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
