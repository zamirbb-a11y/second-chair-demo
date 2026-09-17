// Read-only, case-wide rollup of every pleading already analyzed in this
// case — Phase 1 of the Pleadings-to-case-analysis bridge (see
// docs/pleadings-case-bridge-design.md). Every row is a pointer back to
// its source family; nothing here is copied text that could drift.
// Deliberately keeps the same cautious vocabulary as the per-document
// History tab — disputed / admitted / no response identified / deemed
// admission — never "established fact."

import { useState } from "react";
import { buildCaseFactualLedger } from "../../lib/caseFactualLedger.js";

const PARTY_LABELS = { claimant: "התובע", defendant: "הנתבע", third_party: "צד שלישי", unknown: "" };

// Phase 2 of the pleadings-case bridge: only the Ledger's own categories
// are candidates at all (buildCaseFactualLedger already excludes plain
// repeats, so this is already salience-filtered — no separate check
// needed). The category → update-type mapping is fixed and deterministic,
// never an AI decision; only "which issue" goes through an AI call
// (api/check-relevance.js, reused as-is).
const CATEGORY_TO_UPDATE_TYPE = {
  admission: "new_evidence",
  disputedProposition: "new_contradiction",
  positionChange: "new_contradiction",
  proceduralGap: "new_work_item",
};

const SUGGESTION_LABEL = {
  new_evidence: { label: "ראיה חדשה", badge: "text-blue-700 bg-blue-50 border-blue-200" },
  new_contradiction: { label: "סתירה", badge: "text-red-700 bg-red-50 border-red-200" },
  new_work_item: { label: "פעולה נדרשת", badge: "text-indigo-700 bg-indigo-50 border-indigo-200" },
};

function buildCandidates(ledger, resolveFamilyRef) {
  const candidates = [];
  function add(entry, category) {
    const subjectRef = resolveFamilyRef(entry.subject.analysisId, entry.subject.familyId);
    const title = subjectRef?.family?.canonical_text?.slice(0, 140);
    if (!title) return;
    const targetRef = entry.target ? resolveFamilyRef(entry.target.analysisId, entry.target.familyId) : null;
    let description = `מתוך: ${subjectRef.docTitle}.`;
    if (targetRef?.family?.canonical_text) {
      description += ` ${category === "admission" ? "מודה בעמדת" : "לעומת"}: ${targetRef.family.canonical_text.slice(0, 140)} (${targetRef.docTitle}).`;
    }
    candidates.push({
      key: entry.id,
      category,
      title,
      description,
      sourceRef: { analysisId: entry.subject.analysisId, familyId: entry.subject.familyId },
    });
  }
  ledger.admissions.forEach((e) => add(e, "admission"));
  ledger.disputedPropositions.forEach((e) => add(e, "disputedProposition"));
  ledger.positionChanges.forEach((e) => add(e, "positionChange"));
  ledger.proceduralGaps.forEach((e) => add(e, "proceduralGap"));
  return candidates;
}

async function matchCandidatesToIssues(candidates, issues) {
  if (!candidates.length || !issues.length) return [];
  const issueList = issues.map((i) => ({ id: i.id, title: i.title, description: i.description || "" }));
  const perCandidate = await Promise.all(
    candidates.map(async (c) => {
      try {
        const res = await fetch("/api/check-relevance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item: { type: c.category, title: c.title, description: c.description }, issues: issueList }),
        });
        if (!res.ok) return [];
        const json = await res.json();
        const ids = json.relevantIssueIds ?? [];
        return ids
          .map((issueId) => {
            const issue = issues.find((i) => i.id === issueId);
            if (!issue) return null;
            return {
              id: `pleading-suggest-${c.key}-${issueId}`,
              type: CATEGORY_TO_UPDATE_TYPE[c.category],
              title: c.title,
              description: c.description,
              issueId: issue.id,
              issueTitle: issue.title,
              sourceRef: c.sourceRef,
            };
          })
          .filter(Boolean);
      } catch {
        return [];
      }
    })
  );
  return perCandidate.flat();
}

function FamilyRef({ analysisId, familyId, resolveFamilyRef, onJumpToFamily, fallback }) {
  const ref = resolveFamilyRef(analysisId, familyId);
  if (!ref) return <span className="text-slate-400">{fallback ?? "מקור לא זמין"}</span>;
  return (
    <button
      type="button"
      onClick={() => onJumpToFamily(analysisId, familyId)}
      className="text-right bg-transparent border-0 p-0 cursor-pointer hover:underline"
    >
      <span className="text-slate-500">{ref.docTitle}:</span>{" "}
      <span className="text-slate-800">{ref.family?.canonical_text ?? ""}</span>
    </button>
  );
}

