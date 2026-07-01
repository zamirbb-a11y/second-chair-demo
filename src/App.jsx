import React, { useEffect, useMemo, useRef, useState } from "react";

import AnalysisLoadingOverlay from "./components/AnalysisLoadingOverlay";
import CaseIntake from "./components/CaseIntake";
import CollapsedCaseHeader from "./components/CollapsedCaseHeader";

import generateAnalysisDiff from "./utils/generateAnalysisDiff";

import WorkspaceSidebar from "./components/layout/WorkspaceSidebar";
import WorkspaceHeader from "./components/layout/WorkspaceHeader";

// v2 layout components
import AppNav from "./components/v2/AppNav";
import DisputeNavigator from "./components/v2/DisputeNavigator";
import CaseOverview from "./views/v2/CaseOverview";
import DisputeDetail from "./views/v2/DisputeDetail";

import IssuesView from "./views/IssuesView";
import EvidenceView from "./views/EvidenceView";
import WitnessesView from "./views/WitnessesView";

import PrecedentBankManager from "./admin/PrecedentBankManager";
import AdminPanel from "./admin/AdminPanel";

import HorizontalTimeline from "./components/HorizontalTimeline";
import SuccessAssessment from "./components/SuccessAssessment";
import DeltaNotificationPanel from "./components/DeltaNotificationPanel";
import PreIntakePanel from "./components/PreIntakePanel";
import NewCaseWizard from "./components/NewCaseWizard";
import CaseChatPanel from "./components/CaseChatPanel";
import FeedbackModal from "./components/FeedbackModal";
import AuthScreen from "./components/AuthScreen";
import { useAuthSession } from "./hooks/useAuthSession";
import { supabase } from "./lib/supabaseClient";

