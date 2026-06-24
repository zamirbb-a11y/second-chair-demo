import React, { useEffect, useMemo, useState } from "react";

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

import {
  translateEvidenceType,
  getUnscopedEvidenceOverlays,
  getUnscopedWorkItems,
  getUnscopedContradictionOverlays,
} from "./utils/applyOverlays";
import { normalizeIssues } from "./utils/normalizeIssues";
import { buildLiveCaseState } from "./utils/buildLiveCaseState";
import { createEvent, hasIntakeEvent, computeCaseState } from "./lib/caseEvents";
import { normalizeTimelineDate } from "./utils/normalizeTimelineDate";
import { normalizeDeltaIssueLinks } from "./utils/normalizeDeltaIssueLinks";

function buildIssueAnalysisResult(issueId, issueTitle, result) {
  const id = () => `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const overlays = [];
  const events = [];
  const workItems = [];

  if (result.claimantPosition || result.defendantPosition) {
    overlays.push({
      id: id(),
      createdAt: now,
      type: "issue_updated",
      isNew: false,
      patch: {
        issueId,
        partyPositions: {
          claimant: result.claimantPosition || "",
          defendant: result.defendantPosition || "",
        },
      },
    });
  }

  if (result.legalAssessment?.summary) {
    overlays.push({
      id: id(),
      createdAt: now,
      type: "assessment",
      isNew: true,
      patch: {
        action: "update_assessment",
        issueId,
        issueTitle,
        field: "legalAssessment.summary",
        previousValue: null,
        newValue: result.legalAssessment.summary,
        reason: "ניתוח AI ממוקד מחלוקת",
      },
    });
    const e = createEvent(
      "assessment_changed", "ai_delta",
      { issueId, field: "legalAssessment.summary" },
      { op: "replace", path: "legalAssessment.summary", value: result.legalAssessment.summary, previousValue: null },
      { summary: "עדכון סיכום הערכה", changed: "הערכה", reason: "ניתוח AI ממוקד מחלוקת", groundedIn: [] }
    );
    e.status = "accepted";
    events.push(e);
  }

  if (result.legalAssessment?.strength && result.legalAssessment.strength !== "unclear") {
    overlays.push({
      id: id(),
      createdAt: now,
      type: "assessment",
      isNew: true,
      patch: {
        action: "update_assessment",
        issueId,
        issueTitle,
        field: "legalAssessment.strength",
        previousValue: "unclear",
        newValue: result.legalAssessment.strength,
        reason: "ניתוח AI ממוקד מחלוקת",
      },
    });
    const e = createEvent(
      "assessment_changed", "ai_delta",
      { issueId, field: "legalAssessment.strength" },
      { op: "replace", path: "legalAssessment.strength", value: result.legalAssessment.strength, previousValue: "unclear" },
      { summary: `חוזק: ${result.legalAssessment.strength}`, changed: "הערכה", reason: "ניתוח AI ממוקד מחלוקת", groundedIn: [] }
    );
    e.status = "accepted";
    events.push(e);
  }

  for (const item of result.evidenceUpdates || []) {
    if (item.type === "missing_evidence" || item.type === "evidence_gap") continue;
    overlays.push({
      id: id(),
      createdAt: now,
      type: "evidence",
      isNew: true,
      patch: {
        action: "add_evidence_update",
        evidenceType: item.type,
        title: item.title,
        description: item.description,
        relatedIssueId: issueId,
        relatedIssueTitle: issueTitle,
        relatedUpdateId: null,
      },
    });
    const evType = item.type === "missing_evidence" || item.type === "evidence_gap"
      ? "evidence_gap_noted"
      : "evidence_added";
    const e = createEvent(evType, "ai_delta", { issueId, field: "linkedEvidence" }, { op: "add", path: "linkedEvidence", value: item.title }, { summary: item.title, changed: "ראיות", reason: item.description || "", groundedIn: [] });
    e.status = "accepted";
    events.push(e);
  }

  for (const item of result.missingEvidence || []) {
    overlays.push({
      id: id(),
      createdAt: now,
      type: "evidence",
      isNew: true,
      patch: {
        action: "add_evidence_update",
        evidenceType: "missing_evidence",
        title: item.title,
        description: item.description,
        relatedIssueId: issueId,
        relatedIssueTitle: issueTitle,
        relatedUpdateId: null,
      },
    });
    const e = createEvent("evidence_gap_noted", "ai_delta", { issueId, field: "linkedEvidence" }, { op: "add", path: "linkedEvidence", value: item.title }, { summary: item.title, changed: "ראיות", reason: item.description || "", groundedIn: [] });
    e.status = "accepted";
    events.push(e);
  }

  for (const item of result.contradictions || []) {
    overlays.push({
      id: id(),
      createdAt: now,
      type: "contradiction",
      isNew: true,
      patch: {
        action: "add_contradiction",
        title: item.title,
        description: item.description,
        severity: item.severity || "medium",
        direction: item.direction || "unclear",
        relatedIssueId: issueId,
        relatedIssueTitle: issueTitle,
        relatedUpdateId: null,
        targetType: item.targetType || "unknown",
        targetId: null,
      },
    });
    const e = createEvent("contradiction_noted", "ai_delta", { issueId, field: "annotations.contradictions" }, { op: "add", path: "annotations.contradictions", value: item.title }, { summary: item.title, changed: "סתירות", reason: item.description || "", groundedIn: [] });
    e.status = "accepted";
    events.push(e);
  }

  for (const item of result.generatedWorkItems || []) {
    workItems.push({
      ...item,
      id: id(),
      status: "accepted",
      acceptedAt: now,
      relatedIssueId: issueId,
      relatedIssueTitle: issueTitle,
    });
    const e = createEvent("work_item_created", "ai_delta", { issueId, field: null }, { op: "add", path: "workItems", value: item.title }, { summary: item.title, changed: "משימות", reason: item.description || item.reason || "", groundedIn: [] });
    e.status = "accepted";
    events.push(e);
  }

  return { overlays, events, workItems };
}

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
  const [userIssues, setUserIssues] = useState([]);
  const [overlays, setOverlays] = useState([]);
  const [caseEvents, setCaseEvents] = useState([]);
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

  // Phase A: computed but not yet read by UI. Infrastructure for Phase B.
  // eslint-disable-next-line no-unused-vars
  const caseState = useMemo(
    () => computeCaseState(analysis, caseEvents),
    [analysis, caseEvents]
  );

  // Phase 1 read model: centralized derived state for rendering.
  // Not yet consumed by UI — Phase 2 will migrate IssuesView first.
  // eslint-disable-next-line no-unused-vars
  const liveCaseState = useMemo(
    () => buildLiveCaseState({ analysis, overlays, userIssues, acceptedWorkItems }),
    [analysis, overlays, userIssues, acceptedWorkItems]
  );

  useEffect(() => {
    setSavedCases(listCases());
  }, []);

  useEffect(() => {
    if (!isAuthorized || entryMode) return;
    const action = new URLSearchParams(window.location.search).get('action');
    if (!action) {
      window.location.href = '/landing.html';
      return;
    }
    if (action === 'new') {
      window.history.replaceState({}, '', '/');
      startNewCase();
    }
    // action === 'open': fall through — JSX will render the cases list
  }, [isAuthorized, entryMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!analysis) return;
    const hasPending = workspaceUpdates.some(
      (u) => u.status === "pending_analysis"
    );
    if (!hasPending) return;
    const cleaned = workspaceUpdates.map((u) =>
      u.status === "pending_analysis" ? { ...u, status: "analyzed" } : u
    );
    setWorkspaceUpdates(cleaned);
    persistCurrentCase(analysis, { workspaceUpdates: cleaned });
  }, [analysis]); // eslint-disable-line react-hooks/exhaustive-deps

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
      userIssues: overrides.userIssues ?? userIssues,
      overlays: overrides.overlays ?? overlays,
      caseEvents: overrides.caseEvents ?? caseEvents,
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
    setPreviousAnalysis(null);
    setAnalysisDiff([]);
    const loadedUpdates = (loaded.workspaceUpdates || []).map((u) =>
      loaded.analysis && u.status === "pending_analysis"
        ? { ...u, status: "analyzed" }
        : u
    );
    setWorkspaceUpdates(loadedUpdates);
    setAcceptedWorkItems(loaded.acceptedWorkItems || []);
    setUserIssues(loaded.userIssues || []);
    setOverlays(loaded.overlays || []);
    setCaseEvents(loaded.caseEvents || []);
    setLatestDelta(null);
    setShowDeltaPanel(false);
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
    setCaseEvents([]);
    setStatus("");
    setError("");
    setIntakeExpanded(true);
    setEntryMode("new");
    setShowNewCaseForm(false);
    setNewCaseName("");
    setLastAnalyzedCaseText("");
  }

  function handleOpenNewCase() {
    setCurrentCaseId(null);
    setCaseName("תיק ללא שם");
    setCaseText("");
    setDocumentText("");
    setCaseFiles([]);
    setUploadedFiles([]);
    setAnalysis(null);
    setPreviousAnalysis(null);
    setAnalysisDiff([]);
    setWorkspaceUpdates([]);
    setAcceptedWorkItems([]);
    setOverlays([]);
    setCaseEvents([]);
    setLatestDelta(null);
    setShowDeltaPanel(false);
    setLastAnalyzedCaseText("");
    setStatus("");
    setError("");
    setIntakeExpanded(true);
    setActiveView("case-map");
    setShowNewCaseForm(false);
    setNewCaseName("");
    setEntryMode(null);
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
    const landingAction = new URLSearchParams(window.location.search).get('action');
    if (!landingAction) return null; // useEffect is redirecting to /landing.html

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
          <div className="pt-2 text-center">
            <button
              onClick={() => { window.location.href = '/landing.html'; }}
              className="text-sm text-slate-400 hover:text-slate-600 transition"
            >
              ← חזור לדף הבית
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

      const analyzedUpdates = workspaceUpdates.map((u) =>
        u.status === "pending_analysis" ? { ...u, status: "analyzed" } : u
      );
      setWorkspaceUpdates(analyzedUpdates);

      // Create intake event only once — guard against re-analysis overwriting it.
      let nextCaseEvents = caseEvents;
      if (!hasIntakeEvent(caseEvents)) {
        const intakeEvent = createEvent("intake", "ai_analysis", null, null, {
          summary: "ניתוח ראשוני של התיק",
        });
        intakeEvent.status = "accepted";
        nextCaseEvents = [intakeEvent];
        setCaseEvents(nextCaseEvents);
      }

      persistCurrentCase(data, {
        caseName: nextCaseName,
        workspaceUpdates: analyzedUpdates,
        caseEvents: nextCaseEvents,
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
    setError("לא הוכנס מידע חדש");
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
      setError("לא הוכנס מידע חדש");
      return;
    }

    const allowedIssues = normalizeIssues(analysis).map((issue) => ({
      id: issue.id,
      title: issue.title,
    }));

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
  allowedIssues,
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
    const normalizedDelta = normalizeDeltaIssueLinks(delta, allowedIssues);
    setLatestDelta(normalizedDelta);
    setOverlays((prev) => prev.map((o) => ({ ...o, isNew: false })));
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

  const workItemEvent = createEvent(
    "work_item_created",
    "ai_delta",
    { issueId: item.relatedIssueId || null, field: null },
    { op: "add", path: "workItems", value: item.title },
    { summary: item.title, changed: "משימות", reason: item.description || item.reason || "", groundedIn: [] }
  );
  workItemEvent.status = "accepted";
  const nextCaseEvents = [...caseEvents, workItemEvent];

  setAcceptedWorkItems(nextAcceptedWorkItems);
  setCaseEvents(nextCaseEvents);
  setLatestDelta(nextDelta);

  persistCurrentCase(analysis, {
    acceptedWorkItems: nextAcceptedWorkItems,
    caseEvents: nextCaseEvents,
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
  function acceptEvidenceUpdate(item, index) {
    const overlay = {
      id: `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      type: "evidence",
      isNew: true,
      sourceDeltaItem: item,
      patch: {
        action: "add_evidence_update",
        evidenceType: item.type,
        title: item.title,
        description: item.description,
        relatedIssueId: item.relatedIssueId || null,
        relatedIssueTitle: item.relatedIssueTitle || null,
        relatedUpdateId: item.relatedUpdateId || null,
      },
    };
    console.log("[acceptEvidenceUpdate] delta item:", item);
    console.log("[acceptEvidenceUpdate] overlay created:", overlay);

    const nextOverlays = [...overlays, overlay];
    const nextEvidenceUpdates =
      latestDelta?.evidenceUpdates?.filter((_, i) => i !== index) || [];

    const evidenceEventType =
      item.type === "missing_evidence" || item.type === "evidence_gap"
        ? "evidence_gap_noted"
        : "evidence_added";
    const evidenceEvent = createEvent(
      evidenceEventType,
      "ai_delta",
      { issueId: item.relatedIssueId || null, field: "linkedEvidence" },
      { op: "add", path: "linkedEvidence", value: item.title },
      { summary: item.title, changed: "ראיות", reason: item.description || "", groundedIn: [] }
    );
    evidenceEvent.status = "accepted";
    const nextCaseEvents = [...caseEvents, evidenceEvent];

    setOverlays(nextOverlays);
    setCaseEvents(nextCaseEvents);
    setLatestDelta({ ...latestDelta, evidenceUpdates: nextEvidenceUpdates });
    persistCurrentCase(analysis, { overlays: nextOverlays, caseEvents: nextCaseEvents });
  }

  function rejectEvidenceUpdate(index) {
    const nextEvidenceUpdates =
      latestDelta?.evidenceUpdates?.filter((_, i) => i !== index) || [];
    setLatestDelta({ ...latestDelta, evidenceUpdates: nextEvidenceUpdates });
  }

  function acceptTimelineUpdate(item, index) {
    const normalized = normalizeTimelineDate(item.date);
    const overlay = {
      id: `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      type: "timeline",
      isNew: true,
      patch: {
        action: "add_timeline_event",
        event: item.event || "",
        significance: item.significance || null,
        relatedUpdateId: item.relatedUpdateId || null,
        rawDate: item.date || null,
        displayDate: normalized.displayDate,
        sortDate: normalized.sortDate,
        datePrecision: normalized.datePrecision,
        isApproximate: normalized.isApproximate,
      },
    };
    const nextOverlays = [...overlays, overlay];
    const nextTimelineUpdates =
      latestDelta?.timelineUpdates?.filter((_, i) => i !== index) || [];

    const timelineEvent = createEvent(
      "timeline_event_added",
      "ai_delta",
      { issueId: null, field: "timeline" },
      { op: "add", path: "timeline", value: item.event },
      { summary: item.event || "", changed: "ציר זמן", reason: item.significance || "", groundedIn: [] }
    );
    timelineEvent.status = "accepted";
    const nextCaseEvents = [...caseEvents, timelineEvent];

    setOverlays(nextOverlays);
    setCaseEvents(nextCaseEvents);
    setLatestDelta({ ...latestDelta, timelineUpdates: nextTimelineUpdates });
    persistCurrentCase(analysis, { overlays: nextOverlays, caseEvents: nextCaseEvents });
  }

  function addTimelineEvent(eventData) {
    const overlay = {
      id: `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      type: "timeline",
      isNew: true,
      patch: { action: "add_event", ...eventData },
    };
    const nextOverlays = [...overlays, overlay];
    setOverlays(nextOverlays);
    persistCurrentCase(analysis, { overlays: nextOverlays });
  }

  function editTimelineEvent(targetId, eventData) {
    // Overlay item: update in-place
    const existing = overlays.find((o) => o.id === targetId);
    if (existing) {
      const nextOverlays = overlays.map((o) =>
        o.id === targetId ? { ...o, patch: { ...o.patch, ...eventData } } : o
      );
      setOverlays(nextOverlays);
      persistCurrentCase(analysis, { overlays: nextOverlays });
      return;
    }
    // Base item: create edit_event overlay
    const overlay = {
      id: `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      type: "timeline",
      isNew: false,
      patch: { action: "edit_event", targetId, ...eventData },
    };
    const nextOverlays = [...overlays, overlay];
    setOverlays(nextOverlays);
    persistCurrentCase(analysis, { overlays: nextOverlays });
  }

  function hideTimelineEvent(targetId) {
    const overlay = {
      id: `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      type: "timeline",
      isNew: false,
      patch: { action: "hide_event", targetId },
    };
    const nextOverlays = [...overlays, overlay];
    setOverlays(nextOverlays);
    persistCurrentCase(analysis, { overlays: nextOverlays });
  }

  function rejectTimelineUpdate(index) {
    const nextTimelineUpdates =
      latestDelta?.timelineUpdates?.filter((_, i) => i !== index) || [];
    setLatestDelta({ ...latestDelta, timelineUpdates: nextTimelineUpdates });
  }

  function acceptContradiction(item, index) {
    const overlay = {
      id: `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      type: "contradiction",
      isNew: true,
      sourceDeltaItem: item,
      patch: {
        action: "add_contradiction",
        title: item.title,
        description: item.description,
        severity: item.severity || "medium",
        direction: item.direction || "unclear",
        relatedIssueId: item.relatedIssueId || null,
        relatedIssueTitle: item.relatedIssueTitle || null,
        relatedUpdateId: item.relatedUpdateId || null,
        targetType: item.targetType || "unknown",
        targetId: item.targetId || null,
      },
    };
    const nextOverlays = [...overlays, overlay];
    const nextContradictions =
      latestDelta?.contradictions?.filter((_, i) => i !== index) || [];

    const contradictionEvent = createEvent(
      "contradiction_noted",
      "ai_delta",
      { issueId: item.relatedIssueId || null, field: "annotations.contradictions" },
      { op: "add", path: "annotations.contradictions", value: item.title },
      { summary: item.title, changed: "סתירות", reason: item.description || "", groundedIn: [] }
    );
    contradictionEvent.status = "accepted";
    const nextCaseEvents = [...caseEvents, contradictionEvent];

    setOverlays(nextOverlays);
    setCaseEvents(nextCaseEvents);
    setLatestDelta({ ...latestDelta, contradictions: nextContradictions });
    persistCurrentCase(analysis, { overlays: nextOverlays, caseEvents: nextCaseEvents });
  }

  function rejectContradiction(index) {
    const nextContradictions =
      latestDelta?.contradictions?.filter((_, i) => i !== index) || [];
    setLatestDelta({ ...latestDelta, contradictions: nextContradictions });
  }

  const SUPPORTED_ASSESSMENT_FIELDS = new Set([
    "legalAssessment.summary",
    "legalAssessment.strength",
  ]);

  function acceptAssessmentChange(item, index) {
    const nextChangedAssessments =
      latestDelta?.changedAssessments?.filter((_, i) => i !== index) || [];

    if (!item.field || !SUPPORTED_ASSESSMENT_FIELDS.has(item.field)) {
      setLatestDelta({ ...latestDelta, changedAssessments: nextChangedAssessments });
      return;
    }

    const overlay = {
      id: `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      type: "assessment",
      isNew: true,
      sourceDeltaItem: item,
      patch: {
        action: "update_assessment",
        issueId: item.issueId || null,
        issueTitle: item.issueTitle || null,
        field: item.field,
        previousValue: item.previousValue || null,
        newValue: item.newValue || null,
        reason: item.reason || null,
      },
    };

    const assessmentEvent = createEvent(
      "assessment_changed",
      "ai_delta",
      { issueId: item.issueId || null, field: item.field },
      { op: "replace", path: item.field, value: item.newValue || null, previousValue: item.previousValue || null },
      { summary: `${item.field}: ${item.previousValue ?? "?"} → ${item.newValue ?? "?"}`, changed: "הערכה", reason: item.reason || "", groundedIn: [] }
    );
    assessmentEvent.status = "accepted";

    const nextOverlays = [...overlays, overlay];
    const nextCaseEvents = [...caseEvents, assessmentEvent];

    setOverlays(nextOverlays);
    setCaseEvents(nextCaseEvents);
    setLatestDelta({ ...latestDelta, changedAssessments: nextChangedAssessments });
    persistCurrentCase(analysis, { overlays: nextOverlays, caseEvents: nextCaseEvents });
  }

  function rejectAssessmentChange(index) {
    const nextChangedAssessments =
      latestDelta?.changedAssessments?.filter((_, i) => i !== index) || [];
    setLatestDelta({ ...latestDelta, changedAssessments: nextChangedAssessments });
  }

  function acceptCaseAssessmentChange(item) {
    const overlay = {
      id: `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      type: "case_assessment",
      isNew: true,
      patch: {
        previousLevel: item.previousLevel || null,
        newLevel: item.newLevel || null,
        previousSummary: item.previousSummary || null,
        newSummary: item.newSummary || null,
        reason: item.reason || null,
        overridingFactor: item.overridingFactor || null,
      },
    };

    const caseAssessmentEvent = createEvent(
      "case_assessment_changed",
      "ai_delta",
      {},
      { op: "replace", path: "successAssessment.level", value: item.newLevel || null, previousValue: item.previousLevel || null },
      { summary: `${item.previousLevel ?? "?"} → ${item.newLevel ?? "?"}`, changed: "הערכת סיכויים", reason: item.reason || "", groundedIn: [] }
    );
    caseAssessmentEvent.status = "accepted";

    const nextOverlays = [...overlays, overlay];
    const nextCaseEvents = [...caseEvents, caseAssessmentEvent];

    setOverlays(nextOverlays);
    setCaseEvents(nextCaseEvents);
    setLatestDelta({ ...latestDelta, caseAssessmentChange: null });
    persistCurrentCase(analysis, { overlays: nextOverlays, caseEvents: nextCaseEvents });
  }

  function rejectCaseAssessmentChange() {
    setLatestDelta({ ...latestDelta, caseAssessmentChange: null });
  }

  function addUserIssue({ title, description, importance }) {
    const issueId = `user-issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const event = createEvent(
      "issue_created",
      "user",
      { issueId },
      { op: "add", path: "issues", value: { id: issueId, title } },
      { summary: title, changed: "מחלוקת חדשה", reason: "נוספה ידנית על ידי עורך הדין", groundedIn: [] }
    );
    event.status = "accepted";

    const newIssue = {
      id: issueId,
      title,
      description: description || "",
      importance: importance || "secondary",
      status: "דורש בחינה",
      partyPositions: { claimant: "", defendant: "", coreDispute: "" },
      legalAssessment: { summary: "", strength: "unclear", relevantLaw: [] },
      linkedEvidence: [],
      linkedWitnesses: [],
      missingInfo: [],
      actionItems: { clientQuestions: [], missingEvidence: [], suggestedActions: [] },
      meta: { version: 1, source: "user", createdByEvent: event.id, lastUpdatedByEvent: event.id },
    };

    const nextUserIssues = [...userIssues, newIssue];
    const nextCaseEvents = [...caseEvents, event];
    setUserIssues(nextUserIssues);
    setCaseEvents(nextCaseEvents);
    persistCurrentCase(analysis, { userIssues: nextUserIssues, caseEvents: nextCaseEvents });

    triggerIssueAnalysis(issueId, title, description || "");
  }

  async function triggerIssueAnalysis(issueId, issueTitle, issueDescription) {
    try {
      const res = await fetch("/api/analyze-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issue: { id: issueId, title: issueTitle, description: issueDescription },
          liveCaseState,
          caseText: caseText.slice(0, 4000),
          documentText: documentText.slice(0, 3000),
        }),
      });
      const data = await res.json();
      if (res.ok) handleIssueAnalysisResult(issueId, issueTitle, data);
    } catch {
      // Silent fail — issue is visible without analysis
    }
  }

  function updateIssue(updatedIssue) {
    const changedFields = [];
    if (updatedIssue.title !== undefined) changedFields.push("title");
    if (updatedIssue.description !== undefined) changedFields.push("description");
    if (updatedIssue.importance !== undefined) changedFields.push("importance");

    const overlay = {
      id: `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      type: "issue_updated",
      isNew: false,
      patch: {
        issueId: updatedIssue.id,
        title: updatedIssue.title,
        description: updatedIssue.description,
        importance: updatedIssue.importance,
      },
    };

    const event = createEvent(
      "issue_updated",
      "user",
      { issueId: updatedIssue.id },
      { op: "replace", path: "issues", value: { id: updatedIssue.id } },
      {
        summary: `User updated issue: ${updatedIssue.title}`,
        changed: changedFields.join(", "),
        reason: "עריכה ידנית על ידי עורך הדין",
        groundedIn: [],
      }
    );
    event.status = "accepted";

    const nextOverlays = [...overlays, overlay];
    const nextCaseEvents = [...caseEvents, event];
    setOverlays(nextOverlays);
    setCaseEvents(nextCaseEvents);
    persistCurrentCase(analysis, { overlays: nextOverlays, caseEvents: nextCaseEvents });
  }

  function rollbackOverlay(overlayId) {
    const nextOverlays = overlays.filter((o) => o.id !== overlayId);
    setOverlays(nextOverlays);
    persistCurrentCase(analysis, { overlays: nextOverlays });
  }

  function handleIssueAnalysisResult(issueId, issueTitle, result) {
    const { overlays: newOverlays, events: newEvents, workItems: newWorkItems } =
      buildIssueAnalysisResult(issueId, issueTitle, result);
    const nextOverlays = [...overlays, ...newOverlays];
    const nextCaseEvents = [...caseEvents, ...newEvents];
    const nextAcceptedWorkItems = [...acceptedWorkItems, ...newWorkItems];
    setOverlays(nextOverlays);
    setCaseEvents(nextCaseEvents);
    setAcceptedWorkItems(nextAcceptedWorkItems);
    persistCurrentCase(analysis, {
      overlays: nextOverlays,
      caseEvents: nextCaseEvents,
      acceptedWorkItems: nextAcceptedWorkItems,
    });
  }

  function renderWorkspaceView() {
    switch (activeView) {
      case "pleadings":
        return <EvidenceView overlays={overlays} onRollback={rollbackOverlay} />;

      case "discovery":
        return <WitnessesView />;

      case "proofs":
        return <EvidenceView overlays={overlays} onRollback={rollbackOverlay} />;

      case "summaries":
        return <WitnessesView />;

      case "timeline":
        return (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm w-full">
            <div className="p-6 pb-3">
              <h2 className="text-xl font-bold">ציר זמן</h2>
            </div>

            <div className="w-full overflow-x-auto overscroll-x-contain px-6 pb-6">
              <HorizontalTimeline
                items={analysis?.evidenceAndGaps?.timeline || []}
                overlayItems={overlays.filter((o) => o.type === "timeline")}
                onRollback={rollbackOverlay}
                onAddEvent={addTimelineEvent}
                onEditEvent={editTimelineEvent}
                onHideEvent={hideTimelineEvent}
              />
            </div>
          </div>
        );
case "case-map":
default:
  return (
    <div className="space-y-4">
      <IssuesView
        analysis={analysis}
        issues={liveCaseState?.issues ?? null}
        onUpdateIssue={updateIssue}
        onWorkspaceUpdate={handleWorkspaceUpdate}
        userIssues={userIssues}
        onAddUserIssue={addUserIssue}
        onRollbackOverlay={rollbackOverlay}
        onRemoveWorkItem={removeAcceptedWorkItem}
      />

      <UnscopedFallback
        evidenceOverlays={getUnscopedEvidenceOverlays(overlays, normalizeIssues(analysis))}
        workItems={getUnscopedWorkItems(acceptedWorkItems)}
        contradictionOverlays={getUnscopedContradictionOverlays(overlays, normalizeIssues(analysis))}
        onRollbackOverlay={rollbackOverlay}
        onRemoveWorkItem={removeAcceptedWorkItem}
      />
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

        <div className="flex-1 min-w-0 p-6 bg-[#f4f8fd]">
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

                <button
                  onClick={handleOpenNewCase}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  פתח תיק חדש
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
  onReanalyze={() => runIncrementalAnalysis()}
  loading={loading}
/>
            )}

            <WorkspaceHeader activeView={activeView} />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
                {error}
              </div>
            )}

{latestDelta && showDeltaPanel && activeView === "case-map" && (
<DeltaNotificationPanel
  delta={latestDelta}
  onClose={() => setShowDeltaPanel(false)}
  onAcceptWorkItem={acceptGeneratedWorkItem}
  onRejectWorkItem={rejectGeneratedWorkItem}
  onAcceptEvidenceUpdate={acceptEvidenceUpdate}
  onRejectEvidenceUpdate={rejectEvidenceUpdate}
  onAcceptTimelineUpdate={acceptTimelineUpdate}
  onRejectTimelineUpdate={rejectTimelineUpdate}
  onAcceptContradiction={acceptContradiction}
  onRejectContradiction={rejectContradiction}
  onAcceptAssessmentChange={acceptAssessmentChange}
  onRejectAssessmentChange={rejectAssessmentChange}
  onAcceptCaseAssessmentChange={acceptCaseAssessmentChange}
  onRejectCaseAssessmentChange={rejectCaseAssessmentChange}
/>
)}
            <main key={currentCaseId} id="results" className="space-y-4 min-w-0">
              {activeView === "case-map" &&
                analysis?.executiveView?.successAssessment && (
                  <SuccessAssessment
                    assessment={analysis.executiveView.successAssessment}
                    overlays={overlays}
                    onRollbackOverlay={rollbackOverlay}
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

function UnscopedFallback({
  evidenceOverlays,
  workItems,
  contradictionOverlays = [],
  onRollbackOverlay,
  onRemoveWorkItem,
}) {
  if (!evidenceOverlays.length && !workItems.length && !contradictionOverlays.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="font-bold text-slate-900 mb-1">עדכונים שלא שויכו למחלוקת</div>
      <div className="text-xs text-slate-500 mb-3">
        עדכונים אלו לא קושרו לאף מחלוקת ספציפית
      </div>

      <div className="space-y-2">
        {evidenceOverlays.map((overlay) => (
          <div
            key={overlay.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2.5"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                  {translateEvidenceType(overlay.patch.evidenceType)}
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {overlay.patch.title}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {overlay.patch.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRollbackOverlay?.(overlay.id)}
              className="shrink-0 text-xs text-slate-400 hover:text-red-500"
            >
              בטל
            </button>
          </div>
        ))}

        {workItems.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
          >
            <div>
              <div className="text-sm font-semibold text-slate-900">{item.title}</div>
              {item.description && (
                <p className="mt-1 text-xs leading-5 text-slate-600">{item.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onRemoveWorkItem?.(item.id)}
              className="shrink-0 text-xs text-slate-400 hover:text-red-500"
            >
              מחק
            </button>
          </div>
        ))}

        {contradictionOverlays.map((overlay) => (
          <div
            key={overlay.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-red-100 bg-red-50/40 px-3 py-2.5"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                  סתירות שלא שויכו למחלוקת
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {overlay.patch.title}
                </span>
              </div>
              {overlay.patch.description && (
                <p className="mt-1 text-xs leading-5 text-slate-600">{overlay.patch.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onRollbackOverlay?.(overlay.id)}
              className="shrink-0 text-xs text-slate-400 hover:text-red-500"
            >
              בטל
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}