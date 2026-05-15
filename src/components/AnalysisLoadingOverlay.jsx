import { useEffect, useState } from "react";

const steps = [
  "מזהה שאלות משפטיות",
  "מנתח עובדות",
  "מנתח מסמכים",
  "מזהה חוסרים",
  "ממפה סיכונים",
  "בונה תיאוריות תיק",
];

export default function AnalysisLoadingOverlay() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 1600);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border bg-white/95 shadow-xl p-5">
        <div className="flex items-start gap-4">
          <BookLoader />

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-900">
              מנתח את התיק
            </h2>

            <p className="mt-1 text-sm text-slate-500 leading-6">
              Second Chair בוחנת את העובדות, המסמכים והסיכונים הליטיגטוריים.
            </p>

            <div className="mt-4 rounded-xl bg-slate-50 border px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="h-2 w-2 rounded-full bg-slate-900 animate-pulse" />
                {steps[stepIndex]}
              </div>

              <div className="mt-3 grid grid-cols-6 gap-1">
                {steps.map((step, index) => (
                  <div
                    key={step}
                    className={
                      index <= stepIndex
                        ? "h-1.5 rounded-full bg-slate-900"
                        : "h-1.5 rounded-full bg-slate-200"
                    }
                  />
                ))}
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              זה עשוי לקחת עד דקה, במיוחד כאשר יש כמה מסמכים.
            </p>
          </div>
        </div>

        <style>{`
          @keyframes subtleFlip {
            0% { transform: rotateY(0deg); opacity: 0.9; }
            45% { transform: rotateY(-55deg); opacity: 0.65; }
            100% { transform: rotateY(0deg); opacity: 0.9; }
          }

          .subtle-page-flip {
            animation: subtleFlip 1.6s ease-in-out infinite;
            transform-style: preserve-3d;
          }
        `}</style>
      </div>
    </div>
  );
}

function BookLoader() {
  return (
    <div className="relative mt-1 h-20 w-24 shrink-0">
      <div className="absolute inset-x-3 bottom-1 h-3 rounded-full bg-slate-200 blur-md" />

      <div className="absolute left-1/2 top-3 h-14 w-20 -translate-x-1/2 rounded-xl bg-slate-100 border shadow-sm overflow-hidden">
        <div className="absolute inset-y-0 right-1/2 w-px bg-slate-300" />

        <div className="absolute right-2.5 top-3 space-y-1.5">
          <div className="h-1.5 w-7 rounded bg-slate-300" />
          <div className="h-1.5 w-9 rounded bg-slate-300" />
          <div className="h-1.5 w-6 rounded bg-slate-300" />
        </div>

        <div className="absolute left-2.5 top-3 space-y-1.5">
          <div className="h-1.5 w-9 rounded bg-slate-300" />
          <div className="h-1.5 w-7 rounded bg-slate-300" />
          <div className="h-1.5 w-8 rounded bg-slate-300" />
        </div>

        <div className="subtle-page-flip absolute left-1/2 top-0 h-full w-10 origin-right rounded-l-xl bg-white border-r shadow-sm">
          <div className="mt-4 mr-2 space-y-1.5">
            <div className="h-1.5 w-5 rounded bg-slate-200" />
            <div className="h-1.5 w-7 rounded bg-slate-200" />
            <div className="h-1.5 w-4 rounded bg-slate-200" />
          </div>
        </div>
      </div>

      <div className="absolute left-1/2 top-7 -translate-x-1/2 rounded-full bg-white border px-2 py-1 shadow-sm text-sm">
        ⚖️
      </div>
    </div>
  );
}
