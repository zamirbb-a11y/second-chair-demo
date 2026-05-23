const REQUIRES_APPROVAL = {
  intake: false,
  document_added: false,
  evidence_added: false,
  evidence_gap_noted: false,
  timeline_event_added: false,
  work_item_created: false,
  contradiction_noted: true,
  assessment_changed: true,
  position_updated: true,
  issue_created: true,
  issue_updated: true,
};

export function createEvent(type, source, affects, mergePatch, updateDelta) {
  return {
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    createdAt: new Date().toISOString(),
    source,
    status: "pending",
    requiresApproval: REQUIRES_APPROVAL[type] ?? true,
    affects: affects || { issueId: null, field: null },
    mergePatch: mergePatch || null,
    updateDelta: updateDelta || null,
  };
}

export function hasIntakeEvent(events = []) {
  return events.some((e) => e.type === "intake");
}

// Phase A: computed but not used by UI yet.
// Returns caseState.current derived from analysis + accepted events.
// Grows incrementally as new event types are added.
export function computeCaseState(analysis, events = []) {
  if (!analysis) return null;

  const acceptedEvents = events.filter((e) => e.status === "accepted");

  return {
    current: {
      issues: analysis.issues || [],
      unresolvedConflicts: [],
    },
    events,
    meta: {
      eventCount: events.length,
      acceptedCount: acceptedEvents.length,
      lastEventAt: events.length > 0 ? events[events.length - 1].createdAt : null,
    },
  };
}