function Section({ title, hint, items, children }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-slate-900 mb-1">{title} ({items.length})</h3>
      {hint && <p className="text-xs text-slate-500 mb-2">{hint}</p>}
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ children, tone = "slate" }) {
  const toneClasses = {
    slate: "border-slate-200 bg-white",
    red: "border-red-200 bg-red-50",
    amber: "border-amber-200 bg-amber-50",
  }[tone];
  return <div className={`rounded-xl border px-3 py-2.5 text-sm leading-relaxed ${toneClasses}`}>{children}</div>;
}

export default function CaseFactualLedgerView({ records, resolveFamilyRef, onJumpToFamily, onBack, issues = [], onAcceptSuggestion }) {
  const ledger = buildCaseFactualLedger(records);
  const totalFindings =
    ledger.admissions.length + ledger.disputedPropositions.length + ledger.positionChanges.length +
    ledger.proceduralGaps.length + ledger.possibleScopeExpansions.length;

  const [suggestions, setSuggestions] = useState(null); // null = not run yet; [] = run, found nothing
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [dismissedIds, setDismissedIds] = useState(new Set());

  async function handleSuggestLinks() {
    setSuggestLoading(true);
    setSuggestions(null);
    try {
      const candidates = buildCandidates(ledger, resolveFamilyRef);
      const matched = await matchCandidatesToIssues(candidates, issues);
      setSuggestions(matched);
    } finally {
      setSuggestLoading(false);
    }
  }

  function handleAccept(s) {
    onAcceptSuggestion?.(s);
    setDismissedIds((prev) => new Set([...prev, s.id]));
  }

  const visibleSuggestions = (suggestions ?? []).filter((s) => !dismissedIds.has(s.id));

  return (
    <div className="px-8 py-7 max-w-[820px]" dir="rtl">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-slate-500 hover:text-slate-700 bg-transparent border-0 cursor-pointer p-0 mb-4"
      >
        → כל כתבי הטענות
      </button>
      <h2 className="text-xl font-bold text-slate-900 mb-1">תמונת מצב של התיק</h2>
      <p className="text-sm text-slate-500 mb-6">
        ריכוז של כל הממצאים הבין-מסמכיים מ-{records.length} כתבי הטענות שנותחו בתיק זה. כל שורה מצביעה למקור — שום דבר כאן אינו נקבע כעובדה מבוססת.
      </p>

      {totalFindings === 0 && (
        <p className="text-sm text-slate-500">אין עדיין ממצאים בין-מסמכיים בתיק זה — נדרשים לפחות שני כתבי טענות עם קשר מסומן ביניהם.</p>
      )}

      {totalFindings > 0 && issues.length > 0 && (
        <div className="mb-6">
          <button
            type="button"
            onClick={handleSuggestLinks}
            disabled={suggestLoading}
            className="text-sm font-medium px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 cursor-pointer"
          >
            {suggestLoading ? "בודק התאמות…" : "הצע קישורים למחלוקות קיימות"}
          </button>

          {suggestions !== null && !suggestLoading && visibleSuggestions.length === 0 && (
            <p className="text-xs text-slate-500 mt-2">לא נמצאו התאמות למחלוקות קיימות.</p>
          )}

          {visibleSuggestions.length > 0 && (
            <div className="space-y-2 mt-3">
              {visibleSuggestions.map((s) => {
                const cfg = SUGGESTION_LABEL[s.type];
                return (
                  <div key={s.id} className={`rounded-xl border px-3 py-2.5 text-sm ${cfg.badge}`}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold opacity-80 mb-0.5">{cfg.label} מוצעת — למחלוקת "{s.issueTitle}"</p>
                        <p className="leading-snug" style={{ overflowWrap: "break-word" }}>{s.title}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => handleAccept(s)}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-current hover:opacity-80 cursor-pointer"
                        >אשר</button>
                        <button
                          onClick={() => setDismissedIds((prev) => new Set([...prev, s.id]))}
                          className="text-xs px-2 py-1 rounded-lg bg-white/60 border border-current opacity-50 hover:opacity-30 cursor-pointer"
                        >×</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Section title="הודאות" hint="טענה שהצד שכנגד הודה בה, לפי הניתוח האוטומטי — לא מנוסח כעובדה מוכחת." items={ledger.admissions}>
        {ledger.admissions.map((r) => (
          <Row key={r.id}>
            <FamilyRef analysisId={r.subject.analysisId} familyId={r.subject.familyId} resolveFamilyRef={resolveFamilyRef} onJumpToFamily={onJumpToFamily} />
            <div className="text-xs text-slate-500 mt-1">מודה בעמדת: <FamilyRef analysisId={r.target.analysisId} familyId={r.target.familyId} resolveFamilyRef={resolveFamilyRef} onJumpToFamily={onJumpToFamily} /></div>
          </Row>
        ))}
      </Section>

      <Section title="מחלוקות מרכזיות" hint="עמדות סותרות בין הצדדים — לא נקבע מי צודק." items={ledger.disputedPropositions}>
        {ledger.disputedPropositions.map((r) => (
          <Row key={r.id}>
            <FamilyRef analysisId={r.subject.analysisId} familyId={r.subject.familyId} resolveFamilyRef={resolveFamilyRef} onJumpToFamily={onJumpToFamily} />
            <div className="text-xs text-slate-500 mt-1">{r.type === "contradicts" ? "בסתירה לעמדת:" : "מכחישה את:"} <FamilyRef analysisId={r.target.analysisId} familyId={r.target.familyId} resolveFamilyRef={resolveFamilyRef} onJumpToFamily={onJumpToFamily} /></div>
          </Row>
        ))}
      </Section>

      <Section title="שינויי עמדה" hint="אותו צד שינה טענה בין מסמכים — לאורך זמן." items={ledger.positionChanges}>
        {ledger.positionChanges.map((r) => (
          <Row key={r.id} tone="amber">
            <FamilyRef analysisId={r.subject.analysisId} familyId={r.subject.familyId} resolveFamilyRef={resolveFamilyRef} onJumpToFamily={onJumpToFamily} />
            <div className="text-xs text-slate-500 mt-1">לעומת עמדה קודמת: <FamilyRef analysisId={r.target.analysisId} familyId={r.target.familyId} resolveFamilyRef={resolveFamilyRef} onJumpToFamily={onJumpToFamily} /></div>
          </Row>
        ))}
      </Section>

      <Section title="טענות ללא מענה" hint="כולל הודאות-מכללא לפי תקנה 14(ב) בתביעה שלא נענתה בהגנה, ומקרים רכים יותר במסמכים אחרים." items={ledger.proceduralGaps}>
        {ledger.proceduralGaps.map((r) => (
          <Row key={r.id} tone={r.isDeemedAdmission ? "red" : "amber"}>
            <FamilyRef analysisId={r.subject.analysisId} familyId={r.subject.familyId} resolveFamilyRef={resolveFamilyRef} onJumpToFamily={onJumpToFamily} />
            <div className="text-xs text-slate-500 mt-1">
              {r.isDeemedAdmission ? "נחשבת כמודה בה (תקנה 14(ב)) — " : "לא אותרה התייחסות — "}
              <FamilyRef analysisId={r.target.analysisId} familyId={null} resolveFamilyRef={resolveFamilyRef} onJumpToFamily={onJumpToFamily} fallback="" />
            </div>
          </Row>
        ))}
      </Section>

      <Section title="ייתכן שזו הרחבת חזית" hint="טענה בכתב תשובה או תשובה לתגובה שלא נמצא לה קשר לאף מסמך קודם שסומן כמענה." items={ledger.possibleScopeExpansions}>
        {ledger.possibleScopeExpansions.map((r) => (
          <Row key={r.id} tone="amber">
            <FamilyRef analysisId={r.subject.analysisId} familyId={r.subject.familyId} resolveFamilyRef={resolveFamilyRef} onJumpToFamily={onJumpToFamily} />
          </Row>
        ))}
      </Section>

      <Section title="סעדים מבוקשים" items={ledger.reliefRequested}>
        {ledger.reliefRequested.map((f) => (
          <Row key={`${f.analysisId}:${f.familyId}`}>
            <FamilyRef analysisId={f.analysisId} familyId={f.familyId} resolveFamilyRef={resolveFamilyRef} onJumpToFamily={onJumpToFamily} />
            <div className="text-xs text-slate-500 mt-1">{PARTY_LABELS[f.party] ?? ""}</div>
          </Row>
        ))}
      </Section>
    </div>
  );
}
