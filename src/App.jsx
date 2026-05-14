import React, { useState } from "react";

export default function App() {
  const [caseText, setCaseText] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");
  const [analysis, setAnalysis] = useState(null);
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

      if (!response.ok) {
        throw new Error("השרת החזיר שגיאה");
      }

      const data = await response.json();
      setAnalysis(data);

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

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚖️</span>
              <h1 className="text-3xl font-bold">Second Chair</h1>
              <span className="text-xs bg-slate-200 rounded-full px-3 py-1">
                Litigation Cockpit v0.4.0
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
              <Metric title="סיכון" value={analysis.caseSnapshot?.riskLevel || "לא זוהה"} />
              <Metric title="מוקד" value={analysis.caseSnapshot?.issueFocus || "לא זוהה"} />
            </section>

            <Card title="Case Snapshot">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Box title="בעלי עניין">
                  <List items={analysis.caseSnapshot?.parties} />
                </Box>
                <Box title="מוקד המחלוקת">
                  {analysis.caseSnapshot?.coreDispute || "לא זוהה"}
                </Box>
              </div>
            </Card>

            <Card title="לוח זמנים עיקרי">
              <Timeline items={analysis.timeline} />
            </Card>

            <Card title="השאלה המשפטית העיקרית">
              <h3 className="font-semibold mb-2">
                {analysis.mainLegalIssue?.question || "לא זוהתה שאלה משפטית"}
              </h3>
              <p className="text-slate-700 leading-7">
                {analysis.mainLegalIssue?.whyItMatters || ""}
              </p>
            </Card>

            <Card title="Critical Issues">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(analysis.criticalIssues || []).map((item, index) => (
                  <div key={index} className="border rounded-2xl p-4 bg-white">
                    <Severity value={item.severity} />
                    <h3 className="font-semibold mt-2">{item.title}</h3>
                    <p className="text-sm text-slate-700 leading-6 mt-2">
                      {item.analysis}
                    </p>
                  </div>
                ))}
              </div>
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
                    </tr>
                  </thead>
                  <tbody>
                    {(analysis.evidenceMap || []).map((row, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-3 font-medium">{row.issue}</td>
                        <td className="p-3">{row.existingEvidence}</td>
                        <td className="p-3">{row.missingEvidence}</td>
                        <td className="p-3"><Severity value={row.risk} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="ניתוח משפטי">
              <p className="leading-8 text-slate-800 whitespace-pre-line">
                {analysis.legalAnalysis}
              </p>
            </Card>

            <Card title="טענות נגד צפויות">
              <div className="space-y-3">
                {(analysis.counterArguments || []).map((item, index) => (
                  <div key={index} className="border rounded-2xl p-4 bg-white">
                    <div className="flex justify-between gap-3">
                      <h3 className="font-semibold">{item.argument}</h3>
                      <Severity value={item.strength} />
                    </div>
                    <p className="text-sm text-slate-700 leading-6 mt-2">
                      {item.response}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Recommended Next Steps">
              <List items={analysis.nextSteps} numbered />
            </Card>

            <Card title="חוסרים ראייתיים">
              <List items={analysis.missingEvidence} />
            </Card>
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

function Severity({ value }) {
  const label = value || "Medium";
  const color =
    label === "High"
      ? "bg-red-100 text-red-700"
      : label === "Low"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-amber-100 text-amber-700";

  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
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
        </div>
      ))}
    </div>
  );
}
