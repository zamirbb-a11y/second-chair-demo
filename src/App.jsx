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
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium">דמו ראשוני v0.3.0</span>
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
  const text = `${caseText || ""} ${documentText || ""}`.trim();
  const lower = text.toLowerCase();

  const hasRepresentation = includesAny(text, ["מצג", "הציג", "הובטח", "הבטיח", "נאמר", "בעל פה", "שכנע"]);
  const hasNonDisclosure = includesAny(text, ["לא גילה", "לא הועבר", "הוסתר", "הסתיר", "אי גילוי", "אי־גילוי", "לא נמסר", "מסמכים מרכזיים", "העלים"]);
  const hasReliance = includesAny(text, ["הסתמך", "עקב", "בגלל", "אלמלא", "לא היה מתקשר", "לא היה חותם", "חתם לאחר", "שוכנע"]);
  const hasCancellation = includesAny(text, ["ביטול", "לבטל", "הודעת ביטול", "מבקש לבטל", "השבה"]);
  const hasWaiver = includesAny(lower, ["מוותר", "ויתור", "בדק", "as is", "ללא כל טענה"]);
  const hasFiduciary = includesAny(text, ["עורך דין", "עו״ד", "עו\"ד", "שלוח", "מיופה כוח", "נאמן", "יחסי אמון", "ניגוד עניינים", "קרוב משפחה"]);
  const hasMoney = includesAny(text, ["₪", "שח", "ש\"ח", "דולר", "תמורה", "מחיר", "סכום"]);
  const hasAgreement = includesAny(text, ["הסכם", "חוזה", "חתם", "חתימה", "מכר"]);

  const parties = extractParties(text);
  const factSnapshot = buildFactSnapshot(text, {
    hasRepresentation,
    hasNonDisclosure,
    hasReliance,
    hasCancellation,
    hasWaiver,
    hasFiduciary,
    hasMoney,
    hasAgreement,
  });

  const legalQuestion = buildLegalQuestion({ hasRepresentation, hasNonDisclosure, hasFiduciary, hasWaiver, hasCancellation });
  const strengths = buildStrengths({ hasRepresentation, hasNonDisclosure, hasReliance, hasFiduciary, hasCancellation, hasMoney });
  const weaknesses = buildWeaknesses({ hasRepresentation, hasNonDisclosure, hasReliance, hasWaiver, hasCancellation });
  const signals = strengths.length;
  const confidence = signals >= 4 && weaknesses.length <= 2 ? "גבוהה" : signals >= 2 ? "בינונית" : "נמוכה";

  const mainIssue = `${legalQuestion} ${factSnapshot}`;

  const legalTheory = buildLegalTheory({
    hasRepresentation,
    hasNonDisclosure,
    hasReliance,
    hasFiduciary,
    hasCancellation,
    hasWaiver,
  });

  const counterArgument = buildCounterArgument({ hasWaiver, hasReliance, hasRepresentation, hasNonDisclosure });
  const missingList = buildMissingList({ hasRepresentation, hasReliance, hasCancellation, hasNonDisclosure });

  const elements = [
    {
      label: "טעות",
      status: hasRepresentation || hasNonDisclosure ? "possible" : "weak",
      text: hasRepresentation || hasNonDisclosure
        ? "הטענה צריכה להיות שהלקוח חתם כשהוא מחזיק תמונת מצב שגויה: שהעסקה נקייה מבעיה מהותית או שהמסמכים שנמסרו לו משקפים את מלוא התמונה."
        : "לא ברור עדיין מהי הטעות הקונקרטית. צריך להגדיר במשפט אחד: מה הלקוח חשב בזמן החתימה ומה התברר כשונה לאחר מכן.",
    },
    {
      label: "הטעיה / אי גילוי",
      status: hasNonDisclosure || hasRepresentation || hasFiduciary ? "possible" : "weak",
      text: hasNonDisclosure
        ? "הליבה העובדתית היא אי־מסירת מידע או מסמכים לפני החתימה. זה יכול לתמוך בהטעיה במחדל, אם יוכח שהמידע היה מהותי ושקמה חובת גילוי."
        : hasRepresentation
          ? "הטענה נשענת על מצגים טרום־חוזיים. צריך להפוך אותם לעובדות קונקרטיות: מי אמר, מה נאמר, ומתי."
          : "לא זוהה עדיין מצג מטעה או מידע מסוים שהוסתר.",
    },
    {
      label: "קשר סיבתי",
      status: hasReliance ? "possible" : "weak",
      text: hasReliance
        ? "יש אינדיקציה לכך שהלקוח קושר בין המצג לבין ההחלטה לחתום. צריך לחזק זאת בראיות מזמן אמת."
        : "זה כרגע הסיכון המרכזי: גם אם היה אי־גילוי, צריך להראות שהלקוח לא היה חותם או שהיה חותם בתנאים אחרים אילו ידע את האמת.",
    },
    {
      label: "ביטול והשבה",
      status: hasCancellation ? "possible" : "weak",
      text: hasCancellation
        ? "מאחר שמופיע רצון לבטל או לקבל השבה, צריך לבדוק את מועד הגילוי, מועד הודעת הביטול, ומה בדיוק התקבל מכוח ההסכם לצורך השבה."
        : "לא זוהתה הודעת ביטול. בלי ביטול ברור ובזמן סביר, הדיון בסעיף 21 נשאר מוקדם מדי.",
    },
  ];

  return {
    parties,
    mainIssue,
    legalTheory,
    counterArgument,
    missing: missingList.join("; ") + ".",
    confidence,
    extracted: buildExtracted(text, hasMoney, text.includes(".") || text.includes("/")),
    elements,
    questions: missingList,
    cases: [
      {
        name: "ע״א 2286/07 ג.מ.ח.ל.",
        use: hasWaiver || !hasReliance
          ? "פסיקה מסוכנת יחסית: אם יתברר שהלקוח היה אדיש, לא בדק, או לא הראה שהמידע היה תנאי אמיתי לחתימה — טענת ההטעיה עלולה להיחלש."
          : "רלוונטי כמבחן נגד: לא די בכך שהעסקה התבררה כבעייתית; צריך להוכיח טעות וקשר סיבתי בזמן הכריתה.",
      },
      {
        name: "ע״א 5328/21 אבו רקיה",
        use: hasFiduciary || hasNonDisclosure
          ? "פסיקה תומכת: כאשר יש הסתרת פרטים מהותיים, יחסי אמון או ניגוד עניינים, בית המשפט נכון יותר לראות באי־גילוי הטעיה במחדל."
          : "רלוונטי בעיקר אם יתבררו יחסי אמון, שליחות, עורך דין־לקוח או הסתרה מכוונת של פרטים מהותיים.",
      },
      {
        name: "ע״א 5858/19 פסגות",
        use: "שימושי לטענת נגד של נטילת סיכון וטעות בכדאיות: האם הלקוח ידע שיש אי־ודאות ובכל זאת בחר לחתום."
      },
    ],
    strengths,
    weaknesses,
  };
}

