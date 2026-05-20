function loosify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[.,;:'"!?()\-\/\\]/g, "")
    .replace(/\s+/g, " ");
}

function findMatch(id, title, allowedIssues) {
  if (!allowedIssues || allowedIssues.length === 0) return null;

  // 1. Exact ID match
  if (id) {
    const exact = allowedIssues.find((issue) => issue.id === id);
    if (exact) return exact;
  }

  // 2. Exact title match
  if (title) {
    const titleLower = title.toLowerCase().trim();
    const exact = allowedIssues.find(
      (issue) => issue.title.toLowerCase().trim() === titleLower
    );
    if (exact) return exact;
  }

  // 3. Loose match — substring containment both ways
  if (title) {
    const loose = loosify(title);
    const match = allowedIssues.find((issue) => {
      const allowedLoose = loosify(issue.title);
      return allowedLoose.includes(loose) || loose.includes(allowedLoose);
    });
    if (match) return match;
  }

  // 4. No match
  return null;
}

function normalizeItem(item, idKey, titleKey, allowedIssues) {
  const id = item[idKey];
  const title = item[titleKey];
  const match = findMatch(id, title, allowedIssues);
  if (match) {
    return { ...item, [idKey]: match.id, [titleKey]: match.title };
  }
  // No match — clear ID, keep title if available
  return { ...item, [idKey]: null };
}

export function normalizeDeltaIssueLinks(delta, allowedIssues) {
  if (!delta || !allowedIssues || allowedIssues.length === 0) return delta;

  return {
    ...delta,
    evidenceUpdates: (delta.evidenceUpdates || []).map((item) =>
      normalizeItem(item, "relatedIssueId", "relatedIssueTitle", allowedIssues)
    ),
    generatedWorkItems: (delta.generatedWorkItems || []).map((item) =>
      normalizeItem(item, "relatedIssueId", "relatedIssueTitle", allowedIssues)
    ),
    impactedIssues: (delta.impactedIssues || []).map((item) =>
      normalizeItem(item, "issueId", "issueTitle", allowedIssues)
    ),
  };
}
