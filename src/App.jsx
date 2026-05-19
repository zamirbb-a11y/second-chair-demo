import React, { useState } from "react";

import AnalysisLoadingOverlay from "./components/AnalysisLoadingOverlay";
import CaseIntake from "./components/CaseIntake";
import CollapsedCaseHeader from "./components/CollapsedCaseHeader";

import generateAnalysisDiff from "./utils/generateAnalysisDiff";
import WorkspaceSidebar from "./components/layout/WorkspaceSidebar";
import WorkspaceHeader from "./components/layout/WorkspaceHeader";
import IssuesView from "./views/IssuesView";
import EvidenceView from "./views/EvidenceView";
import WitnessesView from "./views/WitnessesView";
import PrecedentBankManager from "./admin/PrecedentBankManager";
import HorizontalTimeline from "./components/HorizontalTimeline";

export default function App() {
  const [caseText, setCaseText] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [caseName, setCaseName] = useState("צד א׳ נ׳ צד ב׳");
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
  const [activeView, setActiveView] = useState("case-map");
  const [entryMode, setEntryMode] = useState(null);
if (!entryMode) {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#eef4fb] flex items-center justify-center p-6"
    >
      <div className="w-full max-w-xl rounded-3xl bg-white shadow-xl border border-slate-200 p-10 space-y-8 text-center">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-slate-900">
            Second Chair
          </h1>

          <p className="text-slate-500 text-sm">
            Litigation Intelligence Workspace
          </p>
        </div>

        <div className="grid gap-4">
          <button
            onClick={() => setEntryMode("new")}
            className="
              rounded-2xl
              bg-slate-900
              text-white
              py-4
              text-lg
              font-medium
              hover:bg-slate-800
              transition
            "
          >
            תיק חדש
          </button>

          <button
            disabled
            className="
              rounded-2xl
              border
              border-slate-200
              bg-slate-100
              text-slate-400
              py-4
              text-lg
              font-medium
              cursor-not-allowed
            "
          >
            תיק קיים (בקרוב)
          </button>
        </div>
      </div>
    </div>
  );
}
  if (window.location.pathname === "/precedents") {
    return <PrecedentBankManager />;
  }

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
      console.log("ANALYSIS DATA:", data);
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
function inferCaseName(text = "") {
  if (!text.trim()) {
    return "צד פלוני נ' צד אלמוני";
  }

  const patterns = [
    /חברת\s+["״]?([^"\n]+)["״]?/g,
    /([A-Z][A-Za-z0-9&.\s]+(?:Ltd|Inc|LLC))/g,
    /["״]([^"\n]+)["״]/g,
  ];

  const matches = [];

  for (const pattern of patterns) {
    const found = [...text.matchAll(pattern)];

    for (const item of found) {
      if (item?.[1]) {
        matches.push(item[1].trim());
      }
    }
  }

  const unique = [...new Set(matches)].filter(Boolean);

  if (unique.length >= 2) {
    return `${unique[0]} נ' ${unique[1]}`;
  }

  return "צד פלוני נ' צד אלמוני";
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
      const parties =
  data?.executiveView?.caseSnapshot?.parties || [];

if (parties.length >= 2) {
  setCaseName(`${parties[0]} נ' ${parties[1]}`);
} else {
  setCaseName("צד פלוני נ' צד אלמוני");
}

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

  function renderWorkspaceView() {
    switch (activeView) {
      case "pleadings":
        return <EvidenceView />;

      case "discovery":
        return <WitnessesView />;

      case "proofs":
        return <EvidenceView />;

      case "summaries":
        return <WitnessesView />;

        case "timeline":
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-bold">ציר זמן</h2>

      <HorizontalTimeline
        items={analysis?.evidenceAndGaps?.timeline || []}
      />
    </div>
  );

      case "case-map":
      default:
        return (
          <IssuesView
            analysis={analysis}
            onWorkspaceUpdate={handleWorkspaceUpdate}
          />
        );
    }
  }

  return (
    <div
      dir="rtl"
      className="
        min-h-screen
        bg-[#eef4fb]
        text-slate-900
      "
    >
      {loading && <AnalysisLoadingOverlay />}

      <div className="flex min-h-screen">
        <WorkspaceSidebar
          activeView={activeView}
          onChangeView={setActiveView}
        />

        <div className="flex-1 p-6 bg-[#f4f8fd]">
          <div className="max-w-[1500px] mx-auto space-y-4">
            <div className="flex justify-end">
              <a
                href="/precedents"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm hover:bg-slate-50"
              >
                Admin · מאגר פסיקה
              </a>
            </div>

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
                caseName={caseName}
                caseText={caseText}
                uploadedFiles={uploadedFiles}
                onEdit={() => setIntakeExpanded(true)}
                onAddInfo={handleAddInfo}
                onReanalyze={runAnalysis}
                loading={loading}
              />
            )}

            <WorkspaceHeader activeView={activeView} />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
                {error}
              </div>
            )}

            <main id="results" className="space-y-4 min-w-0">
              {renderWorkspaceView()}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}