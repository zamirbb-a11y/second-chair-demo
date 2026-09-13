// Read-only, case-wide rollup of every pleading already analyzed in this
// case — Phase 1 of the Pleadings-to-case-analysis bridge (see
// docs/pleadings-case-bridge-design.md). Every row is a pointer back to
// its source family; nothing here is copied text that could drift.
// Deliberately keeps the same cautious vocabulary as the per-document
// History tab — disputed / admitted / no response identified / deemed
// admission — never "established fact."

import { buildCaseFactualLedger } from "../../lib/caseFactualLedger.js";

const PARTY_LABELS = { claimant: "התובע", defendant: "הנתבע", third_party: "צד שלישי", unknown: "" };

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

export default function CaseFactualLedgerView({ records, resolveFamilyRef, onJumpToFamily, onBack }) {
  const ledger = buildCaseFactualLedger(records);
  const totalFindings =
    ledger.admissions.length + ledger.disputedPropositions.length + ledger.positionChanges.length +
    ledger.proceduralGaps.length + ledger.possibleScopeExpansions.length;

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