function buildLegalQuestion(flags) {
  if (flags.hasFiduciary && flags.hasNonDisclosure) {
    return "השאלה המשפטית המרכזית היא האם אי־גילוי מצד בעל חובת אמון או גורם בעל יתרון מידע עולה כדי הטעיה במחדל לפי סעיף 15.";
  }
  if (flags.hasRepresentation && flags.hasWaiver) {
    return "השאלה המשפטית המרכזית היא האם מצגים שניתנו לפני החתימה גוברים, בנסיבות העניין, על סעיפי בדיקה או ויתור שנכללו בהסכם.";
  }
  if (flags.hasNonDisclosure) {
    return "השאלה המשפטית המרכזית היא האם אי־מסירת המידע לפני החתימה נגעה לעובדה מהותית שהיה על הצד השני לגלות.";
  }
  return "השאלה המשפטית המרכזית היא האם קיימת בכלל טעות חוזית שנגרמה מהטעיה, להבדיל מאכזבה מאוחרת או טעות בכדאיות העסקה.";
}

function buildFactSnapshot(text, flags) {
  const parts = [];
  if (flags.hasAgreement) parts.push("החומר מתאר התקשרות חוזית או הסכם שנחתם");
  if (flags.hasRepresentation) parts.push("נטען למצגים או הבטחות לפני החתימה");
  if (flags.hasNonDisclosure) parts.push("נטען שמידע או מסמכים מהותיים לא הועברו בזמן אמת");
  if (flags.hasWaiver) parts.push("מנגד, קיימת אינדיקציה לסעיף בדיקה או ויתור בהסכם");
  if (flags.hasFiduciary) parts.push("קיימת אפשרות לחובת גילוי מוגברת בגלל יחסי אמון או שליחות");
  if (!parts.length) return "בשלב זה העובדות שהוזנו אינן מספיקות כדי לבנות תזה משפטית חדה.";
  return "על פי הקלט: " + parts.join("; ") + ".";
}

