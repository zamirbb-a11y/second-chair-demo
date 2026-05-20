export function getEvidenceOverlays(overlays = []) {
  return overlays.filter((o) => o.type === "evidence");
}

export function getIssueEvidenceOverlays(overlays = [], issueId, issueTitle) {
  const matched = overlays.filter((o) => {
    if (o.type !== "evidence") return false;
    if (issueId && o.patch.relatedIssueId === issueId) return true;
    if (
      issueTitle &&
      o.patch.relatedIssueTitle &&
      o.patch.relatedIssueTitle.toLowerCase() === issueTitle.toLowerCase()
    )
      return true;
    return false;
  });
  if (matched.length > 0) {
    console.log(
      `[overlays] issue "${issueTitle}" (${issueId}) matched ${matched.length} overlay(s):`,
      matched.map((o) => ({ id: o.id, relatedIssueId: o.patch.relatedIssueId, relatedIssueTitle: o.patch.relatedIssueTitle }))
    );
  }
  return matched;
}

export function getIssueWorkItems(workItems = [], issueId, issueTitle) {
  return workItems.filter((item) => {
    if (issueId && item.relatedIssueId === issueId) return true;
    if (
      issueTitle &&
      item.relatedIssueTitle &&
      item.relatedIssueTitle.toLowerCase() === issueTitle.toLowerCase()
    )
      return true;
    return false;
  });
}

export function getUnscopedEvidenceOverlays(overlays = [], issues = []) {
  if (issues.length === 0) {
    return overlays.filter(
      (o) => o.type === "evidence" && !o.patch.relatedIssueId && !o.patch.relatedIssueTitle
    );
  }
  const matchedIds = new Set(
    issues.flatMap((issue) =>
      getIssueEvidenceOverlays(overlays, issue.id, issue.title).map((o) => o.id)
    )
  );
  return overlays.filter((o) => o.type === "evidence" && !matchedIds.has(o.id));
}

export function getUnscopedWorkItems(workItems = []) {
  return workItems.filter(
    (item) => !item.relatedIssueId && !item.relatedIssueTitle
  );
}

export function translateEvidenceType(type) {
  switch (type) {
    case "new_evidence":
      return "ראיה חדשה";
    case "missing_evidence":
      return "ראיה חסרה";
    case "evidence_gap":
      return "פער ראייתי";
    case "document_impact":
      return "השפעת מסמך";
    default:
      return "עדכון ראייתי";
  }
}