import {
  createCaseId,
  saveCase,
  loadCase,
  listCases,
  deleteCase,
  syncFromSupabase,
  getSyncStatus,
  onSyncStatusChange,
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
import posthog from "posthog-js";
import { uploadFileViaStorage, uploadFilesViaStorage } from "./utils/uploadViaStorage";

function buildIssueAnalysisResult(issueId, issueTitle, result, isNew = true) {
  const id = () => `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const overlays = [];
  const events = [];
  const workItems = [];

  if (result.claimantPosition || result.defendantPosition) {
    const partyPositions = {
      ...(result.claimantPosition ? { claimant: result.claimantPosition } : {}),
      ...(result.defendantPosition ? { defendant: result.defendantPosition } : {}),
    };
    overlays.push({
      id: id(),
      createdAt: now,
      type: "issue_updated",
      isNew: false,
      patch: { issueId, partyPositions },
    });
  }

  if (result.legalAssessment?.summary) {
    overlays.push({
      id: id(),
      createdAt: now,
      type: "assessment",
      isNew,
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
      isNew,
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
      isNew,
      patch: {
        action: "add_evidence_update",
        evidenceType: item.type,
        title: item.title,
        description: item.description,
        benefitsParty: item.benefitsParty ?? "claimant",
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
      isNew,
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
      isNew,
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
  const [adversarialReviews, setAdversarialReviews] = useState({});
  const adversarialReviewsRef = useRef({});
  useEffect(() => { adversarialReviewsRef.current = adversarialReviews; }, [adversarialReviews]);
  // Sync refs for overlay arrays — updated both by useEffect (general) and synchronously inside
  // handleIssueAnalysisResult to prevent lost writes from concurrent per-issue callbacks.
  const overlaysRef = useRef([]);
  // Issue IDs that need adversarial re-analysis after delta acceptance.
  const pendingReanalysisRef = useRef(new Set());
  const caseEventsRef = useRef([]);
  const acceptedWorkItemsRef = useRef([]);
  useEffect(() => { overlaysRef.current = overlays; }, [overlays]);
  useEffect(() => { caseEventsRef.current = caseEvents; }, [caseEvents]);
  useEffect(() => { acceptedWorkItemsRef.current = acceptedWorkItems; }, [acceptedWorkItems]);
  const [lastAnalyzedCaseText, setLastAnalyzedCaseText] = useState("");
  const [showDeltaPanel, setShowDeltaPanel] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState("initial"); // "initial" | "update"
  const [adversarialLoading, setAdversarialLoading] = useState(new Set());
  const [preIntakeLoading, setPreIntakeLoading] = useState(false);
  const [preIntakeQuestions, setPreIntakeQuestions] = useState([]);
  const [preIntakeDetectedParties, setPreIntakeDetectedParties] = useState([]);
  const [showPreIntake, setShowPreIntake] = useState(false);
  const [clientRole, setClientRole] = useState("claimant"); // "claimant" | "defendant"
  const [clientName, setClientName] = useState("");
  const [error, setError] = useState("");
  const [intakeExpanded, setIntakeExpanded] = useState(true);

  const [workspaceUpdates, setWorkspaceUpdates] = useState([]);
  const [activeView, setActiveView] = useState("case-map");

  const [entryMode, setEntryMode] = useState(null);
  const [savedCases, setSavedCases] = useState([]);
  const [showWizard, setShowWizard] = useState(false);
  const [currentCaseId, setCurrentCaseId] = useState(null);
  const [authModal, setAuthModal] = useState(null); // null | "login" | "signup"
  const [switchUserModal, setSwitchUserModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState(getSyncStatus);
  const [showSaved, setShowSaved] = useState(false);

  const session = useAuthSession();

  // v2: selected dispute (null = overview)
  const [selectedIssueId, setSelectedIssueId] = useState(null);


  // Case chat
  const [showCaseChat, setShowCaseChat] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [chatIssueContext, setChatIssueContext] = useState(null); // { id, title } | null
  const [caseChatHistory, setCaseChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  const chatSendingRef = useRef(false); // prevents double-send before isLoading propagates

  // Persist chat history per case (must be after caseChatHistory + currentCaseId are declared)
  useEffect(() => {
    if (currentCaseId && caseChatHistory.length > 0) {
      try { localStorage.setItem(`secondChair.chat.${currentCaseId}`, JSON.stringify(caseChatHistory)); } catch { /* ignore */ }
    }
  }, [caseChatHistory, currentCaseId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-show chat panel whenever analysis becomes available
  useEffect(() => {
    if (analysis) setShowCaseChat(true);
  }, [analysis]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!session?.user?.id) return;
    posthog.identify(session.user.id, { email: session.user.email });
    syncFromSupabase(session.user.id).then(() => setSavedCases(listCases()));
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to cloud sync status updates from caseStorage
  useEffect(() => onSyncStatusChange(setSyncStatus), []);

  // Auto-hide the "saved" indicator after 3 seconds
  useEffect(() => {
    if (syncStatus.state !== "saved") return;
    setShowSaved(true);
    const t = setTimeout(() => setShowSaved(false), 3000);
    return () => clearTimeout(t);
  }, [syncStatus.state, syncStatus.lastSavedAt]);

  // Persist chat history whenever it changes (debounced cloud save via persistCurrentCase)
  useEffect(() => {
    if (!currentCaseId || !caseChatHistory.length) return;
    persistCurrentCase();
  }, [caseChatHistory]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (session === undefined || entryMode) return;
    const { pathname } = window.location;
    if (pathname === '/precedents' || pathname === '/admin') return; // admin routes — no redirect
    const action = new URLSearchParams(window.location.search).get('action');
    if (!action) {
      window.location.href = '/landing.html';
      return;
    }
    if (action === 'login' && !session) {
      window.history.replaceState({}, '', '/');
      setAuthModal('login');
      return;
    }
    if (action === 'signup' && !session) {
      window.history.replaceState({}, '', '/');
      setAuthModal('signup');
      return;
    }
    if (action === 'new') {
      window.history.replaceState({}, '', '/');
      setShowWizard(true);
    }
    if (action === 'open') {
      const caseId = new URLSearchParams(window.location.search).get('caseId');
      if (caseId) {
        window.history.replaceState({}, '', '/');
        openSavedCase(caseId);
        return;
      }
      // no caseId: fall through — JSX renders the cases list
    }
  }, [session, entryMode]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Auto-trigger per-issue analysis after a new main analysis lands.
  // Runs in a useEffect so closures are fresh (liveCaseState, overlays, etc. all reflect the
  // new analysis). skipAdversarial=true because adversarial data already arrived in the main call.
  const triggeredAnalysisRef = useRef(null);
  useEffect(() => {
    if (!analysis?.issues?.length) return;
    const sig = analysis.issues.map(i => i.id).join(',');
    if (triggeredAnalysisRef.current === sig) return;
    triggeredAnalysisRef.current = sig;
    analysis.issues.forEach(issue => {
      if (issue.id && issue.title) {
        triggerIssueAnalysis(issue.id, issue.title, issue.description || "", clientRole, true);
      }
    });
  }, [analysis]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-run adversarial for issues affected by accepted delta changes.
  // Fires after liveCaseState updates (so new overlays are reflected in the API call).
  useEffect(() => {
    if (!pendingReanalysisRef.current.size || !liveCaseState?.issues?.length) return;
    const toAnalyze = [...pendingReanalysisRef.current];
    pendingReanalysisRef.current = new Set();
    toAnalyze.forEach(issueId => {
      const issue = liveCaseState.issues.find(i => i.id === issueId);
      if (issue?.title) triggerIssueAnalysis(issueId, issue.title, issue.description || "", clientRole, false);
    });
  }, [liveCaseState]); // eslint-disable-line react-hooks/exhaustive-deps

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-[#eef0f4] flex items-center justify-center">
        <div className="text-slate-400 text-sm">טוען…</div>
      </div>
    );
  }

  if (authModal && !session) {
    return <AuthScreen initialMode={authModal} />;
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
      adversarialReviews: overrides.adversarialReviews ?? adversarialReviewsRef.current,
      lastAnalyzedCaseText:
  overrides.lastAnalyzedCaseText ?? lastAnalyzedCaseText,
      clientRole: overrides.clientRole ?? clientRole,
      clientName: overrides.clientName ?? clientName,
      caseChatHistory: overrides.caseChatHistory ?? caseChatHistory,
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
    // Pre-fill triggeredAnalysisRef so per-issue analysis doesn't re-run on load
    // (overlays already contain the results from the previous session).
    if (loaded.analysis?.issues?.length) {
      triggeredAnalysisRef.current = loaded.analysis.issues.map(i => i.id).join(',');
    }
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
    setAdversarialReviews(loaded.adversarialReviews || {});
    setLatestDelta(null);
    setShowDeltaPanel(false);
    setLastAnalyzedCaseText(loaded.lastAnalyzedCaseText || "");
    setClientRole(loaded.clientRole || loaded.analysis?.clientRole || "claimant");
    setClientName(loaded.clientName || "");
    setEntryMode("existing");
    setIntakeExpanded(!loaded.analysis);
    setStatus("");
    setError("");
    setShowWizard(false);
    setChatIssueContext(null);
    setShowCaseChat(false);
    // Prefer chat history embedded in the case blob; fall back to the legacy separate key
    let chat = loaded.caseChatHistory || [];
    if (!chat.length) {
      try {
        const legacy = localStorage.getItem(`secondChair.chat.${caseId}`);
        if (legacy) chat = JSON.parse(legacy);
      } catch { /* ignore */ }
    }
    setCaseChatHistory(chat);
  }

  function handleWizardComplete({ caseName: wCaseName, caseText: wCaseText, processedFiles, clientName: wClientName, clientRole: wClientRole, answers }) {
    triggeredAnalysisRef.current = null;
    const newId = createCaseId();
    setCurrentCaseId(newId);
    setCaseName(wCaseName);
    setClientName(wClientName);
    if (wClientRole) setClientRole(wClientRole);
    setCaseText(wCaseText);
    setCaseFiles(processedFiles);
    setUploadedFiles(processedFiles.map(f => ({ name: f.name, size: f.size, status: f.status, type: f.type })));
    const extractedTexts = processedFiles.filter(f => f.text?.trim()).map(f => `--- ${f.name} ---\n${f.text}`);
    const docText = extractedTexts.join("\n\n");
    setDocumentText(docText);
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
    setIntakeExpanded(false);
    setEntryMode("new");
    setActiveView("case-map");
    setShowWizard(false);
    setCaseChatHistory([]);
    setChatIssueContext(null);
    setShowCaseChat(false);

    const fullCaseText = [wCaseText, docText].filter(Boolean).join("\n\n");
    const extraText = answers
      .filter(a => a.text?.trim())
      .map(a => `שאלה: ${a.question}\nתשובה: ${a.text}`)
      .join("\n\n");
    runFullAnalysis(extraText, wClientName, wClientRole, fullCaseText, processedFiles, docText);
  }

  function handleOpenNewCase() {
    triggeredAnalysisRef.current = null;
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
    setEntryMode("new");
    setShowWizard(true);
    setCaseChatHistory([]);
    setChatIssueContext(null);
    setShowCaseChat(false);
  }

  // ── Case chat ─────────────────────────────────────────────────────────────

  function openChatForIssue(issueId, issueTitle) {
    setChatIssueContext(issueId ? { id: issueId, title: issueTitle } : null);
    setShowCaseChat(true);
  }

  function buildChatContext() {
    if (!liveCaseState) return "";
    const lines = [];
    const { issues = [], successAssessment } = liveCaseState;
    const roleLabel = clientRole === "defendant" ? "נתבע" : "תובע";
    lines.push(`לקוח: ${clientName || "לא צוין"} | תפקיד: ${roleLabel}`);
    if (successAssessment?.summary) {
      lines.push(`הערכת סיכויים: ${successAssessment.level || ""} — ${successAssessment.summary}`);
    }
    lines.push("\n=== מחלוקות ===");
    issues.forEach((issue) => {
      const strength = issue.effectiveLegal?.strength || "לא ידוע";
      lines.push(`• [${issue.id}] ${issue.title} | חוזק: ${strength}`);
      if (issue.effectiveLegal?.summary) {
        lines.push(`  ${issue.effectiveLegal.summary.slice(0, 130)}`);
      }
      if (issue.partyPositions?.claimant) {
        lines.push(`  עמדתנו: ${issue.partyPositions.claimant.slice(0, 100)}`);
      }
      const evidenceCount = (issue.overlays?.evidence ?? []).length;
      if (evidenceCount > 0) lines.push(`  ראיות מצורפות: ${evidenceCount}`);
    });
    const precedents = analysis?.retrievedPrecedents;
    if (precedents?.length) {
      lines.push("\n=== פסיקה ===");
      precedents.slice(0, 8).forEach((p) => {
        const name = p.shortName || p.title || p.caseNumber || "";
        const ratio = p.miniRatio || p.relevance || "";
        lines.push(`• ${name}${ratio ? `: ${ratio.slice(0, 80)}` : ""} | עוזרת: ${p.helps || "?"}`);
      });
    }
    const openWork = acceptedWorkItems.slice(-10);
    if (openWork.length) {
      lines.push("\n=== פעולות פתוחות ===");
      openWork.forEach((w) => lines.push(`• ${w.title} (${w.type || ""})`));
    }
    return lines.join("\n");
  }

  function buildIssueContext(issueId) {
    if (!issueId || !liveCaseState) return null;
    const issue = liveCaseState.issues?.find((i) => i.id === issueId);
    if (!issue) return null;
    const lines = [];
    lines.push(`כותרת: ${issue.title}`);
    if (issue.description) lines.push(`תיאור: ${issue.description}`);
    lines.push(`חוזק: ${issue.effectiveLegal?.strength || "לא ידוע"}`);
    if (issue.effectiveLegal?.summary) lines.push(`ניתוח: ${issue.effectiveLegal.summary}`);
    if (issue.partyPositions?.claimant) lines.push(`עמדתנו: ${issue.partyPositions.claimant}`);
    if (issue.partyPositions?.defendant) lines.push(`עמדת הצד שכנגד: ${issue.partyPositions.defendant}`);
    const evidence = [
      ...(issue.linkedEvidence ?? []).map((e) => (typeof e === "string" ? e : e.title)).filter(Boolean),
      ...(issue.overlays?.evidence ?? []).map((e) => e.patch?.title || "").filter(Boolean),
    ];
    if (evidence.length) lines.push(`ראיות: ${evidence.join(", ")}`);
    const contradictions = (issue.overlays?.contradictions ?? []).map((c) => c.patch?.title || "").filter(Boolean);
    if (contradictions.length) lines.push(`סתירות: ${contradictions.join(", ")}`);
    return lines.join("\n");
  }

  async function handleChatMessage(message) {
    if (chatSendingRef.current) return;
    chatSendingRef.current = true;

    const userMsg = {
      id: `cm_${Date.now()}_u`,
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };
    setCaseChatHistory((prev) => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const res = await fetch("/api/case-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          chatHistory: caseChatHistory.slice(-8).map((m) => ({
            role: m.role,
            content: m.content,
            raw: m.raw,
          })),
          caseContext: buildChatContext(),
          issueContext: chatIssueContext ? buildIssueContext(chatIssueContext.id) : null,
          clientName,
          clientRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Surface the actual OpenAI error message when available
        const openaiMsg = typeof data?.details === "object"
          ? (data.details?.error?.message || JSON.stringify(data.details))
          : data?.details;
        const detail = openaiMsg || data?.error || `שגיאת שרת ${res.status}`;
        throw new Error(detail);
      }
      const aiMsg = {
        id: `cm_${Date.now()}_a`,
        role: "assistant",
        content: (data.sections ?? []).map((s) => s.content).join("\n\n"),
        sections: data.sections ?? [],
        sources: data.sources ?? [],
        proposedUpdates: data.proposedUpdates ?? [],
        limitations: data.limitations ?? [],
        nextBestActions: data.nextBestActions ?? [],
        raw: data,
        timestamp: new Date().toISOString(),
      };
      setCaseChatHistory((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("chat error:", err);
      setCaseChatHistory((prev) => [
        ...prev,
        {
          id: `cm_${Date.now()}_err`,
          role: "assistant",
          errorText: err?.message || "שגיאה לא ידועה",
          sections: [],
          sources: [],
          proposedUpdates: [],
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setChatLoading(false);
      chatSendingRef.current = false;
    }
  }

  function resolveTargetIssue(update) {
    const issues = liveCaseState?.issues ?? [];
    if (!issues.length) return null;

    const pick = (issue) => ({ id: issue.id, title: issue.title, description: issue.description || "" });

    // 1. Chat opened from within a specific issue card
    if (chatIssueContext?.id) {
      const found = issues.find(i => i.id === chatIssueContext.id);
      if (found) return pick(found);
    }
    // 2. Issue currently selected/open on screen
    if (selectedIssueId) {
      const found = issues.find(i => i.id === selectedIssueId);
      if (found) return pick(found);
    }
    // 3. AI included a matching issueId
    if (update.data?.issueId) {
      const found = issues.find(i => i.id === update.data.issueId);
      if (found) return pick(found);
    }
    // 4. Keyword match — always falls back to issues[0]
    const needle = `${update.data?.title || ""} ${update.description || ""}`.toLowerCase();
    const words = needle.split(/\s+/).filter(w => w.length > 2);
    let best = issues[0];
    let bestScore = 0;
    for (const issue of issues) {
      const haystack = `${issue.title || ""} ${issue.description || ""}`.toLowerCase();
      const score = words.filter(w => haystack.includes(w)).length;
      if (score > bestScore) { bestScore = score; best = issue; }
    }
    return pick(best);
  }

  async function handleAcceptChatUpdate(update) {
    const target = resolveTargetIssue(update);
    if (!target) return;

    // Remove from chat history so it doesn't reappear after reload
    setCaseChatHistory(prev => prev.map(msg =>
      msg.proposedUpdates?.length
        ? { ...msg, proposedUpdates: msg.proposedUpdates.filter(u => u.id !== update.id) }
        : msg
    ));

    setActiveView("case-map");
    setSelectedIssueId(target.id);

    const { type, data: uData, description } = update;
    const title = uData?.title || description || "";
    const desc  = uData?.description || "";
    const allIssues = liveCaseState?.issues ?? [];

    // Ask AI which issues are relevant — fallback to primary only
    let relevantIds = [target.id];
    try {
      const res = await fetch("/api/check-relevance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: { type, title, description: desc },
          issues: allIssues.map(i => ({ id: i.id, title: i.title, description: i.description || "" })),
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const ids = json.relevantIssueIds ?? [];
        relevantIds = ids.length ? ids : [target.id];
        if (!relevantIds.includes(target.id)) relevantIds.push(target.id);
      }
    } catch { /* fallback to primary */ }

    // Build delta entries for every relevant issue
    const newEvidenceUpdates = [];
    const newWorkItems = [];
    const newContradictions = [];

    relevantIds.forEach(issueId => {
      const issue = allIssues.find(i => i.id === issueId) ?? { id: issueId, title: "" };

      if (type === "new_evidence") {
        newEvidenceUpdates.push({
          type: uData?.type || "new_evidence",
          title,
          description: desc,
          benefitsParty: uData?.benefitsParty || "claimant",
          relatedIssueId: issue.id,
          relatedIssueTitle: issue.title,
        });
      } else if (type === "new_work_item") {
        newWorkItems.push({
          type: uData?.type || "suggested_action",
          title,
          description: desc,
          priority: uData?.priority || "medium",
          relatedIssueId: issue.id,
          relatedIssueTitle: issue.title,
        });
      } else if (type === "new_question") {
        newWorkItems.push({
          type: "client_question",
          title,
          description: desc,
          priority: "medium",
          relatedIssueId: issue.id,
          relatedIssueTitle: issue.title,
        });
      } else if (type === "new_contradiction") {
        newContradictions.push({
          title,
          description: desc,
          severity: uData?.severity || "medium",
          direction: uData?.direction || "unclear",
          relatedIssueId: issue.id,
          relatedIssueTitle: issue.title,
        });
      }
    });

    setLatestDelta(prev => ({
      ...(prev ?? {}),
      evidenceUpdates:    [...(prev?.evidenceUpdates    ?? []), ...newEvidenceUpdates],
      generatedWorkItems: [...(prev?.generatedWorkItems ?? []), ...newWorkItems],
      contradictions:     [...(prev?.contradictions     ?? []), ...newContradictions],
    }));
  }

  // eslint-disable-next-line no-unused-vars
  function handleRejectChatUpdate(_updateId) {
    // Client-side dismissal is handled inside CaseChatPanel via local state
  }

  // ── End case chat ──────────────────────────────────────────────────────────

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

  if (window.location.pathname === "/precedents") return <PrecedentBankManager />;
  if (window.location.pathname === "/admin") return <AdminPanel />;

  if (!entryMode) {
    const landingAction = new URLSearchParams(window.location.search).get('action');
    if (!landingAction && !showWizard) return null; // useEffect is redirecting to /landing.html

    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#eef4fb] flex items-center justify-center p-6"
      >
        {showWizard && (
          <NewCaseWizard
            onComplete={handleWizardComplete}
            onCancel={() => setShowWizard(false)}
          />
        )}
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

            <button
              onClick={() => setShowWizard(true)}
              className="w-full rounded-2xl border border-slate-200 bg-white text-slate-700 py-3 text-base font-medium hover:bg-slate-50 transition"
            >
              + תיק חדש
            </button>

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

  async function handleWordUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setStatus("מעלה ומעבד את הקבצים...");
    setError("");

    try {
      const processedFiles = await uploadFilesViaStorage(files, session?.access_token);

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

async function handleInfoAndReanalyze(update) {
  const enrichedUpdate = {
    id: `update-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: update.type || "case_text_update",
    targetType: update.targetType || "issue",
    targetId: update.targetId || null,
    title: update.title || "מידע חדש",
    text: update.text || "",
    createdAt: new Date().toISOString(),
    status: "pending_analysis",
  };
  const nextUpdates = [enrichedUpdate, ...workspaceUpdates];
  setWorkspaceUpdates(nextUpdates);
  persistCurrentCase(analysis, { workspaceUpdates: nextUpdates });
  await runIncrementalAnalysis(nextUpdates);
}

