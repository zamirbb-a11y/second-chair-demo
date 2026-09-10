# Bridging Pleadings into the Case-Level Analysis
### Design proposal — prepared overnight 2026-09-10, for review

## 0. The one-line principle

**Pleadings tell us what the parties allege, admit, deny, dispute, and ask for — not what is true.** The bridge design exists entirely to preserve that distinction while still letting pleadings data make the case analysis richer. Everywhere below, "source of truth" means "the pleading text," and everything else is a pointer back to it.

---

## 1. Current state (verified by reading the code, not assumed)

Three things are true today, confirmed by direct inspection:

1. **The case-analysis system (`analysis.issues[]` + overlays) already follows the exact discipline this task asks for**, just applied to a different input (the big `/api/analyze` case-materials call, not pleadings): `analysis` is produced once and never mutated (`CLAUDE.md`); every subsequent change is an additive `{id, createdAt, type, isNew, patch}` overlay; `buildLiveCaseState()` (`src/utils/buildLiveCaseState.js`) is a pure function that folds overlays onto normalized issues to produce the view components render; rollback is just "remove one overlay by id" and the derived view updates for free. This is a strong foundation — the bridge should extend this pattern, not invent a new one.

2. **There is a partially-built "living case state" (event log) that isn't wired to anything.** `src/lib/caseEvents.js` appends a real, persisted `caseEvents` array on every overlay-producing action, but `computeCaseState()` — the function meant to consume that log — is explicitly commented "Phase A: computed but not used by UI yet," and nothing reads its output. `unresolvedConflicts` is hardcoded to `[]`. Worth knowing before touching this area again: the event log is being written faithfully, but nothing downstream trusts it yet.

3. **Pleadings and the case-analysis system share zero code-level connection today** — confirmed, not assumed. `PleadingAnalysisView.jsx` takes only a bare `caseId` string, used purely as a localStorage key prefix (`pleadingAnalyses:<caseId>`), completely separate from the `secondChair.case.<caseId>` blob that holds `analysis`/`overlays`/`caseEvents`. No shared object ids, no imports, no data flow either direction.

One more thing worth stating explicitly because it changes the shape of the proposal: **the Pleadings feature's own internal architecture already follows this project's additive/deterministic/provenance-preserving philosophy.** Claim Families are an additive grouping layer over raw claims (never mutating them); cross-document relations are an additive layer over families; `computeSalience()` is a pure deterministic function, never an AI output, never stored — exactly the same shape as the overlay system's philosophy, arrived at independently. That's good news: the bridge is connecting two systems that already agree on the ground rules, not reconciling two incompatible ones.

---

## 2. The conceptual model

Ten categories were asked for. Here's what each one is, and — critically — **where it lives today or should live**, because conflating "where a fact is discussed" with "where a fact is established" is exactly the failure mode this design has to avoid.

| Category | What it is | Lives in |
|---|---|---|
| **Allegation** | A single factual/legal proposition one party stated in one document | Pleadings raw `claim` node — already exists, unchanged by this design |
| **Party position** | The claim restated/refined across a party's own filings | Pleadings Claim Family (`claim_families`) — already exists |
| **Admission** | A `responds_to`/`admits` cross-document relation, or (pending legal verification, see §7) a deemed admission from silence | Pleadings `cross_document_relations` — already exists, **newly surfaced case-wide** by this design (§3) |
| **Disputed fact** | A proposition with a `contradicts` or `responds_to`/`denies` relation against it | Same — already exists, newly surfaced case-wide |
| **Established fact** | A proposition the court has found true, or that survives to trial unrebutted with record support | **Does not exist yet anywhere in this app.** Pleadings can compute "undisputed by the pleadings" as a weak proxy, but that is not the same claim and must never be labeled the same way — a fact can be undisputed in the pleadings and still be a hollow shell with no evidence behind it |
| **Evidence** | Something that supports or undermines a position | Partially exists as `evidence_refs` (what a pleading *cites*, extracted from its own text) — the richer sense (an actual document/testimony in the case file) does not exist yet in either system |
| **Legal issue** | A dispute framed for the court to decide | Already the top-level unit of the case-analysis system (`analysis.issues[]`) — the natural anchor point for the bridge |
| **Legal element / defense** | What a party needs to establish for a cause of action | Does not exist in either system today. `src/legal-knowledge/issueTaxonomy.js` (a taxonomy classifier used elsewhere) is a plausible reuse candidate, flagged as an open question in §7, not assumed |
| **Requested relief** | The remedy/damages sought | Already exists as Pleadings claim families with `node_kind: remedy \| damages` |
| **Procedural history** | How positions developed over the filings | Partially exists per-family (the "History" tab), not yet case-wide — this design's main deliverable |

---

## 3. Source data vs. derived data vs. analytical conclusion

This is the distinction the task asked to get right, because collapsing it is exactly how duplication and drift happen.