function buildLegalTheory(flags) {
  let text = "התזה האפשרית של הלקוח היא ביטול חוזה מחמת הטעיה לפי סעיף 15 לחוק החוזים.";
  if (flags.hasRepresentation) text += " מבחינה עובדתית, יש למקד את הטענה במצגים שניתנו לפני החתימה ולא נכנסו או נסתרו בנוסח ההסכם.";
  if (flags.hasNonDisclosure) text += " בנוסף, יש בסיס ראשוני למסלול של הטעיה במחדל: מידע מהותי לא נמסר לפני שהלקוח גיבש את הסכמתו.";
  if (flags.hasFiduciary) text += " אם יוכחו יחסי אמון, שליחות או ייעוץ, רף חובת הגילוי צפוי להיות גבוה יותר.";
  if (flags.hasWaiver) text += " נקודת הקושי היא שסעיפי בדיקה או ויתור עלולים לשמש נגד הלקוח, ולכן צריך להראות שההטעיה קדמה להסכמה ופגעה בגמירות הדעת.";
  if (flags.hasCancellation) text += " אם הביטול נמסר בזמן סביר לאחר הגילוי, ניתן לעבור לשאלת ההשבה לפי סעיף 21.";
  return text;
}

function buildCounterArgument(flags) {
  const parts = [];
  if (flags.hasWaiver) parts.push("הצד השני צפוי להישען על סעיפי בדיקה/ויתור ולטעון שהלקוח קיבל על עצמו את הסיכון");
  if (!flags.hasReliance) parts.push("החולשה המרכזית היא היעדר ראיה ברורה לכך שהמצג או אי־הגילוי הם שגרמו לחתימה");
  if (!flags.hasRepresentation && !flags.hasNonDisclosure) parts.push("הטקסט אינו מצביע עדיין על מצג קונקרטי או על עובדה מסוימת שהוסתרה");
  parts.push("טענת נגד צפויה נוספת היא שמדובר בטעות בכדאיות העסקה ולא בפגם בכריתה");
  return parts.join("; ") + ".";
}

function buildMissingList(flags) {
  const list = [];
  if (!flags.hasRepresentation) list.push("חסר פירוט מדויק של המצג הנטען: מי אמר, מה נאמר ומתי");
  if (!flags.hasReliance) list.push("חסרה ראיה לכך שהלקוח לא היה חותם אילו ידע את העובדות האמיתיות");
  if (!flags.hasCancellation) list.push("חסר מועד גילוי ההטעיה ומועד הודעת הביטול");
  if (!flags.hasNonDisclosure) list.push("חסר זיהוי של העובדה או המסמך הספציפיים שלא גולו");
  list.push("רצוי לצרף תכתובות, טיוטות, WhatsApp או עדים משלב המשא ומתן");
  return list;
}

function buildStrengths(flags) {
  const list = [];
  if (flags.hasRepresentation) list.push("קיימת טענה למצגים לפני החתימה");
  if (flags.hasNonDisclosure) list.push("קיימת טענה לאי־גילוי או הסתרת מידע");
  if (flags.hasReliance) list.push("קיימת אינדיקציה להסתמכות או לקשר סיבתי");
  if (flags.hasFiduciary) list.push("ייתכן שקיימת חובת גילוי מוגברת");
  if (flags.hasCancellation) list.push("קיים בסיס לבדוק ביטול והשבה");
  if (flags.hasMoney) list.push("רכיב התמורה/המחיר עשוי לסייע בהערכת מהותיות");
  return list;
}

function buildWeaknesses(flags) {
  const list = [];
  if (flags.hasWaiver) list.push("סעיף בדיקה או ויתור בהסכם עלול להחליש את הטענה");
  if (!flags.hasReliance) list.push("חסר קשר סיבתי מפורש בין ההטעיה לבין החתימה");
  if (!flags.hasCancellation) list.push("לא ברור אם נמסרה הודעת ביטול בזמן סביר");
  if (!flags.hasRepresentation && !flags.hasNonDisclosure) list.push("אין עדיין מצג או אי־גילוי קונקרטיים");
  return list;
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
