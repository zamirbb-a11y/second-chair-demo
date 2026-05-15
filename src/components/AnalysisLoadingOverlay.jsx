import { useEffect, useState } from "react";

const steps = [
  "מזהה שאלות משפטיות",
  "מנתח עובדות",
  "מנתח מסמכים",
  "מזהה חוסרים ראייתיים",
  "ממפה סיכונים",
  "בונה תיאוריות תיק",
  "מסכם ממצאים",
];

export default function AnalysisLoadingOverlay() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-3xl border bg-white shadow-2xl p-8 text-center">
        <h2 className="text-3xl font-bold text-slate-900">
          המערכת מנתחת את התיק שלך...
        </h2>

        <p className="mt-2 text-slate-500">
          זה עשוי לקחת מספר דקות. תודה על הסבלנות.
        </p>

        <div className="mt-8 flex justify-center">
          <div className="relative h-44 w-64">
            <div className="absolute inset-x-4 bottom-0 h-8 rounded-full bg-slate-200 blur-xl" />

            <div className="absolute left-1/2 top-8 h-32 w-52 -translate-x-1/2 rounded-b-2xl bg-slate-900 shadow-xl" />

            <div className="absolute left-1/2 top-4 h-36 w-56 -translate-x-1/2 rounded-2xl bg-slate-100 border shadow-lg overflow-hidden">
              <div className="absolute inset-y-0 right-1/2 w-px bg-slate-300" />

              <div className="absolute right-4 top-6 space-y-2">
                <div className="h-2 w-20 rounded bg-slate-300" />
                <div className="h-2 w-24 rounded bg-slate-300" />
                <div className="h-2 w-16 rounded bg-slate-300" />
                <div className="mt-4 text-3xl">⚖️</div>
              </div>

              <div className="absolute left-4 top-6 space-y-2">
                <div className="h-2 w-24 rounded bg-slate-300" />
                <div className="h-2 w-20 rounded bg-slate-300" />
                <div className="h-2 w-28 rounded bg-slate-300" />
                <div className="h-2 w-14 rounded bg-slate-300" />
              </div>

              <div className="page-flip absolute left-1/2 top-0 h-full w-28 origin-right rounded-l-2xl bg-white border-r shadow-md">
                <div className="mt-7 mr-5 space-y-2">
                  <div className="h-2 w-16 rounded bg-slate-200" />
                  <div className="h-2 w-20 rounded bg-slate-200" />
                  <div className="h-2 w-12 rounded bg-slate-200" />
                </div>
              </div>
            </div>

            <div className="absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-white/80 border px-4 py-2 shadow-sm">
              <span className="text-2xl">🔎</span>
            </div>
          </div>
        </div>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-100 px-5 py-2 text-blue-900 font-semibold">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
          {steps[stepIndex]}
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
            {steps.map((step, index) => (
              <div key={step} className="flex-1 text-center">
                <div
                  className={
                    index <= stepIndex
                      ? "mx-auto mb-2 h-3 w-3 rounded-full bg-blue-600 ring-4 ring-blue-100"
                      : "mx-auto mb-2 h-3 w-3 rounded-full bg-slate-300"
                  }
                />
                <div className={index === stepIndex ? "text-blue-700 font-semibold" : ""}>
                  {step}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 border p-4 text-sm text-slate-600">
          Second Chair מנתחת את העובדות, המסמכים והקשר המשפטי כדי לבנות הערכת תיק אסטרטגית.
        </div>

        <style>{`
          @keyframes pageFlip {
            0% { transform: rotateY(0deg); opacity: 0.95; }
            45% { transform: rotateY(-70deg); opacity: 0.75; }
            100% { transform: rotateY(0deg); opacity: 0.95; }
          }

          .page-flip {
            animation: pageFlip 1.8s ease-in-out infinite;
            transform-style: preserve-3d;
          }
        `}</style>
      </div>
    </div>
  );
}
