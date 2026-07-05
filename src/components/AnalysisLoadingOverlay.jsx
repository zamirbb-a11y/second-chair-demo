import { useEffect, useState } from "react";

const STEPS = [
  "קורא את חומר התיק",
  "ממפה שאלות משפטיות",
  "מנתח עובדות וראיות",
  "מזהה חולשות וסיכונים",
  "בונה תיאוריות תיק",
  "מכין את מפת המחלוקות",
];

export default function AnalysisLoadingOverlay({ mode = "initial", caseName, clientName }) {
  const isUpdate = mode === "update";
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 50);
    const tick = setInterval(() => setStepIndex(i => (i + 1) % STEPS.length), 1800);
    return () => { clearTimeout(show); clearInterval(tick); };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      dir="rtl"
    >
      {/* Subtle grid texture */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)",
        backgroundSize: "40px 40px"
      }} />

      <div className="relative flex flex-col items-center gap-10 px-8 text-center max-w-sm w-full">
        {/* Brand */}
        <p className="text-xs text-slate-500 uppercase tracking-[0.22em]">Second Chair</p>

        {/* Case name */}
        <div className="flex flex-col gap-2">
          {caseName && (
            <h1 className="text-xl font-bold text-white leading-snug">
              {caseName}
            </h1>
          )}
          {clientName && (
            <p className="text-xs text-slate-500">לקוח: {clientName}</p>
          )}
          <p className="text-sm text-slate-500 mt-1">
            {isUpdate ? "מעדכן ניתוח…" : "מנתח את התיק…"}
          </p>
        </div>

        {/* Animated dots */}
        <div className="flex gap-2.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-indigo-500"
              style={{ animation: `pulse-dot 1.4s ease-in-out ${i * 0.22}s infinite` }}
            />
          ))}
        </div>

        {/* Current step */}
        <div className="flex flex-col gap-3 w-full">
          <p className="text-sm text-slate-200 font-medium min-h-[1.5em]">
            {STEPS[stepIndex]}
          </p>

          {/* Indeterminate activity bar — honest: no fake completion percentage */}
          <div className="w-full h-0.5 bg-slate-800 rounded-full overflow-hidden" dir="ltr">
            <div
              className="h-full w-1/3 bg-indigo-500 rounded-full"
              style={{ animation: "sweep 1.6s ease-in-out infinite" }}
            />
          </div>
        </div>

        <p className="text-xs text-slate-500">
          {isUpdate ? "זה עשוי לקחת עד דקה" : "ניתוח ראשוני עשוי לארוך מספר דקות"}
        </p>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1.1); }
        }
        @keyframes sweep {
          0%   { transform: translateX(-300%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