- **Source data** — the pleading text itself, and the `analysis.issues[]` produced by the case-level AI call. Immutable, per existing `CLAUDE.md` rule. Never touched by this design.
- **Derived data** — computed, deterministic, no AI call, always reproducible from source. This is where the bridge's new work lives: a **Case Factual Ledger**, described below, that rolls up every pleading's Claim Families and cross-document relations across the *whole case* instead of one document at a time. Because it's a pure function of already-stored data, it needs no new persistence and cannot drift from its source — recomputing it always gives the current truth.
- **Analytical conclusion** — a human (or a bounded, human-confirmed AI suggestion) deciding that a ledger entry actually *is* an instance of some Issue, or elevates to a new Issue. This is the only place anything gets written as a real, persisted case-level fact, and it always happens through the existing overlay mechanism, never automatically.

**The rule that prevents drift:** derived data is *recomputed*, never *copied*. Conclusions *reference* derived data by pointer (`{analysisId, familyId}`), never duplicate its text into a separate field that can go stale. This mirrors the existing `evidence` overlay shape almost exactly (it already stores `relatedIssueId` as a pointer, not a copy).

---

## 4. Proposed architecture

### Phase 1 — Case Factual Ledger (low-risk, validated tonight, not yet wired into the UI)

A new pure function, `buildCaseFactualLedger(pleadingRecords)`, living in `src/lib/`, alongside `buildLiveCaseState.js` (same shape of responsibility, one level over). It takes every pleading record already stored for the case and produces a case-wide rollup:

```
{
  admissions:        [{ subject: {analysisId, familyId}, target: {analysisId, familyId}, relation }],
  disputedPropositions: [{ claimantRef, defendantRef, relationType, stance }],
  positionChanges:   [{ from: {analysisId, familyId}, to: {analysisId, familyId} }],   // "changed" relations, same party
  proceduralGaps:    [{ ref: {analysisId, familyId}, docTitle }],                       // not_addressed relations
  reliefRequested:   [{ ref: {analysisId, familyId}, party }],                          // node_kind remedy/damages
}
```

Every entry is a **pointer**, never a text copy — rendering it means resolving `{analysisId, familyId}` back to the live pleading data, exactly the pattern `resolveFamilyRef` in `PleadingAnalysisView.jsx` already implements for the per-document History tab. This is a case-wide version of a view that already exists per-document; nothing new is invented, just aggregated.

**No new AI calls, no new schema commitment, no new persistence** — it reads `claim_families` and `cross_document_relations` that Claim Families/Stage 1 already compute and store. This is exactly the kind of "small, low-risk prototype to validate the idea" invited for tonight, and it's what I actually built and ran (§6).

### Phase 2 — linking a ledger entry into a case Issue (designed, not built tonight)

A **new overlay type**, e.g. `pleading_link`, with a patch shape deliberately parallel to the existing `evidence` overlay:

```
{ action: "add", issueId, sourceType: "pleading",
  ref: { analysisId, familyId }, note }
```

Creating one of these overlays is the **only** way a pleading proposition becomes part of a case Issue's rendered content — and, matching how the rest of the app already works (chat suggestions require two separate accept-clicks before becoming an overlay), this should never happen silently. Two ways to trigger it, both already-precedented patterns in this codebase:
- **Manual**: the lawyer, viewing the Case Factual Ledger, clicks "link to issue" on an entry and picks an existing Issue (or creates one, mirroring `addUserIssue`).
- **Suggested**: reuse the existing `check-relevance` API pattern (already used for chat-accepted items) to propose which Issue a new ledger entry probably belongs to — still requires the same accept click before it becomes an overlay.

Rollback is free — it's just another overlay, removable by id like every other overlay type today.

### Phase 3 — legal elements / established facts (not designed in depth; flagged as future work)

