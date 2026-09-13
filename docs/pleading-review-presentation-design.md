# Presenting the Pleading Review to the Lawyer
### Two deliverables requested: (A) the structure of a "ביקורת כתב טענות" document, (B) a separate, unconstrained brainstorm of presentation approaches

Written after a night of building out the analysis engine (evidentiary-standard-by-stage, deemed admissions, scope-expansion, structural/formal checks, affidavit and interim-relief profiles). That work means the system now produces a genuinely wide range of finding types, and this is the first point where they all exist at once — which is exactly why the presentation problem is now visible as a real problem, not a hypothetical one. This document is a proposal, not a build — nothing here is implemented.

---

## Part A — the "ביקורת כתב טענות" document

### The organizing principle

Everything found tonight falls into one of four kinds, and they are NOT equally urgent to a lawyer opening this document for the first time:

1. **Cross-document alerts** — contradicts, deemed admissions, scope-expansion flags, position changes. These carry real legal consequence and are the reason a lawyer would drop what they're doing.
2. **Structural/formal issues** — page limits, missing jurisdictional facts, relief/fact mismatches. Objective, quick to state, quick to fix.
3. **Per-claim weaknesses and gaps** — the bulk of the output, valuable but voluminous.
4. **Reference material** — the full claim inventory, authorities, evidence list. Needed for completeness and audit, never needed first.

A document organized by *document structure* (paragraph 1, paragraph 2, ...) or by *raw claim order* buries (1) inside (3). The proposed structure inverts that:

### Proposed sections, in reading order

**1. כותרת** — document identity: type, party, filing date, case, which prior documents it was checked against. One line.

**2. תמצית מנהלים (Executive Summary)** — 5–10 bullets max, severity-sorted across *all four categories combined*, not grouped by category. This is deliberate: a lawyer reading top-to-bottom should hit the single most important thing first, whether that's a deemed admission or a blown page limit. Each bullet links down into the relevant detail section. If there is nothing above a real severity threshold, say so explicitly ("לא נמצאו ממצאים בעלי חומרה גבוהה") rather than leaving the section looking broken.

**3. עמידה בדרישות צורניות** — a short, scannable checklist: page limit (pass/fail with the actual numbers), jurisdictional facts present (complaint only), tripartite structure present. This is the cheapest section to produce confidence from — it's mechanical — so it earns an early, compact slot.

**4. ממצאים בין-מסמכיים** — grouped *by type* (admissions, disputes, deemed admissions, scope-expansion, position changes), not by claim, because a lawyer thinks "what did they admit" as one sweep, not "claim 7, does it have a cross-document angle." Each entry is a link to its source family.

**5. ניתוח לפי טענה** — the core, detailed section. Grouped by Claim Family (never raw claim nodes), but *sorted*, not document-order: families with an active alert or a real gap first, routine/clean families collapsed under a "טענות תקינות" fold rather than interleaved. This mirrors the actionable-default philosophy the Claim List UI already uses — the document should read the same way the interface already does, not introduce a second mental model.

**6. נספח — מפת טענות מלאה** — every claim, every authority, every evidence reference, in document order. This is where completeness lives, deliberately last.

### What NOT to do
Do not produce one long undifferentiated list sorted by paragraph number — that was the original complaint about the current per-claim view, and a document with the same flaw just adds a new format for the same problem. And do not hide low-confidence findings entirely (e.g. scope-expansion flags) — surface them, but visibly labeled as lower-confidence, in their own zone, never mixed at equal weight with a verified structural fact.

---

## Part B — separate brainstorm, unconstrained

You asked for this to be disconnected from what already exists, including ideas that might not work. Ranked roughly safe → speculative:

1. **Confidence-gated progressive disclosure.** The default view shows only high-confidence, high-severity findings; everything lower-confidence (scope-expansion, borderline contradictions) sits behind an explicit "הצג גם ממצאים בביטחון נמוך" toggle. This directly answers tonight's own finding — the scope-expansion check ran at roughly a 1-in-3 false-positive rate on real documents twice — by encoding the caution into the *interface*, not just the wording. Low risk, addresses a problem we already know is real.

2. **A heat-strip gutter alongside the original document.** Like a code-coverage gutter or git-blame margin: a thin colored strip next to the actual pleading text, red/amber/green per paragraph, so a lawyer scanning the source PDF sees hot spots without opening a separate report. Ties findings to source with zero translation layer. Risk: color alone doesn't carry "why," so it's a triage aid, not a replacement for the detail view.

3. **A comparative issue-matrix for cross-document cases.** Rows = disputed propositions, columns = each document's position, cells = admits/denies/silent. Genuinely good for a small number of central, hard-fought issues — the kind of table litigators already sketch by hand before a hearing. Weak fit for the long tail of minor claims; would need to coexist with, not replace, the per-claim view.

4. **Redlined/annotated original, like a marked-up exam.** Instead of an abstracted list, the actual document text with inline margin notes anchored to the exact sentence. Maximizes trust (nothing is abstracted away from the source) and matches how lawyers already mark up drafts. Risk: a document with many findings turns into a wall of margin notes with no sense of priority — this is why it should be a *view*, not the primary structure; it wants the executive summary from Part A sitting above it.

5. **"Second chair" devil's-advocate chat mode.** Instead of only reading a static verdict, the lawyer can ask "why is this a weakness?" or "what would fix it?" directly, and get the reasoning conversationally. This is the most on-brand idea here (it's literally what "Second Chair" is named for) and could make the tool feel like a colleague rather than a report generator. Heavier to build, and some users just want to read a report without a conversation — should supplement, not replace, a written document.

6. **Ship it as a memo, not a dashboard.** Generate actual prose — the way a senior associate writes a memo to a partner — rather than bullets and badges. Litigators are trained to read memos; a well-written one is directly forwardable to a partner or client with no adaptation. Risk: prose is harder to scan under time pressure than structured lists, and AI-generated formal prose can read as subtly artificial in a way bullet points don't.

7. **A literal "battle map."** A node graph — each side's Claim Families as nodes, edges for admits/denies/contradicts/repeats — so the *shape* of the dispute is visible at a glance (a handful of viciously contested points vs. a scattering of small disagreements). Genuinely useful for a lawyer trying to find "where's the actual fight," but risks looking more like a diagram-tool demo than serious legal work product, and will get unreadable past a few dozen claims without careful layout.

8. **Audio briefing.** A spoken summary for reviewing findings hands-free. Flagging this explicitly as the weakest idea here: legal analysis lives or dies on exact wording and citations, which audio is a bad medium for, and there's no signal yet that this is an actual user need rather than a novelty. Including it because you asked not to filter for safety, not because I'd prioritize building it.

**If I had to pick one to prototype first:** #1 (confidence-gating) is nearly free given what already exists tonight and directly fixes a demonstrated problem. #4 (redlined original) is the one most likely to feel obviously right to a lawyer the moment they see it, because it requires no new mental model at all.
