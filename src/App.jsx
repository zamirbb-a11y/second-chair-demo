import React, { useState } from "react";

export default function App() {
  const [caseText, setCaseText] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [activeTab, setActiveTab] = useState("executive");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleWordUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatus("קורא את קובץ ה־Word...");

    if (!file.name.toLowerCase().endsWith(".docx")) {
      setStatus("כרגע הדמו תומך רק בקובצי .docx");
      return;
    }

    try {
      const mammoth = await import("mammoth");
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      setDocumentText(result.value || "");
      setStatus("המסמך נטען בהצלחה.");
    } catch (err) {
      console.error(err);
      setStatus("לא הצלחתי לקרוא את המסמך. אפשר להדביק את הטקסט ידנית.");
    }
  }

  async function runAnalysis() {
    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseText, documentText }),
      });

      if (!response.ok) throw new Error("השרת החזיר שגיאה");

      const data = await response.json();
      setAnalysis(data);
      setActiveTab("executive");

      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      console.error(err);
      setError("הניתוח נכשל. בדוק את ה־API או את ה־Vercel Logs.");
    } finally {
      setLoading(false);
    }
  }

  const ev = analysis?.executiveView;
  const ct = analysis?.caseTheory;
  const eg = analysis?.evidenceAndGaps;
  const ac = analysis?.actionCenter;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚖️</span>
              <h1 className="text-3xl font-bold">Second Chair</h1>
              <span className="text-xs bg-slate-200 rounded-full px-3 py-1">
                Litigation Cockpit v0.5.0
              </span>
            </div>
            <p className="text-slate-600 mt-2">
              דמו ממוקד: הטעיה לפי סעיף 15 והשבה לפי סעיף 21 לחוק החוזים.
            </p>
          </div>

          <button
            onClick={runAnalysis}
            disabled={loading}
            className="bg-slate-900 text-white rounded-2xl px-6 py-3 disabled:opacity-60"
          >
            {loading ? "מנתח תיק..." : "נתח תיק"}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="תיאור מקרה">
            <textarea
              value={caseText}
              onChange={(e) => setCaseText(e.target.value)}
              placeholder="הדבק כאן את תיאור המקרה..."
              className="w-full min-h-64 rounded-2xl border p-4 leading-7"
            />
          </Card>

          <Card title="מסמך / טקסט מתוך מסמך">
            <textarea
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              placeholder="הדבק כאן טקסט מהסכם, מכתב, התכתבות או מסמך אחר..."
              className="w-full min-h-64 rounded-2xl border p-4 leading-7"
            />

            <label className="block mt-4 border rounded-2xl px-4 py-3 text-center cursor-pointer bg-white hover:bg-slate-50">
              העלאת Word (.docx)
              <input
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleWordUpload}
                className="hidden"
              />
            </label>

            {(fileName || status) && (
              <div className="mt-3 text-sm bg-slate-100 rounded-2xl p-3">
                {fileName && <div><strong>קובץ:</strong> {fileName}</div>}
                {status && <div>{status}</div>}
              </div>
            )}
          </Card>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
            {error}
          </div>
        )}

        {analysis && (
          <div id="results" className="space-y-6">
            <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <Metric title="מקור" value={analysis.source || "OpenAI"} />
              <Metric title="רמת ביטחון" value={analysis.confidence || "Medium"} />
              <Metric title="סיכון" value={ev?.caseSnapshot?.riskLevel || "לא זוהה"} />
              <Metric title="מוקד" value={ev?.caseSnapshot?.issueFocus || "לא זוהה"} />
            </section>

            <div className="bg-white border rounded-2xl shadow-sm p-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Tab active={activeTab === "executive"} onClick={() => setActiveTab("executive")}>
                  Executive View
                </Tab>
                <Tab active={activeTab === "theory"} onClick={() => setActiveTab("theory")}>
                  Case Theory
                </Tab>
                <Tab active={activeTab === "evidence"} onClick={() => setActiveTab("evidence")}>
                  Evidence & Gaps
                </Tab>
                <Tab active={activeTab === "actions"} onClick={() => setActiveTab("actions")}>
                  Action Center
                </Tab>
              </div>
            </div>

            {activeTab === "executive" && (
              <div className="space-y-6">
                <Card title="Case Snapshot">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Box title="בעלי עניין">
                      <List items={ev?.caseSnapshot?.parties} />
                    </Box>
                    <Box title="מוקד המחלוקת">
                      <p>{ev?.caseSnapshot?.coreDispute || "לא זוהה"}</p>
                      <Grounding items={ev?.caseSnapshot?.grounding} />
                    </Box>
                  </div>
                </Card>

                <Card title="Critical Issues">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(ev?.criticalIssues || []).map((item, index) => (
                      <IssueCard key={index} item={item} />
                    ))}
                  </div>
                </Card>

                <Card title="Strategic Assessment">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Box title="לתובע / מבקש הביטול">
                      {ev?.strategicAssessment?.forClaimant || "לא זוהה"}
                    </Box>
                    <Box title="לנתבע / הצד שכנגד">
                      {ev?.strategicAssessment?.forDefense || "לא זוהה"}
                    </Box>
                    <Box title="זירת הקרב המרכזית">
                      {ev?.strategicAssessment?.mostLikelyBattleground || "לא זוהה"}
                    </Box>
                  </div>
                  <Grounding items={ev?.strategicAssessment?.grounding} />
                </Card>

                <Card title="Possible Smoking Guns">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(ev?.smokingGuns || []).map((item, index) => (
                      <Box key={index} title={item.title}>
                        <p>{item.whyItMatters}</p>
                        <Grounding items={item.grounding} />
                      </Box>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {activeTab === "theory" && (
              <div className="space-y-6">
                <Card title="Claimant Theory">
                  <h3 className="font-semibold mb-3">
                    {ct?.claimantTheory?.headline || "לא זוהתה תיאוריה לתובע"}
                  </h3>
                  <List items={ct?.claimantTheory?.points} />
                  <Grounding items={ct?.claimantTheory?.grounding} />
                </Card>

                <Card title="Defense Theory">
                  <h3 className="font-semibold mb-3">
                    {ct?.defenseTheory?.headline || "לא זוהתה תיאוריה להגנה"}
                  </h3>
                  <List items={ct?.defenseTheory?.points} />
                  <Grounding items={ct?.defenseTheory?.grounding} />
                </Card>

                <Card title="Litigation Battleground">
                  <Box title={ct?.litigationBattleground?.issue || "זירת מחלוקת"}>
                    <p>{ct?.litigationBattleground?.why || "לא זוהה"}</p>
                    <Grounding items={ct?.litigationBattleground?.grounding} />
                  </Box>
                </Card>
              </div>
            )}

            {activeTab === "evidence" && (
              <div className="space-y-6">
                <Card title="לוח זמנים עיקרי">
                  <Timeline items={eg?.timeline} />
                </Card>

                <Card title="Evidence Map">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="p-3 text-right">Issue</th>
                          <th className="p-3 text-right">ראיה קיימת</th>
                          <th className="p-3 text-right">ראיה חסרה</th>
                          <th className="p-3 text-right">סיכון</th>
                          <th className="p-3 text-right">Grounding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(eg?.evidenceMap || []).map((row, index) => (
                          <tr key={index} className="border-b align-top">
                            <td className="p-3 font-medium">{row.issue}</td>
                            <td className="p-3">{row.existingEvidence}</td>
                            <td className="p-3">{row.missingEvidence}</td>
                            <td className="p-3"><Severity value={row.risk} /></td>
                            <td className="p-3"><Grounding items={row.grounding} compact /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                <Card title="Key Documents">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(eg?.keyDocuments || []).map((doc, index) => (
                      <Box key={index} title={doc.name}>
                        <p>{doc.role}</p>
                        <Grounding items={doc.grounding} />
                      </Box>
                    ))}
                  </div>
                </Card>

                <Card title="חוסרים ראייתיים">
                  <List items={eg?.missingEvidence} />
                </Card>
              </div>
            )}

            {activeTab === "actions" && (
              <div className="space-y-6">
                <Card title="Recommended Next Steps">
                  <List items={ac?.nextSteps} numbered />
                </Card>

                <Card title="Questions for Client">
                  <List items={ac?.clientQuestions} numbered />
                </Card>

                <Card title="Discovery Targets">
                  <List items={ac?.discoveryTargets} numbered />
                </Card>

                <Card title="Drafting Ideas">
                  <List items={ac?.draftingIdeas} numbered />
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section className="bg-white border rounded-2xl shadow-sm p-5">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Box({ title, children }) {
  return (
    <div className="bg-slate-50 border rounded-2xl p-4">
      <h3 className="font-semibold mb-2">{title}</h3>
      <div className="text-slate-700 leading-7">{children}</div>
    </div>
  );
}

function Metric({ title, value }) {
  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="font-semibold mt-1">{value}</div>
    </div>
  );
}

function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "rounded-xl bg-slate-900 text-white px-3 py-3 text-sm font-semibold"
          : "rounded-xl bg-slate-50 hover:bg-slate-100 px-3 py-3 text-sm text-slate-700"
      }
    >
      {children}
    </button>
  );
}

function IssueCard({ item }) {
  return (
    <div className="border rounded-2xl p-4 bg-white">
      <Severity value={item.severity} />
      <h3 className="font-semibold mt-3">{item.title}</h3>
      <p className="text-sm text-slate-700 leading-6 mt-2">{item.analysis}</p>
      <Grounding items={item.grounding} />
    </div>
  );
}

function Severity({ value }) {
  const label = value || "Medium";
  const color =
    label === "High"
      ? "bg-red-50 text-red-700 border-red-200"
      : label === "Low"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <span className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}

function List({ items, numbered }) {
  if (!items || !items.length) return <p className="text-slate-500">לא זוהה.</p>;

  const Tag = numbered ? "ol" : "ul";

  return (
    <Tag className={numbered ? "list-decimal pr-5 space-y-2" : "list-disc pr-5 space-y-2"}>
      {items.map((item, index) => (
        <li key={index} className="leading-7">{item}</li>
      ))}
    </Tag>
  );
}

function Grounding({ items, compact }) {
  if (!items || !items.length) return null;

  return (
    <div className={compact ? "text-xs text-slate-500 leading-5" : "mt-3 text-xs text-slate-500 leading-5 border-t pt-2"}>
      <span className="font-semibold">מבוסס על: </span>
      {items.join(" · ")}
    </div>
  );
}

function Timeline({ items }) {
  if (!items || !items.length) {
    return <p className="text-slate-500">לא זוהה לוח זמנים מספק.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="border rounded-2xl p-4 bg-slate-50">
          <div className="font-semibold">{item.date || "מועד לא ידוע"}</div>
          <div className="mt-1">{item.event}</div>
          <div className="text-sm text-slate-600 mt-2">
            {item.legalSignificance}
          </div>
          <Grounding items={item.grounding} />
        </div>
      ))}
    </div>
  );
}
