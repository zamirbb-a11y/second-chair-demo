import React, { useMemo, useState } from "react";

export default function SecondChairMisrepresentationDemo() {
  const [caseText, setCaseText] = useState(
    `הלקוח טוען כי חתם על הסכם מכר לאחר שהצד השני הציג בפניו מצג שלפיו אין בעיות מהותיות בעסקה. לאחר החתימה התברר כי קיימים פערים משמעותיים בין מה שנאמר בעל פה לבין נוסח ההסכם, ובנוסף מסמכים מרכזיים לא הועברו ללקוח בזמן אמת. הלקוח מבקש לבטל את ההסכם ולקבל השבה.`
  );

  const [documentText, setDocumentText] = useState(
    `הסכם מכר מיום 12.3.2024 בין ראובן כהן לבין שמעון לוי. התמורה לפי ההסכם: 900,000 ש"ח. התשלום יבוצע בשלושה תשלומים. בהסכם נכתב כי הקונה בדק את מצבו המשפטי והפיזי של הנכס ומוותר על כל טענה. אין בהסכם התייחסות למצגים בעל פה שניתנו לפני החתימה.`
  );

  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleWordUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setUploadStatus("קורא את קובץ ה־Word...");

    const isDocx = file.name.toLowerCase().endsWith(".docx");
    if (!isDocx) {
      setUploadStatus("כרגע הדמו תומך בקובצי .docx בלבד. שמור את הקובץ כ־.docx ונסה שוב.");
      return;
    }

    try {
      const mammoth = await import("mammoth");
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const extractedText = result.value && result.value.trim();

      if (!extractedText) {
        setUploadStatus("הקובץ נטען, אבל לא נמצא בו טקסט קריא.");
        return;
      }

      setDocumentText(extractedText);
      setUploadStatus("המסמך נטען והטקסט הועבר לשדה המסמך.");
    } catch (error) {
      console.error(error);
      setUploadStatus("לא הצלחתי לקרוא את קובץ ה־Word. נסה קובץ .docx פשוט יותר או הדבק את הטקסט ידנית.");
    }
  }

  const analysis = useMemo(() => analyzeInput(caseText, documentText), [caseText, documentText]);

  function handleAnalyzeClick() {
    setIsLoading(true);
    setTimeout(() => {
      setIsAnalyzed(true);
      setIsLoading(false);
      setTimeout(() => {
        const results = document.getElementById("analysis-results");
        if (results) results.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }, 700);
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">⚖️</span>
              <h1 className="text-3xl font-bold tracking-tight">Second Chair</h1>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium">דמו ראשוני v0.2.0</span>
            </div>
            <p className="text-slate-600 max-w-3xl">
              ניתוח ראשוני של פגם בכריתת חוזה: הטעיה לפי סעיף 15 לחוק החוזים, וביטול והשבה לפי סעיף 21.
            </p>
          </div>
          <button className="rounded-2xl px-5 py-3 bg-slate-900 text-white hover:bg-slate-800" onClick={handleAnalyzeClick}>
            {isLoading ? "מנתח תיק..." : "🧠 נתח תיק"}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel>
            <Title icon="📄">קלט עורך הדין</Title>

            <FieldLabel>תיאור מקרה</FieldLabel>
            <textarea
              value={caseText}
              onChange={(e) => setCaseText(e.target.value)}
              className="w-full min-h-44 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 outline-none focus:ring-2 focus:ring-slate-300"
            />

            <FieldLabel>מסמך / טקסט מתוך מסמך</FieldLabel>
            <textarea
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              className="w-full min-h-44 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 outline-none focus:ring-2 focus:ring-slate-300"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50 text-center cursor-pointer">
                ⬆️ העלאת Word (.docx)
                <input
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleWordUpload}
                  className="hidden"
                />
              </label>
              <input
                placeholder="שם תיק / לקוח"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            {(uploadedFileName || uploadStatus) && (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700 leading-6">
                {uploadedFileName && <div><strong>קובץ:</strong> {uploadedFileName}</div>}
                {uploadStatus && <div>{uploadStatus}</div>}
              </div>
            )}
          </Panel>

          <Panel>
            <Title icon="👨‍⚖️">שכבת ידע בדמו</Title>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-white border border-slate-200">
                <h3 className="font-semibold mb-2">חוק</h3>
                <p className="text-sm text-slate-600">סעיף 15 — הטעיה, לרבות אי־גילוי.</p>
                <p className="text-sm text-slate-600 mt-1">סעיף 21 — השבה לאחר ביטול.</p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200">
                <h3 className="font-semibold mb-2">פסיקה</h3>
                <p className="text-sm text-slate-600">ג.מ.ח.ל.; אבו רקיה; פסגות.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 text-white">
              <h3 className="font-semibold mb-2">מה הדמו עושה?</h3>
              <p className="text-sm text-slate-200 leading-6">
                הדמו קורא את הטקסט שהוזן ומייצר ניתוח משתנה: צדדים, סוגיה, יסודות העילה, טענות נגד וחוסרים.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <MiniCard icon="👥" label="צדדים" />
              <MiniCard icon="🔎" label="חוסרים" />
              <MiniCard icon="⚠️" label="טענות נגד" />
            </div>
          </Panel>
        </div>

        {isAnalyzed && (
          <div id="analysis-results">
            <Panel>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
                <div>
                  <h2 className="text-2xl font-bold">AI Litigation Assessment</h2>
                  <p className="text-slate-600 text-sm mt-1">ניתוח ראשוני דינמי לפי הטקסט שהוזן.</p>
                </div>
                <span className="rounded-xl bg-slate-900 text-white px-3 py-2 text-sm">רמת ביטחון: {analysis.confidence}</span>
              </div>

              <div className="grid grid-cols-4 gap-2 rounded-2xl bg-slate-100 p-1">
                <TabButton active={activeTab === "summary"} onClick={() => setActiveTab("summary")}>סיכום</TabButton>
                <TabButton active={activeTab === "elements"} onClick={() => setActiveTab("elements")}>יסודות העילה</TabButton>
                <TabButton active={activeTab === "cases"} onClick={() => setActiveTab("cases")}>פסיקה</TabButton>
                <TabButton active={activeTab === "questions"} onClick={() => setActiveTab("questions")}>חוסרים</TabButton>
              </div>

              {activeTab === "summary" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                  <InfoBlock title="זהות הצדדים" text={analysis.parties} />
                  <InfoBlock title="הסוגיה המרכזית" text={analysis.mainIssue} />
                  <InfoBlock title="טענה משפטית אפשרית" text={analysis.legalTheory} />
                  <InfoBlock title="טענת נגד צפויה" text={analysis.counterArgument} warning />
                  <InfoBlock title="חוסר מהותי" text={analysis.missing} warning />
                  <InfoBlock title="נתונים שחולצו" text={analysis.extracted} />
                </div>
              )}

              {activeTab === "elements" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                  {analysis.elements.map((item) => (
                    <div key={item.label} className="p-4 rounded-2xl bg-white border border-slate-200 flex gap-3">
                      <div className={item.status === "weak" ? "text-amber-600" : "text-emerald-600"}>{item.status === "weak" ? "⚠️" : "✅"}</div>
                      <div>
                        <h3 className="font-semibold">{item.label}</h3>
                        <p className="text-sm text-slate-600 mt-1 leading-6">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "cases" && (
                <div className="space-y-3 mt-5">
                  {analysis.cases.map((c) => (
                    <div key={c.name} className="p-4 rounded-2xl bg-white border border-slate-200">
                      <h3 className="font-semibold">{c.name}</h3>
                      <p className="text-sm text-slate-600 mt-1 leading-6">{c.use}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "questions" && (
                <div className="space-y-3 mt-5">
                  {analysis.questions.map((q, i) => (
                    <div key={q} className="p-4 rounded-2xl bg-white border border-slate-200 flex gap-3 items-start">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{i + 1}</span>
                      <p className="text-sm leading-6">{q}</p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

function analyzeInput(caseText, documentText) {
  const text = `${caseText || ""} ${documentText || ""}`;
  const lower = text.toLowerCase();

  const hasRepresentation = includesAny(text, ["מצג", "הציג", "הובטח", "הבטיח", "נאמר", "בעל פה", "שכנע"]);
  const hasNonDisclosure = includesAny(text, ["לא גילה", "לא הועבר", "הוסתר", "הסתיר", "אי גילוי", "אי־גילוי", "לא נמסר", "פערים", "מסמכים מרכזיים"]);
  const hasReliance = includesAny(text, ["הסתמך", "עקב", "בגלל", "אלמלא", "לא היה מתקשר", "לא היה חותם", "חתם לאחר", "שוכנע"]);
  const hasCancellation = includesAny(text, ["ביטול", "לבטל", "הודעת ביטול", "מבקש לבטל"]);
  const hasWaiver = includesAny(lower, ["מוותר", "ויתור", "בדק", "as is", "ללא כל טענה"]);
  const hasFiduciary = includesAny(text, ["עורך דין", "עו״ד", "עו\"ד", "שלוח", "מיופה כוח", "נאמן", "יחסי אמון", "ניגוד עניינים", "קרוב משפחה"]);
  const hasMoney = includesAny(text, ["₪", "שח", "ש\"ח", "דולר", "תמורה", "מחיר", "סכום"]);
  const hasDates = text.includes(".") || text.includes("/");

  const signals = [hasRepresentation, hasNonDisclosure, hasReliance, hasCancellation, hasFiduciary, hasMoney].filter(Boolean).length;
  const confidence = signals >= 5 ? "גבוהה" : signals >= 3 ? "בינונית" : "נמוכה";

  const parties = extractParties(text);
  const extracted = buildExtracted(text, hasMoney, hasDates);

  const detectedSignals = [
    hasRepresentation ? "מצג או הבטחה לפני החתימה" : null,
    hasNonDisclosure ? "אי־גילוי או הסתרת מידע" : null,
    hasReliance ? "אינדיקציה ראשונית להסתמכות" : null,
    hasFiduciary ? "יחסי אמון או חובת גילוי מוגברת" : null,
    hasMoney ? "רכיב תמורה או מחיר" : null,
    hasCancellation ? "רצון לבטל או הודעת ביטול" : null,
  ].filter(Boolean);

  const mainIssue = hasRepresentation || hasNonDisclosure
    ? "האם מצגים טרום־חוזיים או אי־גילוי של עובדות מהותיות גרמו ללקוח להתקשר בחוזה עקב טעות."
    : "האם קיימת תשתית עובדתית מספקת לטענת הטעיה לפי סעיף 15, או שמדובר במחלוקת חוזית רגילה או בטעות בכדאיות העסקה.";

  const legalTheory = `עילת הביטול האפשרית היא הטעיה לפי סעיף 15 לחוק החוזים. זוהו ${signals} אינדיקציות רלוונטיות: ${detectedSignals.length ? detectedSignals.join("; ") : "לא זוהו אינדיקציות חזקות"}. אם הביטול תקף, יש לבחון השבה לפי סעיף 21.`;

  const counterBits = [];
  if (hasWaiver) counterBits.push("קיים סעיף בדיקה או ויתור שעשוי לשמש את הצד השני");
  if (!hasReliance) counterBits.push("חסר קשר סיבתי ברור בין המצג לבין החתימה");
  if (!hasRepresentation && !hasNonDisclosure) counterBits.push("לא זוהה מצג קונקרטי או מידע מהותי שהוסתר");
  counterBits.push("הצד השני עשוי לטעון לטעות בכדאיות העסקה או לניסיון להשתחרר מהסכם בדיעבד");

  const missingList = [
    !hasRepresentation ? "תיאור מדויק של המצג הנטען: מי אמר, מתי ובאיזה הקשר" : null,
    !hasReliance ? "ראיה לכך שהלקוח לא היה חותם אילו ידע את העובדות האמיתיות" : null,
    !hasCancellation ? "הודעת ביטול ומועד גילוי עילת הביטול" : null,
    "תכתובות, טיוטות, הודעות WhatsApp או עדים משלב המשא ומתן",
  ].filter(Boolean);

  const elements = [
    {
      label: "טעות",
      status: hasRepresentation || hasNonDisclosure ? "possible" : "weak",
      text: hasRepresentation || hasNonDisclosure
        ? "יש בסיס ראשוני לטעון שהלקוח תפס את המציאות באופן שונה ממה שהתברר לאחר החתימה."
        : "לא זוהתה עדיין טעות קונקרטית. צריך להגדיר מה הלקוח חשב ומה הייתה המציאות בפועל.",
    },
    {
      label: "הטעיה / אי גילוי",
      status: hasNonDisclosure || hasFiduciary ? "possible" : "weak",
      text: hasNonDisclosure
        ? "קיימת אינדיקציה לאי־גילוי או הסתרת מסמכים או מידע."
        : hasFiduciary
          ? "זוהו יחסי אמון או שליחות שעשויים להקים חובת גילוי מוגברת, אך צריך לפרט מה לא גולה."
          : "לא זוהתה חובת גילוי קונקרטית או מצג מטעה ברור.",
    },
    {
      label: "קשר סיבתי כפול",
      status: hasReliance ? "possible" : "weak",
      text: hasReliance
        ? "יש אינדיקציה ראשונית לכך שהמצג או אי־הגילוי השפיעו על ההתקשרות."
        : "זה הרכיב החלש כרגע: צריך להראות שההטעיה גרמה לטעות, ושהטעות גרמה לחתימה.",
    },
    {
      label: "ביטול והשבה",
      status: hasCancellation ? "possible" : "weak",
      text: hasCancellation
        ? "קיימת אינדיקציה לביטול או רצון לבטל. צריך לבדוק אם הביטול נעשה בזמן סביר."
        : "לא זוהתה הודעת ביטול. ללא ביטול כדין, סעיף 21 עדיין לא מופעל.",
    },
  ];

  return {
    parties,
    mainIssue,
    legalTheory,
    counterArgument: `${counterBits.join("; ")}.`,
    missing: `${missingList.join("; ")}.`,
    confidence,
    extracted,
    elements,
    questions: missingList,
    cases: [
      {
        name: "ע״א 2286/07 ג.מ.ח.ל.",
        use: hasWaiver || !hasReliance
          ? "פסיקה מסוכנת יחסית: אדישות, היעדר בדיקה או העדר קשר סיבתי עלולים להפיל טענת הטעיה."
          : "רלוונטי כפסיקה שמחדדת את הצורך להוכיח טעות וקשר סיבתי, ולא רק אי־נוחות מהעסקה.",
      },
      {
        name: "ע״א 5328/21 אבו רקיה",
        use: hasFiduciary || hasNonDisclosure
          ? "פסיקה תומכת: הסתרת פרטים מהותיים, יחסי אמון או ניגוד עניינים יכולים לבסס הטעיה במחדל."
          : "רלוונטי בעיקר אם יתבררו יחסי אמון, שליחות, עורך דין־לקוח או הסתרת פרטים מהותיים.",
      },
      {
        name: "ע״א 5858/19 פסגות",
        use: "שימושי לבדיקת טענת נגד של נטילת סיכון, טעות בכדאיות העסקה, וסופיות הסכמות או פשרה.",
      },
    ],
  };
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function extractParties(text) {
  const marker = " בין ";
  const secondMarker = " לבין ";
  const start = text.indexOf(marker);
  const middle = text.indexOf(secondMarker);
  if (start >= 0 && middle > start) {
    const first = text.slice(start + marker.length, middle).slice(0, 60).trim();
    const second = text.slice(middle + secondMarker.length).split(".")[0].slice(0, 60).trim();
    if (first && second) return `${first} / ${second}`;
  }
  return "לא זוהו בוודאות. מומלץ לציין במפורש מי הלקוח ומי הצד שכנגד.";
}

function buildExtracted(text, hasMoney, hasDates) {
  const snippets = [];
  if (hasMoney) snippets.push("זוהה רכיב תמורה / מחיר / סכום בטקסט");
  if (hasDates) snippets.push("ייתכן שקיימים תאריכים בטקסט ויש לבדוק את מועד החתימה, הגילוי והביטול");
  if (!snippets.length) return "לא חולצו נתונים מספריים בולטים.";
  return snippets.join("; ");
}

function Panel({ children }) {
  return <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-5 space-y-4">{children}</div>;
}

function Title({ icon, children }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xl">{icon}</span>
      <h2 className="text-xl font-semibold">{children}</h2>
    </div>
  );
}

function FieldLabel({ children }) {
  return <label className="text-sm font-medium block mt-2">{children}</label>;
}

function MiniCard({ icon, label }) {
  return (
    <div className="p-3 rounded-2xl bg-white border border-slate-200 flex flex-col items-center gap-1">
      <span className="text-xl">{icon}</span>
      <p className="text-xs text-slate-600">{label}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={active ? "rounded-xl bg-white px-3 py-2 text-sm font-semibold shadow-sm" : "rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-white/70"}
    >
      {children}
    </button>
  );
}

function InfoBlock({ title, text, warning }) {
  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200">
      <div className="flex items-center gap-2 mb-2">
        <span>{warning ? "⚠️" : "✅"}</span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-slate-600 leading-6">{text}</p>
    </div>
  );
}
