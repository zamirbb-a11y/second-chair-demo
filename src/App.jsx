import React, { useEffect, useState } from "react";

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
import SuccessAssessment from "./components/SuccessAssessment";
import DeltaNotificationPanel from "./components/DeltaNotificationPanel";

import {
  createCaseId,
  saveCase,
  loadCase,
  listCases,
  deleteCase,
} from "./utils/caseStorage";

export default function App() {
  const [caseText, setCaseText] = useState("");
  const [additionalInfoText, setAdditionalInfoText] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [caseName, setCaseName] = useState("צד א׳ נ׳ צד ב׳");

  const [caseFiles, setCaseFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [status, setStatus] = useState("");

  const [analysis, setAnalysis] = useState(null);
  const [previousAnalysis, setPreviousAnalysis] = useState(null);
  const [analysisDiff, setAnalysisDiff] = useState([]);
  const [latestDelta, setLatestDelta] = useState(null);
  const [acceptedWorkItems, setAcceptedWorkItems] = useState([]);
  const [lastAnalyzedCaseText, setLastAnalyzedCaseText] = useState("");
  const [showDeltaPanel, setShowDeltaPanel] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [intakeExpanded, setIntakeExpanded] = useState(true);

  const [workspaceUpdates, setWorkspaceUpdates] = useState([]);
  const [activeView, setActiveView] = useState("case-map");

  const [entryMode, setEntryMode] = useState(null);
  const [savedCases, setSavedCases] = useState([]);
  const [newCaseName, setNewCaseName] = useState("");
  const [showNewCaseForm, setShowNewCaseForm] = useState(false);
  const [currentCaseId, setCurrentCaseId] = useState(null);

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  useEffect(() => {
    setSavedCases(listCases());
  }, []);

  if (!isAuthorized) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#eef4fb] flex items-center justify-center p-6"
      >
        <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-xl p-8 space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold text-slate-900">Second Chair</h1>
            <p className="text-sm text-slate-500">סביבת ניסוי פנימית</p>
          </div>

          <div className="space-y-3">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="הכנס סיסמה"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-right focus:outline-none focus:ring-2 focus:ring-slate-400"
            />

            <button
              type="button"
              onClick={() => {
                if (passwordInput === "1984") {
                  setIsAuthorized(true);
                } else {
                  alert("סיסמה שגויה");
                }
              }}
              className="w-full rounded-2xl bg-slate-900 py-3 text-white font-bold hover:bg-slate-800"
            >
              כניסה
            </button>
          </div>
        </div>
      </div>
    );
  }

  function buildCurrentCaseState(analysisData = analysis, overrides = {}) {
    const effectiveCaseName =
      overrides.caseName || caseName || "תיק ללא שם";

    return {
      id: currentCaseId || createCaseId(),
      name: effectiveCaseName,
      caseName: effectiveCaseName,
      caseText: overrides.caseText ?? caseText,
      documentText: overrides.documentText ?? documentText,
      caseFiles: overrides.caseFiles ?? caseFiles,
      uploadedFiles: overrides.uploadedFiles ?? uploadedFiles,
      analysis: analysisData,
      workspaceUpdates: overrides.workspaceUpdates ?? workspaceUpdates,
      acceptedWorkItems: overrides.acceptedWorkItems ?? acceptedWorkItems,
      lastAnalyzedCaseText:
  overrides.lastAnalyzedCaseText ?? lastAnalyzedCaseText,
    };
  }

  function persistCurrentCase(analysisData = analysis, overrides = {}) {
    const saved = saveCase(buildCurrentCaseState(analysisData, overrides));
    setCurrentCaseId(saved.id);
    setSavedCases(listCases());
  }

  function openSavedCase(caseId) {
    const loaded = loadCase(caseId);
    if (!loaded) return;

    setCurrentCaseId(loaded.id);
    setCaseName(loaded.caseName || loaded.name || "תיק");
    setCaseText(loaded.caseText || "");
    setDocumentText(loaded.documentText || "");
    setCaseFiles(loaded.caseFiles || []);
    setUploadedFiles(loaded.uploadedFiles || []);
    setAnalysis(loaded.analysis || null);
    setWorkspaceUpdates(loaded.workspaceUpdates || []);
    setAcceptedWorkItems(loaded.acceptedWorkItems || []);
    setLastAnalyzedCaseText(loaded.lastAnalyzedCaseText || "");
    setEntryMode("existing");
    setIntakeExpanded(!loaded.analysis);
    setStatus("");
    setError("");
    setShowNewCaseForm(false);
    setNewCaseName("");
  }

  function startNewCase() {
    const initialCaseName = newCaseName.trim() || "תיק ללא שם";

    setCurrentCaseId(createCaseId());
    setCaseName(initialCaseName);
    setCaseText("");
    setDocumentText("");
    setCaseFiles([]);
    setUploadedFiles([]);
    setAnalysis(null);
    setPreviousAnalysis(null);
    setAnalysisDiff([]);
    setWorkspaceUpdates([]);
    setAcceptedWorkItems([]);
    setStatus("");
    setError("");
    setIntakeExpanded(true);
    setEntryMode("new");
    setShowNewCaseForm(false);
    setNewCaseName("");
    setLastAnalyzedCaseText("");
  }

 function removeSavedCase(caseId) {
  if (!caseId) return;
  if (!confirm("למחוק את התיק השמור?")) return;

  deleteCase(caseId);

  const remainingCases = listCases();
  setSavedCases(remainingCases);

  if (caseId === currentCaseId) {
    const nextCase = remainingCases[0];

    if (nextCase) {
      openSavedCase(nextCase.id);
    } else {
      setCurrentCaseId(null);
      setEntryMode(null);
      setAnalysis(null);
      setCaseText("");
      setDocumentText("");
      setCaseFiles([]);
      setUploadedFiles([]);
      setWorkspaceUpdates([]);
    }
  }
}

  if (!entryMode) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#eef4fb] flex items-center justify-center p-6"
      >
        <div className="w-full max-w-2xl rounded-3xl bg-white shadow-xl border border-slate-200 p-10 space-y-8">
          <div className="space-y-3 text-center">
            <h1 className="text-4xl font-bold text-slate-900">Second Chair</h1>
            <p className="text-slate-500 text-sm">
              Litigation Intelligence Workspace
            </p>
          </div>

          <div className="space-y-4">
            <div className="text-sm font-semibold text-slate-500">
              תיקים שמורים
            </div>

            {savedCases.length > 0 ? (
              <div className="space-y-2">
                {savedCases.map((item) => (
                  <div key={item.id} className="flex gap-2">
                    <button
                      onClick={() => openSavedCase(item.id)}
                      className="flex-1 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 p-4 text-right transition"
                    >
                      <div className="font-semibold">{item.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {item.documentsCount || 0} מסמכים
                      </div>
                    </button>

                    <button
                      onClick={() => removeSavedCase(item.id)}
                      className="rounded-2xl border border-red-200 bg-red-50 px-4 text-sm text-red-700 hover:bg-red-100"
                    >
                      מחק
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                אין עדיין תיקים שמורים.
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-5 space-y-3">
            {!showNewCaseForm ? (
              <button
                onClick={() => setShowNewCaseForm(true)}
                className="w-full rounded-2xl border border-slate-200 bg-white text-slate-700 py-3 text-base font-medium hover:bg-slate-50 transition"
              >
                + תיק חדש
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  value={newCaseName}
                  onChange={(e) => setNewCaseName(e.target.value)}
                  placeholder="שם התיק החדש"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-right focus:outline-none focus:ring-2 focus:ring-slate-300"
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={startNewCase}
                    className="rounded-2xl bg-slate-900 text-white py-3 font-medium hover:bg-slate-800 transition"
                  >
                    צור תיק
                  </button>

                  <button
                    onClick={() => {
                      setShowNewCaseForm(false);
                      setNewCaseName("");
                    }}
                    className="rounded-2xl border border-slate-200 bg-white text-slate-600 py-3 font-medium hover:bg-slate-50 transition"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            )}
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
      const processedFiles = data.files || [];

      const nextCaseFiles = [...caseFiles, ...processedFiles];

      const nextUploadedFiles = [
        ...uploadedFiles,
        ...processedFiles.map((file) => ({
          name: file.name,
          size: file.size,
          status: file.status,
          type: file.type,
          needsOcr: file.needsOcr,
          textLength: file.textLength,
        })),
      ];

      const extractedTexts = processedFiles
        .filter((file) => file.text?.trim())
        .map((file) => `--- ${file.name} ---\n${file.text}`);

      const nextDocumentText = extractedTexts.length
        ? [documentText, ...extractedTexts].filter(Boolean).join("\n\n")
        : documentText;

      setCaseFiles(nextCaseFiles);
      setUploadedFiles(nextUploadedFiles);
      setDocumentText(nextDocumentText);
      const documentUpdate = {
  type: "new_document",
  targetType: "case",
  targetId: currentCaseId,
  title: `נוספו ${processedFiles.length} מסמכים`,
  text: processedFiles
    .map((file) => {
      return `שם מסמך: ${file.name}
סטטוס: ${file.status || ""}
סוג: ${file.type || ""}
אורך טקסט שחולץ: ${file.textLength || 0}
דורש OCR: ${file.needsOcr ? "כן" : "לא"}`;
    })
    .join("\n\n---\n\n"),
  status: "pending_analysis",
};

const nextUpdates = [
  {
    id: `update-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...documentUpdate,
    createdAt: new Date().toISOString(),
  },
  ...workspaceUpdates,
];

setWorkspaceUpdates(nextUpdates);

      const loadedCount = processedFiles.filter(
        (file) => file.status === "נטען"
      ).length;

      if (loadedCount > 0) {
        setStatus(`נטענו ${loadedCount} קבצים בהצלחה.`);
      } else {
        setStatus("הקבצים נוספו, אך לא חולץ מהם טקסט לניתוח.");
      }

persistCurrentCase(analysis, {
  caseFiles: nextCaseFiles,
  uploadedFiles: nextUploadedFiles,
  documentText: nextDocumentText,
  workspaceUpdates: nextUpdates,
});
    } catch (err) {
      console.error(err);
      setStatus("לא הצלחתי להעלות או לקרוא את הקבצים.");
    } finally {
      event.target.value = "";
    }
  }

function handleWorkspaceUpdate(update) {
  const enrichedUpdate = {
    id:
      update.id ||
      `update-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: update.type || "general_note",
    targetType: update.targetType || "case",
    targetId: update.targetId || null,
    title: update.title || update.topic || "עדכון לתיק",
    text: update.text || "",
    createdAt: update.createdAt || new Date().toISOString(),
    status: update.status || "pending_analysis",
  };

  const nextUpdates = [enrichedUpdate, ...workspaceUpdates];

  setWorkspaceUpdates(nextUpdates);
  setError("");
  setStatus("נוסף מידע חדש לתיק. ניתן להריץ ניתוח מחדש.");

  persistCurrentCase(analysis, {
    workspaceUpdates: nextUpdates,
  });
}

function buildCaseTextForAnalysis() {
  const updatesText = workspaceUpdates
    .map((update, index) => {
      return `
Update ${index + 1}
id: ${update.id || ""}
type: ${update.type || "general_note"}
targetType: ${update.targetType || "case"}
targetId: ${update.targetId || ""}
status: ${update.status || "pending_analysis"}
title: ${update.title || update.topic || "עדכון לתיק"}
createdAt: ${update.createdAt || ""}

text:
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
STRUCTURED LITIGATION WORKSPACE EVENT LOG
====================

These are structured updates added after the initial case analysis.
The analysis should evaluate each update according to its type, target and status.

Update handling guidance:
- added_issue: analyze the new dispute/issue and integrate it into the case map.
- edited_issue: reassess the existing issue and update risks, strengths, weaknesses and evidence needs.
- client_answer: evaluate how the answer affects case theory, evidence gaps, credibility and next steps.
- new_document: evaluate impact on evidence, timeline, legal theory and prospects.
- general_note: evaluate whether it changes any material assessment.
- new_pleading: identify opposing claims, admissions, contradictions, missing responses and cited authorities.

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

      const parties = data?.executiveView?.caseSnapshot?.parties || [];

      const nextCaseName =
        parties.length >= 2 ? `${parties[0]} נ' ${parties[1]}` : caseName;

      setCaseName(nextCaseName);

      if (analysis) {
        const diff = generateAnalysisDiff(analysis, data);
        setAnalysisDiff(diff);
      }

      setAnalysis(data);
      setIntakeExpanded(false);

      persistCurrentCase(data, {
        caseName: nextCaseName,
      });

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
 async function handleCaseTextUpdateAndReanalyze() {
  const text = additionalInfoText?.trim();

  const existingPendingUpdates = workspaceUpdates.filter(
    (update) => update.status === "pending_analysis"
  );

 if (!text && existingPendingUpdates.length > 0) {
  await runIncrementalAnalysis();
  setIntakeExpanded(false);
  return;
}

  if (!text) {
    setStatus("לא זוהה מידע חדש לניתוח.");
    return;
  }

  const textUpdate = {
    id: `update-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    type: "case_text_update",
    targetType: "case",
    targetId: currentCaseId,
    title: "עדכון טקסטואלי לתיק",
    text,
    createdAt: new Date().toISOString(),
    status: "pending_analysis",
  };

  const nextUpdates = [textUpdate, ...workspaceUpdates];

  setWorkspaceUpdates(nextUpdates);

  setAdditionalInfoText("");

  persistCurrentCase(analysis, {
    workspaceUpdates: nextUpdates,
  });

  await runIncrementalAnalysis(nextUpdates);
}
async function runIncrementalAnalysis(updatesOverride = null) {
  console.log("RUN INCREMENTAL CLICKED");

  console.log("workspaceUpdates:", workspaceUpdates);

  console.log(
    "pending:",
    workspaceUpdates.filter(
      (u) => u.status === "pending_analysis"
    )
  );

  setLoading(true);
  setError("");

  try {
const effectiveUpdates = updatesOverride || workspaceUpdates;

const pendingUpdates = effectiveUpdates.filter(
  (update) => update.status === "pending_analysis"
);

    if (!pendingUpdates.length) {
      setStatus("אין עדכונים חדשים לניתוח.");
      return;
    }

    const response = await fetch("/api/reanalyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
body: JSON.stringify({
  previousAnalysis: {
    executiveView: analysis?.executiveView,
    caseTheory: analysis?.caseTheory,
  },
  workspaceUpdates: pendingUpdates.map((update) => ({
    id: update.id,
    type: update.type,
    targetType: update.targetType,
    targetId: update.targetId,
    title: update.title,
    text: update.text,
    createdAt: update.createdAt,
    status: update.status,
  })),
  caseText: caseText.slice(0, 4000),
  documentText: "",
}),
    });

if (!response.ok) {
  const errorData = await response.json().catch(() => null);
console.error(
  "REANALYSIS SERVER ERROR:",
  JSON.stringify(errorData, null, 2)
);
  throw new Error(errorData?.error || "Reanalysis failed");
}

    const delta = await response.json();
    setLatestDelta(delta);
    setShowDeltaPanel(true);

    console.log("DELTA ANALYSIS:", delta);

    const analyzedIds = delta.analyzedUpdateIds || [];

const nextUpdates = effectiveUpdates.map((update) => {
      if (analyzedIds.includes(update.id)) {
        return {
          ...update,
          status: "analyzed",
        };
      }

      return update;
    });

    setWorkspaceUpdates(nextUpdates);

    setStatus("בוצע עדכון ניתוח לתיק.");
    setIntakeExpanded(false);

    persistCurrentCase(analysis, {
      workspaceUpdates: nextUpdates,
    });

    console.log("REANALYSIS RESULT:", delta);
  } catch (err) {
    console.error(err);
    setError("עדכון הניתוח נכשל.");
  } finally {
    setLoading(false);
  }
}

  function handleAddInfo() {
    setIntakeExpanded(true);
    setError("");
    setStatus("אפשר להוסיף קבצים או לעדכן את תיאור המקרה ואז להריץ ניתוח מחדש.");
  }
function acceptGeneratedWorkItem(item, index) {
  const acceptedItem = {
    ...item,
    id:
      item.id ||
      `work-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: "accepted",
    acceptedAt: new Date().toISOString(),
  };

  const nextAcceptedWorkItems = [acceptedItem, ...acceptedWorkItems];

  const nextGeneratedWorkItems =
    latestDelta?.generatedWorkItems?.filter((_, itemIndex) => itemIndex !== index) ||
    [];

  const nextDelta = {
    ...latestDelta,
    generatedWorkItems: nextGeneratedWorkItems,
  };

  setAcceptedWorkItems(nextAcceptedWorkItems);
  setLatestDelta(nextDelta);

  persistCurrentCase(analysis, {
    acceptedWorkItems: nextAcceptedWorkItems,
  });
}

function rejectGeneratedWorkItem(index) {
  const nextGeneratedWorkItems =
    latestDelta?.generatedWorkItems?.filter((_, itemIndex) => itemIndex !== index) ||
    [];

  setLatestDelta({
    ...latestDelta,
    generatedWorkItems: nextGeneratedWorkItems,
  });
}

function removeAcceptedWorkItem(itemId) {
  const nextAcceptedWorkItems = acceptedWorkItems.filter(
    (item) => item.id !== itemId
  );

  setAcceptedWorkItems(nextAcceptedWorkItems);

  persistCurrentCase(analysis, {
    acceptedWorkItems: nextAcceptedWorkItems,
  });
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
    <div className="space-y-4">
      <IssuesView
        analysis={analysis}
        onWorkspaceUpdate={handleWorkspaceUpdate}
      />

      {acceptedWorkItems.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="font-bold text-slate-900 mb-3">
            משימות שאושרו
          </div>

          <div className="space-y-2">
            {acceptedWorkItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <div className="font-semibold">
                      {item.title}
                    </div>

                    <div className="mt-1 text-sm text-slate-600 leading-6">
                      {item.description}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeAcceptedWorkItem(item.id)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    מחק
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#eef4fb] text-slate-900"
    >
      {loading && <AnalysisLoadingOverlay />}

      <div className="flex min-h-screen">
        <WorkspaceSidebar
          activeView={activeView}
          onChangeView={setActiveView}
        />

        <div className="flex-1 p-6 bg-[#f4f8fd]">
          <div className="max-w-[1500px] mx-auto space-y-4">
            <div className="flex justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <select
                  value={currentCaseId || ""}
                  onChange={(e) => openSavedCase(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
                >
                  <option value="" disabled>
                    מעבר בין תיקים
                  </option>

                  {savedCases.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>


                <button
                  onClick={() => removeSavedCase(currentCaseId)}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm hover:bg-red-100"
                >
                  מחק תיק
                </button>
               {latestDelta && (
  <button
    type="button"
    onClick={() => {
      console.log("BELL CLICKED");
      setShowDeltaPanel((prev) => !prev);
    }}
    className="relative rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
  >
    🔔 עדכונים

    <span className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
      {latestDelta.generatedWorkItems?.length || 1}
    </span>
  </button>
)}
              </div>

              <a
                href="/precedents"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm hover:bg-slate-50"
              >
                Admin · מאגר פסיקה
              </a>
            </div>

            {intakeExpanded || !analysis ? (
<CaseIntake
  caseText={analysis ? additionalInfoText : caseText}
  setCaseText={analysis ? setAdditionalInfoText : setCaseText}
  handleWordUpload={handleWordUpload}
  uploadedFiles={uploadedFiles}
  status={status}
runAnalysis={analysis ? handleCaseTextUpdateAndReanalyze : runAnalysis}
  loading={loading}
  hasAnalysis={!!analysis}
/>
            ) : (
      <CollapsedCaseHeader
  caseName={caseName}
  caseText={caseText}
  uploadedFiles={uploadedFiles}
  onAddInfo={handleAddInfo}
  onReanalyze={runIncrementalAnalysis}
  loading={loading}
/>
            )}

            <WorkspaceHeader activeView={activeView} />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
                {error}
              </div>
            )}

{latestDelta && showDeltaPanel && (
<DeltaNotificationPanel
  delta={latestDelta}
  onClose={() => setShowDeltaPanel(false)}
  onAcceptWorkItem={acceptGeneratedWorkItem}
  onRejectWorkItem={rejectGeneratedWorkItem}
/>
)}
            <main id="results" className="space-y-4 min-w-0">
              {activeView === "case-map" &&
                analysis?.executiveView?.successAssessment && (
                  <SuccessAssessment
                    assessment={analysis.executiveView.successAssessment}
                  />
                )}

              {renderWorkspaceView()}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
  function DeltaMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
      <div className="text-lg font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-slate-500">{label}</div>
    </div>
  );
}

function translateWorkItemType(type) {
  switch (type) {
    case "client_question":
      return "שאלה ללקוח";
    case "evidence_to_obtain":
      return "ראיה להשגה";
    case "suggested_action":
      return "מהלך מוצע";
    case "pleading_gap":
      return "פער בכתב טענות";
    case "legal_research":
      return "בדיקה משפטית";
    default:
      return "משימה";
  }
}
}