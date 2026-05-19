export default function SuccessAssessment({ assessment }) {
  if (!assessment) return null;

  return (
    <details
      className="
        group
        rounded-2xl
        border border-slate-300
        bg-slate-50/70
        px-5 py-4
        mb-6
        transition
        hover:border-slate-400
      "
      dir="rtl"
    >
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900">
                הערכת סיכויי התביעה
              </h2>

              <div
                className="
                  inline-flex items-center gap-2
                  rounded-full
                  border border-slate-300
                  bg-white
                  px-3 py-1
                  text-sm font-bold text-slate-800
                "
              >
                {assessment.level}

                <span
                  className="
                    text-slate-400
                    transition
                    group-open:rotate-180
                  "
                >
                  ⌄
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-500">
              על בסיס החומר שהועלה למערכת בשלב זה
            </p>

            {assessment.disputeFocus && (
              <div>
                <div className="text-sm font-semibold text-slate-700">
                  מוקד המחלוקת
                </div>

                <p className="mt-1 text-[15px] leading-7 text-slate-800">
                  {assessment.disputeFocus}
                </p>
              </div>
            )}

            {assessment.summary && (
              <p className="text-[15px] leading-7 text-slate-700">
                {assessment.summary}
              </p>
            )}
          </div>
        </div>
      </summary>

      <div className="mt-4 border-t border-slate-200 pt-4 space-y-4">
        {assessment.reservation && (
          <p className="text-sm leading-7 text-slate-600">
            {assessment.reservation}
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            const element = document.getElementById("evidence-gaps");

            if (element) {
              element.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }
          }}
          className="
            text-sm font-medium text-slate-600
            hover:text-slate-900
            transition
          "
        >
          השלמת מידע נוסף עשויה לשנות את ההערכה →
        </button>
      </div>
    </details>
  );
}