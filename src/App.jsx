import React, { useState } from "react";

import AnalysisLoadingOverlay from "./components/AnalysisLoadingOverlay";
import AnalysisWorkspace from "./components/AnalysisWorkspace";
import CaseIntake from "./components/CaseIntake";
import CollapsedCaseHeader from "./components/CollapsedCaseHeader";

import generateAnalysisDiff from "./utils/generateAnalysisDiff";

export default function App() {
  const [caseText, setCaseText] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [caseFiles, setCaseFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [status, setStatus] = useState("");

  const [analysis, setAnalysis] = useState(null);
  const [previousAnalysis, setPreviousAnalysis] = useState(null);
  const [analysisDiff, setAnalysisDiff] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [intakeExpanded, setIntakeExpanded] = useState(true);

  const [workspaceUpdates, setWorkspaceUpdates] = useState([]);

  async function handleWordUpload(event) {
    const files = Array.from(event.target.files || []);

    if (!files.length) return;

    setStatus("מעלה ומעבד את הקבצים...");
    setError("");

    try {
      const formData = new FormData();

      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      const processedFiles = data.files || [];

      setCaseFiles((prev) => [...prev, ...processedFiles]);

      setUploadedFiles((prev) => [
        ...prev,
        ...processedFiles.map((file) => ({
          name: file.name,
          size: file.size,
          status: file.status,
          type: file.type,
        })),
      ]);

      const extractedTexts = processedFiles
        .filter((file) => file.text?.trim())
        .map((file) => `--- ${file.name} ---\n${file.text}`);

      if (extractedTexts.length) {
        setDocumentText((prev) =>
          [prev, ...extractedTexts].filter(Boolean).join("\n\n")
        );
      }

      const loadedCount = processedFiles.filter(
        (file) => file.status === "נטען"
      ).length;

      const unsupportedCount = processedFiles.filter(
        (file) => file.status === "הפורמט טרם נתמך"
      ).length;

      const failedCount = processedFiles.filter(
        (file) => file.status === "שגיאה בקריאת הקובץ"
      ).length;

      if (loadedCount > 0 && (unsupportedCount > 0 || failedCount > 0)) {
        setStatus(
          `נטענו ${loadedCount} קבצים. ${unsupportedCount} קבצים בפורמט שעדיין לא נתמך. ${failedCount} קבצים נכשלו בקריאה.`
        );
      } else if (loadedCount > 0) {
        setStatus(`נטענו ${loadedCount} קבצים בהצלחה.`);
      } else {
        setStatus("הקבצים נוספו, אך לא חולץ מהם טקסט לניתוח.");
      }
    } catch (err) {
      console.error(err);

      setStatus("לא הצלחתי להעלות או לקרוא את הקבצים. בדוק את ה־Vercel Logs.");
    } finally {
      event.target.value = "";
    }
  }

  function handleWorkspaceUpdate(update) {
    const enrichedUpdate = {
      ...update,
      createdAt: new Date().toISOString(),
    };

    setWorkspaceUpdates((prev) => [enrichedUpdate, ...prev]);
    setError("");
    setStatus("נוסף מידע חדש לתיק. ניתן להריץ ניתוח מחדש.");
  }

  function buildCaseTextForAnalysis() {
    const updatesText = workspaceUpdates
      .map((update, index) => {
        return `
עדכון ${index + 1}
סוג: ${update.type || "עדכון"}
נושא: ${update.topic || "ללא נושא"}
תוכן:
${update.text || ""}
`;
      })
      .join("\n---\n");

    if (!updatesText.trim()) {
      return caseText;
    }

    return `
${caseText}

====================
עדכונים שנוספו במהלך העבודה על התיק
====================

${updatesText}
`;
  }

  async function runAnalysis() {
    setLoading(true);
    setError("");

    try {
      if (analysis) {
        setPreviousAnalysis(analysis);
      }

      const response = await fetch("/api/analyze", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          caseText: buildCaseTextForAnalysis(),
          documentText,
          files: caseFiles,
        }),
      });

      if (!response.ok) {
        throw new Error("השרת החזיר שגיאה");
      }

      const data = await response.json();

      if (analysis) {
        const diff = generateAnalysisDiff(analysis, data);
        setAnalysisDiff(diff);
      }

      setAnalysis(data);
      setIntakeExpanded(false);

      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({
          behavior: "smooth",
        });
      }, 100);
    } catch (err) {
      console.error(err);

      setError("הניתוח נכשל. בדוק את ה־API או את ה־Vercel Logs.");
    } finally {
      setLoading(false);
    }
  }

  function handleAddInfo() {
    setIntakeExpanded(true);
    setError("");

    setStatus(
      "אפשר להוסיף קבצים או לעדכן את תיאור המקרה ואז להריץ ניתוח מחדש."
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 text-slate-900 p-5"
    >
      {loading && <AnalysisLoadingOverlay />}

      <div className="max-w-[1500px] mx-auto space-y-4">
        <header className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚖️</span>

              <h1 className="text-3xl font-bold">Second Chair</h1>

              <span className="text-xs bg-slate-200 rounded-full px-3 py-1">
                Cockpit
              </span>
            </div>

            <p className="text-slate-600 mt-2">
              סביבת עבודה לניתוח תיקי ליטיגציה מסחרית.
            </p>
          </div>
        </header>

        {intakeExpanded || !analysis ? (
          <CaseIntake
            caseText={caseText}
            setCaseText={setCaseText}
            handleWordUpload={handleWordUpload}
            uploadedFiles={uploadedFiles}
            status={status}
            runAnalysis={runAnalysis}
            loading={loading}
          />
        ) : (
          <CollapsedCaseHeader
            caseText={caseText}
            uploadedFiles={uploadedFiles}
            onEdit={() => setIntakeExpanded(true)}
            onAddInfo={handleAddInfo}
            onReanalyze={runAnalysis}
            loading={loading}
          />
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
            {error}
          </div>
        )}

        {analysis && (
          <main id="results" className="space-y-4 min-w-0">
            <AnalysisWorkspace
              analysis={analysis}
              workspaceUpdates={workspaceUpdates}
              analysisDiff={analysisDiff}
              onAddWorkspaceUpdate={handleWorkspaceUpdate}
            />
          </main>
        )}
      </div>
    </div>
  );
}