Genuinely new territory for the app (§2's table shows neither exists today). Not attempted tonight beyond noting `issueTaxonomy.js` as a plausible reuse candidate for legal-elements — this needs its own design pass once Phase 1/2 are validated in real use, not before.

---

## 5. What happens when a new pleading (e.g. a Reply) is added

Two different answers for two different layers, and keeping them different is the point:

- **The Ledger (Phase 1) updates for free, automatically, the instant it's recomputed** — it's a pure function of stored pleading records, so adding one more record just adds more input. No event, no migration, nothing to trigger. A previously-disputed fact that the Reply admits shows up as admitted the next time the ledger renders, with zero code change needed for this to work — it already fell out of the Phase 1 prototype (§6).
- **Any Phase 2 link to a case Issue does NOT auto-update.** If the fact status a link pointed to has changed since the link was made, the UI should show a staleness flag ("this pleading link's underlying status has changed since you linked it") rather than silently rewriting the Issue — this is the same principle already stated in `CLAUDE.md`: *"New information should create events, not rewrite prior state."* The lawyer decides whether and how to update the linked Issue, same as every other overlay-producing decision in the app today.

This directly answers the questions posed: a new admission does **not** automatically flip a disputed-fact badge at the case-Issue level (only at the Ledger level, where it's a safe recomputation, not a case conclusion) — and whether it *should* automatically update the Issue level is explicitly one of the open product questions below, not something this design presumes to answer.

---

## 6. Worked example — a real case already analyzed this session (details redacted for this document)

Used three real pleadings already analyzed this session for a live client matter: an original complaint, its later amended version (same claimant), and the resulting defense. Wrote a throwaway pure function (`.scratch/case-ledger-prototype.mjs` — gitignored, not committed, reads only already-computed `.scratch/*-families.json`/`*-relations.json` from earlier validation runs) implementing exactly the Phase 1 shape above, and ran it against the real data. (This document deliberately paraphrases the output instead of quoting it verbatim, so no client-specific facts, names, or figures end up in a git-tracked file — the actual quotes are visible in this session's transcript and in the gitignored `.scratch/` outputs if needed.)

**Admissions (4 found)** — e.g. a factual detail the amended complaint alleges is echoed by the defense as something it does not dispute occurred (categorized `responds_to`/`admits`), while the defense disputes its legal characterization elsewhere.

**Disputed propositions (21 found)** — e.g. a claimant proposition about the legal effect of a notice, met by a defense position classified `responds_to`(`denies`). Rendered as **disputed**, explicitly not as "false" — the ledger format has no field for asserting which side is right.

**Position changes across the amendment (5 found)** — a factual claim about the claimant's own conduct is stated more narrowly/differently in the amended complaint than in the original — a real, visible change in a factual claim between the original and amended complaint, exactly the kind of same-party evolution requested.

**Procedural gap (1 found)** — a specific factual allegation present in the original complaint and never repeated in the amended complaint — surfaced as *"no response identified,"* per the same cautious-wording discipline already used in the per-document History tab, not as "claimant abandoned this."

**Relief requested (4 found)** — every `remedy`/`damages`-tagged family in the current complaint, each a pointer back to its source claim, not a copied summary.

Every single line above was produced with **zero new AI calls** — it's a pure re-read of data already computed and stored during Claim Families / Stage 1 work. That's the strongest validation the Phase 1 design could get: the case-level view is already latent in what's stored, and just needed a case-wide read instead of a per-document one.

---

## 7. Risks, and how the design addresses each

- **Duplication / drift** — addressed structurally: derived data (the Ledger) is never persisted as a copy, only recomputed; conclusions (Phase 2 links) store a pointer, never a text copy. There is exactly one place pleading text lives.
- **Stale derived data** — the Ledger itself can't go stale (it's recomputed every render); the risk is scoped down to Phase 2 links, which get an explicit staleness indicator rather than silent auto-update or silent staleness.
- **Loss of provenance** — every Ledger entry and every Phase 2 overlay carries `{analysisId, familyId}` back to the exact claim family and, from there, to the exact source span in the original document (this path already exists — it's what "jump to source" already does today).
- **Treating allegations as facts** — enforced by vocabulary as much as architecture: "disputed," "admitted," "no response identified" are the only verdicts the Ledger is allowed to produce; "established fact" is not a label this design lets anything compute, because neither system has the inputs (evidence, testimony, rulings) that would justify it. Phase 3 is explicitly where that would eventually need its own sourcing, not before.

---

## 8. Incremental path (not a rewrite)

1. **Now:** this document + the validated `.scratch` prototype (done tonight).
2. **Next:** promote the prototype to `src/lib/caseFactualLedger.js`, add a read-only case-wide view (new tab or panel, reusing existing `resolveFamilyRef`/History-tab rendering patterns) — pure UI + one new pure function, no schema change, no new persistence. Small enough to build and demo before committing to Phase 2.
3. **After that, pending your decisions in §9:** the `pleading_link` overlay type and the linking UI (Phase 2).
4. **Later, separate design pass:** legal elements / established facts (Phase 3) — deliberately not scoped further tonight.

---

## 9. Product decisions needing your input

1. **The deemed-admission legal question** (see `docs/stage2-document-type-rules.md`'s addendum): if תקנה 14 really does deem unaddressed complaint facts admitted absent express denial, "procedural gap" in the Ledger should probably be split into two different severities — a legally-grounded deemed-admission vs. a softer "no response identified." Needs your confirmation before that distinction gets built.
2. **Should a Phase 2 link ever auto-update** when its underlying Ledger status changes, rather than just flagging staleness? I've proposed "never, always a flag" above as the conservative default, consistent with the append-only philosophy already in `CLAUDE.md` — but you may feel differently for high-confidence cases like a plain admission.
3. **Should the Ledger (and eventually Phase 2) work for a case with no `analysis` yet** — i.e., can pleadings become a valid *starting point* for a case, before the big case-materials analysis has ever run? Today every case implicitly starts from that call; this wasn't tested either way.
4. **Is `issueTaxonomy.js` actually a good fit for legal-elements-to-establish (Phase 3)?** I flagged it as a plausible reuse, not a decision — it was built for a different purpose and I did not evaluate it deeply enough tonight to recommend committing to it.