async function handleIssueFileUpload(file, issueId, contextTitle) {
  setLoading(true);
  setLoadingMode("update");
  setError("");
  try {
    const processed = await uploadFileViaStorage(file, session?.access_token);
    if (!processed?.text?.trim()) {
      setError("לא הצלחתי לחלץ טקסט מהקובץ.");
      setLoading(false);
      return;
    }
    const update = {
      id: `update-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "new_document",
      targetType: "issue",
      targetId: issueId,
      title: contextTitle || `מסמך: ${processed.name}`,
      text: processed.text,
      createdAt: new Date().toISOString(),
      status: "pending_analysis",
    };
    const nextUpdates = [update, ...workspaceUpdates];
    setWorkspaceUpdates(nextUpdates);
    persistCurrentCase(analysis, { workspaceUpdates: nextUpdates });
    await runIncrementalAnalysis(nextUpdates);
  } catch (err) {
    console.error(err);
    setError("לא הצלחתי להעלות את הקובץ.");
    setLoading(false);
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
    setClientRole("claimant");
    setPreIntakeLoading(true);
    setError("");
    try {
      const res = await fetch("/api/pre-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseText: buildCaseTextForAnalysis(),
          documentText,
          files: caseFiles,
          clientName,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreIntakeQuestions(data.intakeQuestions ?? []);
        setPreIntakeDetectedParties(data.detectedParties ?? []);
      } else {
        setPreIntakeQuestions([]);
        setPreIntakeDetectedParties([]);
      }
    } catch {
      setPreIntakeQuestions([]);
      setPreIntakeDetectedParties([]);
    }
    setPreIntakeLoading(false);
    setShowPreIntake(true);
  }

  function handlePreIntakeContinue({ answers = [], clientName: newClientName, clientRole: newClientRole }) {
    if (newClientName) setClientName(newClientName);
    if (newClientRole) setClientRole(newClientRole);
    const extraText = answers
      .filter((a) => a.text?.trim())
      .map((a) => `שאלה: ${a.question}\nתשובה: ${a.text}`)
      .join("\n\n");
    setPreIntakeQuestions([]);
    setPreIntakeDetectedParties([]);
    setShowPreIntake(false);
    runFullAnalysis(extraText, newClientName || clientName, newClientRole || clientRole);
  }

  async function runFullAnalysis(extraText = "", overrideClientName, overrideClientRole, overrideBaseCaseText, overrideFiles, overrideDocumentText) {
    const effectiveClientName = overrideClientName ?? clientName;
    const effectiveClientRole = overrideClientRole ?? clientRole;
    const effectiveDocumentText = overrideDocumentText ?? documentText;
    const effectiveFiles = overrideFiles ?? caseFiles;

    setLoading(true);
    setLoadingMode("initial");
    setShowPreIntake(false);
    setError("");

    try {
      if (analysis) {
        setPreviousAnalysis(analysis);
      }

      const baseCaseText = overrideBaseCaseText ?? buildCaseTextForAnalysis();
      const enrichedCaseText = extraText.trim()
        ? `${baseCaseText}\n\n---\n\nמידע נוסף שהתקבל לפני הניתוח:\n${extraText}`
        : baseCaseText;

      posthog.capture("analysis_started", { clientName: effectiveClientName });

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caseText: enrichedCaseText,
          documentText: effectiveDocumentText,
          files: effectiveFiles,
          clientName: effectiveClientName,
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
      // Honor user's manual selection; fall back to AI inference only if no override was provided
      if (data.clientRole && !overrideClientRole) setClientRole(data.clientRole);
      if (data.adversarialReviews) {
        setAdversarialReviews(data.adversarialReviews);
        adversarialReviewsRef.current = data.adversarialReviews;
      }

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
  setLoadingMode("update");
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

    const allowedIssues = [
      ...normalizeIssues(analysis).map((issue) => ({ id: issue.id, title: issue.title })),
      ...userIssues.map((issue) => ({ id: issue.id, title: issue.title })),
    ];

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
function normQ(t) { return (t ?? "").trim().replace(/\s+/g, " ").replace(/[?!.،]+$/, "").toLowerCase(); }

function isQuestionAlreadyAnswered(item) {
  if (item.type !== "client_question") return false;
  const issue = liveCaseState?.issues?.find(i => i.id === item.relatedIssueId || i.title === item.relatedIssueTitle);
  if (!issue?.answeredQuestions?.size) return false;
  const n = normQ(item.title);
  return [...issue.answeredQuestions].some(q => normQ(q) === n);
}

function acceptGeneratedWorkItem(item, index) {
  if (isQuestionAlreadyAnswered(item)) {
    rejectGeneratedWorkItem(index);
    return;
  }
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

  function acceptAllPendingUpdates({ assessments = [], evidence = [], contradictions = [], workItems = [] }) {
    const now = new Date().toISOString();
    const idGen = () => `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newOverlays = [];
    const newEvents = [];
    const newAcceptedWorkItems = [];

    for (const { item } of evidence) {
      newOverlays.push({ id: idGen(), createdAt: now, type: "evidence", isNew: true, sourceDeltaItem: item, patch: { action: "add_evidence_update", evidenceType: item.type, title: item.title, description: item.description, benefitsParty: item.benefitsParty ?? "claimant", relatedIssueId: item.relatedIssueId || null, relatedIssueTitle: item.relatedIssueTitle || null, relatedUpdateId: item.relatedUpdateId || null } });
      const evType = item.type === "missing_evidence" || item.type === "evidence_gap" ? "evidence_gap_noted" : "evidence_added";
      const e = createEvent(evType, "ai_delta", { issueId: item.relatedIssueId || null, field: "linkedEvidence" }, { op: "add", path: "linkedEvidence", value: item.title }, { summary: item.title, changed: "ראיות", reason: item.description || "", groundedIn: [] });
      e.status = "accepted"; newEvents.push(e);
    }

    for (const { item } of contradictions) {
      newOverlays.push({ id: idGen(), createdAt: now, type: "contradiction", isNew: true, sourceDeltaItem: item, patch: { action: "add_contradiction", title: item.title, description: item.description, severity: item.severity || "medium", direction: item.direction || "unclear", relatedIssueId: item.relatedIssueId || null, relatedIssueTitle: item.relatedIssueTitle || null, relatedUpdateId: item.relatedUpdateId || null, targetType: item.targetType || "unknown", targetId: item.targetId || null } });
      const e = createEvent("contradiction_noted", "ai_delta", { issueId: item.relatedIssueId || null, field: "annotations.contradictions" }, { op: "add", path: "annotations.contradictions", value: item.title }, { summary: item.title, changed: "סתירות", reason: item.description || "", groundedIn: [] });
      e.status = "accepted"; newEvents.push(e);
    }

    for (const { item } of assessments) {
      if (!item.field || !SUPPORTED_ASSESSMENT_FIELDS.has(item.field)) continue;
      newOverlays.push({ id: idGen(), createdAt: now, type: "assessment", isNew: true, sourceDeltaItem: item, patch: { action: "update_assessment", issueId: item.issueId || null, issueTitle: item.issueTitle || null, field: item.field, previousValue: item.previousValue || null, newValue: item.newValue || null, reason: item.reason || null } });
      const e = createEvent("assessment_changed", "ai_delta", { issueId: item.issueId || null, field: item.field }, { op: "replace", path: item.field, value: item.newValue || null, previousValue: item.previousValue || null }, { summary: `${item.field}: ${item.previousValue ?? "?"} → ${item.newValue ?? "?"}`, changed: "הערכה", reason: item.reason || "", groundedIn: [] });
      e.status = "accepted"; newEvents.push(e);
    }

    for (const { item } of workItems) {
      if (isQuestionAlreadyAnswered(item)) continue;
      newAcceptedWorkItems.push({ ...item, id: item.id || `work-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, status: "accepted", acceptedAt: now });
      const e = createEvent("work_item_created", "ai_delta", { issueId: item.relatedIssueId || null, field: null }, { op: "add", path: "workItems", value: item.title }, { summary: item.title, changed: "משימות", reason: item.description || item.reason || "", groundedIn: [] });
      e.status = "accepted"; newEvents.push(e);
    }

    const nextOverlays = [...overlays, ...newOverlays];
    const nextCaseEvents = [...caseEvents, ...newEvents];
    const nextAcceptedWorkItems = [...acceptedWorkItems, ...newAcceptedWorkItems];

    const evidenceIdxs  = new Set(evidence.map(e => e.index));
    const contradIdxs   = new Set(contradictions.map(c => c.index));
    const assessIdxs    = new Set(assessments.map(a => a.index));
    const workIdxs      = new Set(workItems.map(w => w.index));

    setOverlays(nextOverlays);
    setCaseEvents(nextCaseEvents);
    setAcceptedWorkItems(nextAcceptedWorkItems);
    setLatestDelta(prev => ({
      ...prev,
      evidenceUpdates:    (prev?.evidenceUpdates    ?? []).filter((_, i) => !evidenceIdxs.has(i)),
      contradictions:     (prev?.contradictions     ?? []).filter((_, i) => !contradIdxs.has(i)),
      changedAssessments: (prev?.changedAssessments ?? []).filter((_, i) => !assessIdxs.has(i)),
      generatedWorkItems: (prev?.generatedWorkItems ?? []).filter((_, i) => !workIdxs.has(i)),
    }));
    persistCurrentCase(analysis, { overlays: nextOverlays, caseEvents: nextCaseEvents, acceptedWorkItems: nextAcceptedWorkItems });
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

  async function triggerIssueAnalysis(issueId, issueTitle, issueDescription, overrideClientRole, skipAdversarial = false, additionalContext = null) {
    setAdversarialLoading(prev => new Set([...prev, issueId]));
    try {
      const res = await fetch("/api/analyze-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issue: { id: issueId, title: issueTitle, description: issueDescription },
          liveCaseState,
          caseText: caseText.slice(0, 4000),
          documentText: documentText.slice(0, 3000),
          clientName,
          clientRole: overrideClientRole ?? clientRole,
          skipAdversarial,
          additionalContext,
        }),
      });
      const data = await res.json();
      if (res.ok) handleIssueAnalysisResult(issueId, issueTitle, data, !skipAdversarial);
    } catch (err) {
      console.error("[triggerIssueAnalysis] failed:", err);
    } finally {
      setAdversarialLoading(prev => { const s = new Set(prev); s.delete(issueId); return s; });
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

  function removeIssue(issueId, issueTitle) {
    const overlay = {
      id: `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      type: "issue_hidden",
      isNew: false,
      patch: { issueId, issueTitle },
    };
    const nextOverlays = [...overlays, overlay];
    setOverlays(nextOverlays);
    if (selectedIssueId === issueId) setSelectedIssueId(null);
    persistCurrentCase(analysis, { overlays: nextOverlays });
  }

  function markQuestionAnswered(issueId, questionText) {
    const overlay = {
      id: `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      type: "question_answered",
      isNew: false,
      patch: { issueId, questionText },
    };
    const nextOverlays = [...overlays, overlay];
    setOverlays(nextOverlays);
    persistCurrentCase(analysis, { overlays: nextOverlays });
  }

  function rollbackOverlay(overlayId) {
    const nextOverlays = overlays.filter((o) => o.id !== overlayId);
    setOverlays(nextOverlays);
    persistCurrentCase(analysis, { overlays: nextOverlays });
  }

  function handleIssueAnalysisResult(issueId, issueTitle, result, isNew = true) {
    const existingIssue = liveCaseState?.issues?.find((i) => i.id === issueId);
    const hasPositions = !!(existingIssue?.partyPositions?.claimant || existingIssue?.partyPositions?.defendant);
    const resultToProcess = hasPositions
      ? { ...result, claimantPosition: null, defendantPosition: null }
      : result;
    const { overlays: newOverlays, events: newEvents, workItems: newWorkItems } =
      buildIssueAnalysisResult(issueId, issueTitle, resultToProcess, isNew);

    // Dedup: skip work items whose title already exists for this issue
    const existingWorkTitles = new Set(
      acceptedWorkItemsRef.current
        .filter(w => w.relatedIssueId === issueId)
        .map(w => w.title?.trim().toLowerCase()).filter(Boolean)
    );
    const dedupedWorkItems = newWorkItems.filter(
      w => !existingWorkTitles.has(w.title?.trim().toLowerCase())
    );

    // Dedup: skip evidence overlays whose title already exists for this issue
    const existingEvidenceTitles = new Set(
      overlaysRef.current
        .filter(o => o.type === "evidence" && o.patch?.relatedIssueId === issueId)
        .map(o => o.patch?.title?.trim().toLowerCase()).filter(Boolean)
    );
    const dedupedOverlays = newOverlays.filter(o =>
      o.type !== "evidence" || !existingEvidenceTitles.has(o.patch?.title?.trim().toLowerCase())
    );

    // Read from refs (not closure) so concurrent per-issue callbacks don't overwrite each other.
    const nextOverlays = [...overlaysRef.current, ...dedupedOverlays];
    const nextCaseEvents = [...caseEventsRef.current, ...newEvents];
    const nextAcceptedWorkItems = [...acceptedWorkItemsRef.current, ...dedupedWorkItems];
    // Update refs synchronously before yielding — next concurrent callback sees accumulated values.
    overlaysRef.current = nextOverlays;
    caseEventsRef.current = nextCaseEvents;
    acceptedWorkItemsRef.current = nextAcceptedWorkItems;
    const nextAdversarialReviews = result.adversarialReview
      ? { ...adversarialReviewsRef.current, [issueId]: result.adversarialReview }
      : adversarialReviewsRef.current;
    setOverlays(nextOverlays);
    setCaseEvents(nextCaseEvents);
    setAcceptedWorkItems(nextAcceptedWorkItems);
    if (result.adversarialReview) setAdversarialReviews(nextAdversarialReviews);
    persistCurrentCase(analysis, {
      overlays: nextOverlays,
      caseEvents: nextCaseEvents,
      acceptedWorkItems: nextAcceptedWorkItems,
      adversarialReviews: nextAdversarialReviews,
    });
  }

  function renderWorkspaceView() {
    switch (activeView) {
      case "legal-briefs":
        return (
          <div className="flex items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-sm" style={{ minHeight: 220 }} dir="rtl">
            <p className="text-slate-400 text-base text-center px-8">ניתוח מעמיק של כתבי טענות וסיוע בהכנת כתבי טענות — בגרסה המלאה</p>
          </div>
        );

      case "pleadings":
        return (
          <div className="space-y-4" dir="rtl">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-6 py-4 text-center text-slate-400 text-sm">
              מחסן המסמכים — בגרסה המלאה
            </div>
            <EvidenceView overlays={overlays} onRollback={rollbackOverlay} />
          </div>
        );

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
    <div dir="rtl" className="h-screen bg-[#eef0f4] text-slate-900 flex flex-col overflow-hidden">
      {loading && <AnalysisLoadingOverlay mode={loadingMode} caseName={caseName} clientName={clientName} />}
      {!!analysis && !session && <AuthScreen isModal paywallMode initialMode="login" />}
      {switchUserModal && <AuthScreen isModal initialMode="login" onDone={() => setSwitchUserModal(false)} />}

      {showWizard && (
        <NewCaseWizard
          onComplete={handleWizardComplete}
          onCancel={() => setShowWizard(false)}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* RTL: first in DOM = rightmost on screen */}
        <AppNav
          activeView={activeView}
          onChangeView={(v) => { posthog.capture("view_changed", { view: v }); setActiveView(v); }}
          session={session}
          onSwitchUser={() => setSwitchUserModal(true)}
          onLogout={async () => { await supabase?.auth.signOut(); window.location.href = '/landing.html'; }}
          savedCases={savedCases}
          currentCaseId={currentCaseId}
          onNewCase={handleOpenNewCase}
          onOpenCase={openSavedCase}
          onDeleteCase={removeSavedCase}
        />

        {/* Dispute navigator — only in case-map view */}
        {activeView === "case-map" && (
          <DisputeNavigator
            issues={liveCaseState?.issues ?? []}
            selectedIssueId={selectedIssueId}
            onSelectIssue={setSelectedIssueId}
            latestDelta={latestDelta}
            onAddUserIssue={addUserIssue}
            onRemoveIssue={removeIssue}
            onUploadFile={handleWordUpload}
            caseName={caseName}
          />
        )}

        {/* Main content column */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden relative">

          {/* Demo banner */}
          <div className="bg-amber-50 border-b border-amber-100 text-center py-1.5 shrink-0" dir="rtl">
            <span className="text-xs text-amber-700 font-medium">גרסת דמו. המערכת אומנה על דיני חוזים בלבד; המאגר המשפטי קטן.</span>
          </div>

          {/* Top bar */}
          <div className="bg-white border-b border-slate-200 px-5 flex items-center gap-3 flex-shrink-0 h-12">

            {/* Right: case title */}
            <div className="flex-1 flex items-center justify-start min-w-0 pointer-events-none select-none">
              {caseName && (
                <span className="text-[18px] font-semibold text-slate-900 truncate">{caseName}</span>
              )}
            </div>

            {/* Center: add info CTA + chat */}
            {analysis && (
              <>
                <button
                  onClick={() => setIntakeExpanded((v) => !v)}
                  className={[
                    "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium border cursor-pointer transition-colors",
                    intakeExpanded
                      ? "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {intakeExpanded ? "סגור ×" : "+ הוסף מידע לתיק"}
                </button>
                <button
                  onClick={() => { setChatIssueContext(null); setShowCaseChat(true); }}
                  className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium border cursor-pointer transition-colors bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 flex items-center gap-1.5"
                  title="שאל את המערכת על התיק"
                >
                  <span>💬</span>
                  <span>שאל</span>
                </button>
              </>
            )}

            {/* Client name label */}
            {analysis && clientName && (
              <span className="shrink-0 flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-500">
                <span>מייצגים:</span>
                <span className="font-semibold text-slate-700">{clientName}</span>
                <button
                  onClick={() => setClientRole(r => r === "claimant" ? "defendant" : "claimant")}
                  title={`תפקיד נוכחי: ${clientRole === "claimant" ? "תובע" : "נתבע"} — לחץ להחליף`}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer bg-transparent border-0 p-0 leading-none"
                >
                  ({clientRole === "claimant" ? "תובע" : "נתבע"} ⇄)
                </button>
              </span>
            )}

            {/* Left: sync indicator + username */}
            <div className="flex items-center gap-2 shrink-0">
              {syncStatus.state === "syncing" && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1 select-none">
                  <span className="inline-block animate-spin">↻</span>
                  מסנכרן...
                </span>
              )}
              {syncStatus.state === "saved" && showSaved && (
                <span className="text-[10px] text-emerald-500 select-none">✓ נשמר בענן</span>
              )}
              {syncStatus.state === "failed" && (
                <span
                  className="text-[10px] text-red-500 select-none cursor-default"
                  title="השמירה לענן נכשלה. מנסה שוב אוטומטית..."
                >
                  ⚠ השמירה לענן נכשלה
                </span>
              )}
              {session ? (
                <span className="text-[11px] text-slate-400 px-1 max-w-[120px] truncate">
                  {session.user?.user_metadata?.full_name || session.user?.email}
                </span>
              ) : (
                <button
                  onClick={() => setAuthModal('login')}
                  className="text-[11px] text-slate-400 hover:text-slate-700 cursor-pointer bg-transparent border-0 px-2 py-1"
                >
                  התחבר
                </button>
              )}
            </div>
          </div>

          {/* Add info panel */}
          {analysis && intakeExpanded && (
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex-shrink-0">
              <div className="max-w-[760px]">
                <div className="text-[11px] font-bold text-slate-400 tracking-[0.07em] uppercase mb-2">
                  הוספת מידע חדש לתיק
                </div>
                <textarea
                  value={additionalInfoText}
                  onChange={(e) => setAdditionalInfoText(e.target.value)}
                  placeholder="הוסף מסמך, עדות, עדכון עובדתי, או כל מידע רלבנטי חדש…"
                  rows={4}
                  className="w-full text-[13px] border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-blue-400 bg-white resize-none leading-relaxed"
                />
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={handleCaseTextUpdateAndReanalyze}
                    disabled={loading || (!additionalInfoText.trim() && !workspaceUpdates.some(u => u.status === "pending_analysis"))}
                    className="rounded-lg bg-slate-900 text-white px-4 py-2 text-[13px] font-semibold disabled:opacity-40 hover:bg-slate-800 border-0 cursor-pointer"
                  >
                    {loading ? "מנתח…" : "⟳ עדכן ניתוח"}
                  </button>
                  <label className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-[13px] text-slate-600 hover:bg-slate-50 cursor-pointer">
                    + העלה קובץ
                    <input type="file" accept=".docx,.txt,.pdf" className="hidden" onChange={handleWordUpload} />
                  </label>
                  {uploadedFiles.length > 0 && (
                    <span className="text-[12px] text-slate-400">
                      {uploadedFiles.length} קבצים מצורפים
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="mx-5 mt-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex-shrink-0">
              {error}
            </div>
          )}

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {!analysis ? (
              <div className="p-6">
                <CaseIntake
                  caseText={caseText}
                  setCaseText={setCaseText}
                  handleWordUpload={handleWordUpload}
                  uploadedFiles={uploadedFiles}
                  status={status}
                  runAnalysis={runAnalysis}
                  loading={loading || preIntakeLoading}
                  hasAnalysis={false}
                />
                {showPreIntake && (
                  <PreIntakePanel
                    questions={preIntakeQuestions}
                    detectedParties={preIntakeDetectedParties}
                    clientName={clientName}
                    clientRole={clientRole}
                    onContinue={handlePreIntakeContinue}
                    onUploadFile={handleWordUpload}
                    isLoading={loading}
                  />
                )}
              </div>
            ) : activeView === "case-map" ? (
              selectedIssueId === null ? (
                <CaseOverview
                  liveCaseState={liveCaseState}
                  analysis={analysis}
                  latestDelta={latestDelta}
                  onSelectIssue={setSelectedIssueId}
                  onAcceptCaseAssessmentChange={acceptCaseAssessmentChange}
                  onRejectCaseAssessmentChange={rejectCaseAssessmentChange}
                />
              ) : (
                <DisputeDetail
                  issue={liveCaseState?.issues?.find((i) => i.id === selectedIssueId)}
                  latestDelta={latestDelta}
                  onUpdateIssue={updateIssue}
                  onApproveAll={acceptAllPendingUpdates}
                  onMarkQuestionAnswered={markQuestionAnswered}
                  onAcceptAssessmentChange={acceptAssessmentChange}
                  onRejectAssessmentChange={rejectAssessmentChange}
                  onAcceptEvidenceUpdate={acceptEvidenceUpdate}
                  onRejectEvidenceUpdate={rejectEvidenceUpdate}
                  onAcceptContradiction={acceptContradiction}
                  onRejectContradiction={rejectContradiction}
                  onAcceptWorkItem={acceptGeneratedWorkItem}
                  onRejectWorkItem={rejectGeneratedWorkItem}
                  onWorkspaceUpdate={handleWorkspaceUpdate}
                  onInfoUpdate={handleInfoAndReanalyze}
                  onIssueFileUpload={handleIssueFileUpload}
                  clientRole={clientRole}
                  ourSideLabel={clientName || (clientRole === "defendant" ? analysis?.executiveView?.caseSnapshot?.parties?.[1] : analysis?.executiveView?.caseSnapshot?.parties?.[0])}
                  opposingSideLabel={clientName ? (analysis?.executiveView?.caseSnapshot?.parties ?? []).find(p => p !== clientName) : (clientRole === "defendant" ? analysis?.executiveView?.caseSnapshot?.parties?.[0] : analysis?.executiveView?.caseSnapshot?.parties?.[1])}
                  retrievedPrecedents={analysis?.retrievedPrecedents}
                  adversarialReview={adversarialReviews[selectedIssueId] ?? null}
                  isAdversarialLoading={adversarialLoading.has(selectedIssueId)}
                  onAnalyzeIssue={triggerIssueAnalysis}
                  onOpenChat={openChatForIssue}
                />
              )
            ) : (
              <div className="p-6">
                {renderWorkspaceView()}
              </div>
            )}
          </div>

          {/* Chat panel — anchored to bottom of main content column */}
          {analysis && showCaseChat && (
            <CaseChatPanel
              issueContext={chatIssueContext}
              chatHistory={caseChatHistory}
              onMessage={handleChatMessage}
              onAcceptUpdate={handleAcceptChatUpdate}
              onRejectUpdate={handleRejectChatUpdate}
              onClose={() => setShowCaseChat(false)}
              isLoading={chatLoading}
            />
          )}

        </div>
      </div>

      {/* Floating feedback button */}
      <button
        onClick={() => setShowFeedback(true)}
        className="fixed bottom-5 left-5 z-[9998] rounded-full bg-slate-800 text-white text-[12px] font-medium px-4 py-2 shadow-lg hover:bg-slate-700 border-0 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
        title="שלח פידבק או דווח על בעיה"
      >
        פידבק / בעיה
      </button>

      {showFeedback && (
        <FeedbackModal
          onClose={() => setShowFeedback(false)}
          userEmail={session?.user?.email || ""}
        />
      )}
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