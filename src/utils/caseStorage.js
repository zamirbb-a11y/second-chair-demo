const CASES_INDEX_KEY = "secondChair.cases.index";
const CASE_KEY_PREFIX = "secondChair.case.";

export function createCaseId() {
  return (
    "case_" +
    new Date().toISOString().replace(/[:.]/g, "-") +
    "_" +
    Math.random().toString(36).slice(2, 8)
  );
}

export function saveCase(caseState) {
  if (!caseState?.id) {
    throw new Error("Cannot save case without id");
  }

  const now = new Date().toISOString();

  const safeCase = {
    ...caseState,
    updatedAt: now,
    createdAt: caseState.createdAt || now,
  };

  localStorage.setItem(
    `${CASE_KEY_PREFIX}${safeCase.id}`,
    JSON.stringify(safeCase)
  );

  updateCasesIndex(safeCase);

  return safeCase;
}

export function loadCase(caseId) {
  if (!caseId) return null;

  const raw = localStorage.getItem(`${CASE_KEY_PREFIX}${caseId}`);

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to parse saved case:", error);
    return null;
  }
}

export function listCases() {
  try {
    const raw = localStorage.getItem(CASES_INDEX_KEY);
    const cases = raw ? JSON.parse(raw) : [];

    return Array.isArray(cases)
      ? cases.sort((a, b) =>
          String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))
        )
      : [];
  } catch (error) {
    console.error("Failed to list saved cases:", error);
    return [];
  }
}

export function deleteCase(caseId) {
  if (!caseId) return;

  localStorage.removeItem(`${CASE_KEY_PREFIX}${caseId}`);

  const cases = listCases().filter((item) => item.id !== caseId);

  localStorage.setItem(CASES_INDEX_KEY, JSON.stringify(cases));
}

function updateCasesIndex(caseState) {
  const cases = listCases();

  const summary = {
    id: caseState.id,
    name: caseState.name || "תיק ללא שם",
    updatedAt: caseState.updatedAt,
    createdAt: caseState.createdAt,
    documentsCount: caseState.caseFiles?.length || 0,
    hasAnalysis: Boolean(caseState.analysis),
  };

  const nextCases = [
    summary,
    ...cases.filter((item) => item.id !== caseState.id),
  ];

  localStorage.setItem(CASES_INDEX_KEY, JSON.stringify(nextCases));
}