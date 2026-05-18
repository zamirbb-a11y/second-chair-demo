export default function WorkspaceHeader({ activeView }) {
const titles = {
  "case-map": {
title: "מבט על",
    subtitle:
      "מפת המחלוקות, הטענות, הראיות והפעולות המרכזיות בתיק.",
  },

  pleadings: {
    title: "כתבי טענות ובקשות",
    subtitle:
      "בדיקת כתבי טענות, בקשות ביניים והשפעתם על מפת המחלוקות.",
  },

  discovery: {
    title: "גילוי ושאלונים",
    subtitle:
      "מסמכים חסרים, שאלונים, חיסיון ורלוונטיות לפי מחלוקות התיק.",
  },

  proofs: {
    title: "תצהירים והוכחות",
    subtitle:
      "עדים, תצהירים, סתירות, מסמכי עוגן וקווי חקירה.",
  },

  summaries: {
    title: "סיכומים / פשרה",
    subtitle:
      "מה הוכח, מה נותר חלש, נרטיב לסיכומים ומינוף לפשרה.",
  },
};

const current = titles[activeView] || titles["case-map"];

return (
  <header className="mb-8">
    <div className="flex items-center gap-3">
      <h1
        className="
          text-3xl font-bold
          tracking-tight
          text-slate-900
        "
      >
        {current.title}
      </h1>

      <span
        className="
          text-xs font-semibold
          bg-blue-100 text-blue-900
          border border-blue-200
          rounded-full
          px-3 py-1
        "
      >
        Workspace
      </span>
    </div>

    <p
      className="
        text-slate-600
        mt-2 text-sm leading-6
        max-w-3xl
      "
    >
      {current.subtitle}
    </p>

    <div
      className="
        mt-5 h-px
        bg-gradient-to-r
        from-blue-200
        via-slate-200
        to-transparent
      "
    />
  </header>
);
}