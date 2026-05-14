import React, { useState } from "react";

import ActionCenter from "./components/ActionCenter";
import CaseIntake from "./components/CaseIntake";
import CaseTheory from "./components/CaseTheory";
import CollapsedCaseHeader from "./components/CollapsedCaseHeader";
import EvidenceGaps from "./components/EvidenceGaps";
import ExecutiveView from "./components/ExecutiveView";
import Tabs from "./components/Tabs";

export default function App() {
  const [caseText, setCaseText] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [status, setStatus] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [intakeExpanded, setIntakeExpanded] = useState(true);

  async function handleWordUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setStatus("קורא את הקבצים...");

    const acceptedFiles = files.filter((file) =>
      file.name.toLowerCase().endsWith(".docx")
    );

    if (!acceptedFiles.length) {
      setStatus("כרגע הדמו תומך רק בקובצי .docx");
      return;
    }

    try {
      const mammoth = await import("mammoth");
      const newFiles = [];
      const extractedTexts = [];

      for (const file of acceptedFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });

        newFiles.push({
          name: file.name,
          size: file.size,
          status: "נטען",
        });

        extractedTexts.push(`--- ${file.name} ---\n${result.value || ""}`);
      }

      setUploadedFiles((prev) => [...prev, ...newFiles]);
      setDocumentText((prev) =>
        [prev, ...extractedTexts].filter(Boolean).join("\n\n")
      );

      setStatus("הקבצים נטענו בהצלחה.");
    } catch (err) {
      console.error(err);
      setStatus("לא הצלחתי לקרוא את הקבצים. אפשר לנסות שוב.");
    }
  }

  async function runAnalysis() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseText, documentText }),
      });

      if (!response.ok) throw new Error("השרת החזיר שגיאה");

      const data = await response.json();

      setAnalysis(data);
      setActiveTab("overview");
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
    setStatus("אפשר להוסיף קבצים או לעדכן את תיאור המקרה ואז להריץ ניתוח מחדש.");
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900 p-5">
      <div className="max-w-7xl mx-auto space-y-4">
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
          <div id="results" className="space-y-4">
            <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

            {activeTab === "overview" && <ExecutiveView analysis={analysis} />}

            {activeTab === "theory" && <CaseTheory analysis={analysis} />}

            {activeTab === "evidence" && <EvidenceGaps analysis={analysis} />}

            {activeTab === "actions" && <ActionCenter analysis={analysis} />}
          </div>
        )}
      </div>
    </div>
  );
}
