# Document-Type-Aware QA Rules for Israeli Civil Pleadings
### Research memo for Second Chair — stage-aware analysis rules
Prepared 2026-09-10. Governing framework: **תקנות סדר הדין האזרחי, תשע"ט-2018** ("the 2018 Regulations"), which replaced the 1984 regulations for proceedings filed after October 2021 (family courts and some tracks have partial carve-outs not covered here).

**How to read the confidence labels in this memo:**
- **[VERIFIED]** — grounded in a specific regulation number, statute, or case-law principle found via search, with the source noted.
- **[LIKELY, NOT VERBATIM-CONFIRMED]** — the substance was corroborated by more than one independent source (search engine summaries of Nevo/Wikisource text), but I was not able to open a clean, fully-searchable copy of the consolidated regulation text to quote it verbatim. Numbering and exact page/day counts in this category should get a final human read-through of the authoritative Nevo text before being hard-coded as product rules.
- **[PRODUCT JUDGMENT]** — my own inference about what should be flagged, not a legal requirement I can cite. Clearly separated so it can be revised without touching legal claims.
- **[OPEN QUESTION]** — I could not resolve this and flag it for a human lawyer.

Primary sources used: the consolidated regulation text hosted at nevo.co.il (`https://www.nevo.co.il/law_html/law00/157751.htm`), the Wikisource transcription of the current regulations, and multiple secondary commentary/law-firm sources found via search. I was not able to render the official gov.il PDF (binary/font-embedded, no OCR tool available in this environment) or the Ministry of Justice explanatory page (403 blocked). Where a claim rests only on a search-engine's AI summary of these pages rather than a directly quoted passage, it is marked accordingly below.

---

## Addendum — independent follow-up verification (same night, separate pass)

Before building anything on this memo, I (the orchestrating session, not the research subagent) ran a second, independent WebSearch/WebFetch pass against the Wikisource consolidated text specifically to cross-check the highest-stakes claims (§1 and §3) before writing product code against them. Two results:

1. **Numbering for תקנה 9–15 and 18 is now corroborated by a second independent fetch**, closely matching this memo's account — reasonable confidence for the numbering itself, though still not a verbatim primary-source read.

2. **A discrepancy worth flagging prominently, NOT yet resolved — needs your confirmation before any product rule relies on it.** The follow-up fetch returned this for תקנה 14: *"הנתבע ייחשב מודה בכל העובדות הכלולות בכתב התביעה אלא אם הכחיש במפורש"* — "the defendant will be deemed to admit all facts included in the complaint unless expressly denied." That is a **specific deemed-admission rule**, materially stronger than this memo's §2 treatment ("silence on a factual allegation is not automatically an admission the way it can be in some other systems"). If accurate, it would upgrade "complaint allegation the defense never addresses" from a soft, PRODUCT-JUDGMENT-level flag ("worth surfacing as a gap") to something with real, citable legal consequence — a much stronger and more useful signal, but also one that would be a serious product error to assert if wrong (telling a lawyer "the other side is now deemed to have admitted this" carries real weight). **This came from one AI-summarized fetch, same caveat this memo applies everywhere else — I have not implemented anything tonight that assumes it's true, and the Stage 2 implementation only uses the well-corroborated, lower-stakes rules (evidentiary-standard-by-stage).** Flagged in the final open-questions list below and in the morning report.

---

## 1. Complaint (כתב תביעה)

**Procedural function:** Opens the proceeding; frames the causes of action, relief sought, and the factual/legal basis the defendant must answer.

**Structure — [VERIFIED], תקנה 9(ג):** A כתב תביעה (and כתב הגנה) must contain exactly three parts, in this order: (1) כותרת (heading), (2) תמצית הטענות (summary of contentions), (3) פירוט הטענות (detailed contentions). This tripartite structure is new to the 2018 reform (the 1984 regulations did not mandate this split) and is itself something the product should recognize structurally.

**What it must contain:**
- **Heading (תקנה 10) — [LIKELY, NOT VERBATIM-CONFIRMED]:** court identity; plaintiff's name/ID and attorney details; contact/address details of plaintiff and attorney (with an exception for sensitive claims — sexual offenses/violence — where the plaintiff's address may be withheld); defendant's identity and address; party-capacity notations (minor, legally incompetent, corporate entity); case classification per the administrative subject list; **the full list of remedies sought** (with claim value) — note: the regulation requires *all* remedies arising from one cause of action to be included, so a claim that reserves relief "for a later proceeding" without justification is a structural irregularity, not a substantive one; court fee reference; disclosure of related/pending proceedings between the same parties; method of service.
- **Summary section (תקנה 11) — [LIKELY, NOT VERBATIM-CONFIRMED]:** brief description of the parties; the relief sought, in summary form; a summary of the facts necessary to establish the cause of action and when it arose; and the facts establishing the court's jurisdiction (subject-matter and territorial).
- **Detailed section (תקנה 14) — [OPEN QUESTION / LOW CONFIDENCE]:** I could not retrieve verbatim text for תקנה 14. Multiple sources describe it as requiring a full, particularized statement of the material facts underlying each cause of action (consistent with the long-standing Israeli pleading standard of "עובדות מהותיות" — material facts — rather than evidence). **This is the crux provision for the product's false-positive problem and should get a direct human read of the Nevo text before rules are finalized**, but every secondary source is consistent that this part calls for *factual allegations*, not proof.
- **Attachments (תקנה 15) — [VERIFIED via consistent multi-source corroboration, treat numbering as LIKELY not certain]:** the complaint must attach a copy of any "material document" (**מסמך מהותי**) that forms an integral part of the cause of action — e.g., the contract sued upon, an insurance policy, a bank guarantee, a land-registry extract identifying the property/owners — or, if the party does not hold the document, state to the best of their knowledge who does/where it can be found. Medical expert opinions the party intends to rely on must be attached, and personal-injury claims must attach a medical-confidentiality waiver. **This is legally significant and distinct from an evidentiary-proof requirement** — see the "central distinction" callout below.

**Explicitly NOT required:**
- Proof, or citation of evidentiary support, for factual allegations. The complaint states facts; it does not need to establish them. This is the core problem the product must stop flagging.
- Anticipatory rebuttal of defenses not yet raised.
- Full argument on legal issues (the detailed section states the factual and legal basis, but Israeli complaints are not expected to brief legal argument at complaint-drafting depth the way a summation would).

**Genuine weaknesses a litigator would flag [PRODUCT JUDGMENT, but grounded in the above]:**
- A cause of action is invoked but its constituent material facts are simply absent from the detailed section (not "unproven" — actually *unstated*, e.g., no factual allegation of causation for a negligence claim).
- A "material document" under תקנה 15 is referenced in the narrative (e.g., "as set out in the agreement between the parties") but not attached and no explanation given for its absence.
- Relief is listed in the heading that has no corresponding factual basis anywhere in the body, or vice versa (a fact pattern supports a remedy never listed — this can matter because of the "all remedies from one cause of action" rule).
- Jurisdictional/venue facts are missing entirely (תקנה 11 requires them specifically).
- Internal inconsistency: the summary section and the detailed section describe materially different facts or timelines.

**What should NOT be flagged [central to this project]:**
- Absence of witness statements, expert reports (other than the medical-opinion attachment rule above), correspondence logs, or other evidentiary substantiation of disputed facts — that is for the evidentiary stage (discovery, expert stage, trial), not the pleading stage.
- Absence of case law or legal authority citations supporting the legal characterization of the facts — pleadings are not required to brief law the way summations are.
- Failure to preemptively address defenses that have not yet been filed.

**Procedurally improper if introduced only later:** N/A for the complaint itself — it is the origin document. (See "stage-transition rules," §8, for consistency checks looking *forward* from the complaint.)

---

## 2. Defense (כתב הגנה)

**Procedural function:** Answers the complaint's causes of action; raises preliminary objections and any defenses.

**Structure:** Same tripartite structure as the complaint (תקנה 9(ג)).

**What it must contain:**
- **Heading (תקנה 12) — [LIKELY, NOT VERBATIM-CONFIRMED]:** mirrors the complaint's heading requirements (parties, attorney, contact details, party capacity), plus reference to the existing case/file number.
- **Summary (תקנה 13) — [LIKELY, NOT VERBATIM-CONFIRMED]:** (1) preliminary objections (טענות מקדמיות), if any (e.g., lack of jurisdiction, limitations, standing); (2) a summary of the defenses, **organized by the complaint's causes of action** — i.e., the regulation itself requires point-by-point structural correspondence to the complaint, which is directly checkable; (3) arguments regarding the relief sought.
- **Detailed section:** the material facts underlying each defense, by the same logic as תקנה 14 for complaints.
- **Filing deadline — [LIKELY, NOT VERBATIM-CONFIRMED, found via search of תקנה 9-area text]:** ordinarily 60 days from service of the complaint; 120 days for medical-negligence claims; extendable by the court for good cause.

**Explicitly NOT required:** same evidentiary point as the complaint — the defense states its factual position; it does not need to prove it there.

**Genuine weaknesses to flag [PRODUCT JUDGMENT]:**
- **A complaint allegation that is nowhere addressed** — this is the single highest-value cross-document check for a defense (see §8). Under general pleading principle (long pre-dating 2018, continued under the new regulations), silence on a factual allegation is not automatically an admission the way it can be in some other systems, but a competent defense conventionally denies or admits each material allegation; a defense that structurally omits an entire cause of action deserves a flag.
- Preliminary objections raised without any corresponding factual basis for them elsewhere in the pleading.
- A defense whose "summary" section (תקנה 13) does not track the complaint's causes of action in the order the regulation requires — this is a structural, checkable defect, not a stylistic one.

**What should NOT be flagged:** absence of evidence for the defense's own factual assertions (same principle as the complaint) or absence of a rebuttal to arguments the complaint didn't make.

**Improper if introduced later:** raising an entirely new preliminary objection or defense theory for the first time in a later document (reply exchanges, motions, or summations) without amendment leave — flag as a potential procedural irregularity at that later stage, with the defense as the baseline for comparison (see §8).

---

## 3. Reply to Defense (כתב תשובה)

**This is the item you flagged for careful verification. Findings below directly bear on your recollection that it "may now require leave of court."**

**[VERIFIED — corroborated by multiple independent search passes against the current regulation text, תקנה 18]:**
- The **reply itself is a matter of right, not leave** — the plaintiff **may** file a כתב תשובה within **14 days** of service of the defense. No application to the court or registrar is needed to file it.
- **Content restriction (תקנה 18(א)):** the reply **may not include a new cause-of-action ground (נימוק תביעה חדש), nor any contention inconsistent with the plaintiff's prior pleading.** Its function is narrowly to respond to what the defense raised — not to introduce new theories.
- **Length limit (תקנה 18(ב)):** capped at **3 pages**, excluding the heading — itself a signal of how narrow its intended function is.
- **Consequence of not filing:** if the plaintiff files no reply, the plaintiff is deemed to deny all of the defense's allegations, **except any that were expressly admitted** in the complaint or elsewhere.
- **Counterclaims:** the same complaint/defense/reply structure applies, "with necessary modifications," to a counterclaim, its defense, and the reply to that defense (כתב תביעה שכנגד / הגנה שכנגד / תשובה שכנגד).

**The actual leave-of-court rule, and why your recollection is partly right — [VERIFIED via search of the regulation text]:**
> "לאחר כתב תשובה לא יוגש שום כתב טענות אלא ברשות בית המשפט או הרשם ובתנאים שייראו לו" — *after the reply, no further pleading may be filed except with leave of the court or the registrar and on such terms as it sees fit.*

So: **the reply to the defense itself does NOT require leave** — but it is (subject to the counterclaim mechanics above) generally **the last pleading a party may file as of right**. Anything beyond the reply (a further response, a "sur-reply," etc.) **does** require leave. This is likely the actual source of your recollection, and it is an important distinction for the product: a system that flags "no leave sought" on an ordinary, timely, in-scope כתב תשובה would itself be committing a false positive. The leave requirement bites only on documents *after* the reply.

**What should NOT be flagged:** absence of evidentiary citation (same evidentiary-stage logic as complaint/defense); absence of a reply at all (this is optional and has a defined default legal consequence, not a deficiency).

**Genuine weaknesses to flag [PRODUCT JUDGMENT, directly grounded in תקנה 18(א)]:**
- A reply that raises a **new legal theory or cause of action** not in the original complaint — this is an explicit regulatory violation, not just a stylistic issue, and is one of the highest-confidence "improper new material" checks in the whole matrix.
- A reply that contradicts a position taken in the complaint (the regulation's "not inconsistent with prior contentions" language).
- A reply that exceeds the 3-page function by substantively re-arguing the whole case rather than responding to the defense.

---

## 4. Motion / Application (בקשה)

**Procedural function:** Requests an interlocutory order or ruling from the court outside the ordinary pleading exchange (e.g., extension of time, discovery order, interim relief, summary judgment (in the "leave to defend"/execution-proceedings sense), joinder, amendment).

**[LIKELY, NOT VERBATIM-CONFIRMED — cross-confirmed by two independent search passes, תקנה 50]:**
- A written motion must include reasoned argument with legal citations (אסמכתאות), **and must be accompanied by a supporting affidavit (תצהיר) verifying the facts underlying it.** This is the operative Israeli-practice rule you asked me to confirm: **factual assertions in a motion are expected to be affidavit-supported**, unlike factual assertions in a complaint/defense.
- If the court determines the motion requires a response, the respondent may respond within a window described in sources as "14 to 20 days" from service of that decision (the exact figure needs a direct-text check — see below), or another period set by the court. **The response must likewise include reasoned argument and its own supporting affidavit.**
- The court may decide the motion on the papers (motion + response + affidavits) alone, or — if needed — after cross-examining the affiants on their affidavits.
- **Length limits:** motion and response each capped at 5 pages (8 pages for a request for interim relief); each supporting affidavit capped at 3 pages (6 pages for interim relief), excluding headings.
- **Advance notice — [LOWER CONFIDENCE, single source, תקנה 49(ד) as reported]:** ordinary motions generally require at least 7 days' notice to the opposing side before filing, except emergency interim-relief applications.
- **Timing restriction — [LOWER CONFIDENCE, single source, תקנה 49]:** the regulations restrict filing most motions in the window between the close of pleadings and the first pre-trial (קדם משפט) conference, carving out named exceptions (interim relief, early witness examination, arbitration-related motions, expert-examination requests, joinder/consolidation, pleading amendment, judicial disqualification, exemption from attendance, settlement approval, challenges to expert appointment). **This restriction, if confirmed, is a real cross-document/temporal check worth building** (a motion of a type not in the exception list, filed in that window, is a procedural anomaly) — but flag it as needing verification before being hard-coded, since it rests on a single AI-summarized fetch.

**What it must contain:** the specific relief sought, the grounds (factual and legal) for it, the supporting affidavit, and — where relevant — a certification of the required advance notice to the other side.

**What it must NOT contain / explicitly not required:**
- It is not required to relitigate the full merits of the underlying case; scope should track the specific interlocutory relief sought.

**Genuine weaknesses to flag [PRODUCT JUDGMENT, grounded in תקנה 50's affidavit rule]:**
- **A motion asserting facts with no supporting affidavit at all**, or an affidavit that does not actually verify the specific facts argued in the motion body (e.g., affidavit is generic/conclusory while the motion argument relies on granular factual claims). This is the mirror image of the complaint/defense rule: **for motions, "no evidentiary support" is a legitimate flag**, precisely because the regulation requires affidavit support here in a way it does not for ordinary pleadings.
- A motion that omits the required advance-notice certification, if that requirement is confirmed.
- A motion filed in the pleadings-closed/pre-trial window whose subject matter doesn't fall within the enumerated exceptions (needs verification, see above).

**What should NOT be flagged:** absence of documentary exhibits beyond what supports the specific relief requested; absence of full legal briefing depth expected of summations.

---

## 5. Response to Motion (תגובה לבקשה)

Governed by the **same תקנה 50** as the motion itself — the regulations do not treat the response as a separately numbered document type with its own rule, which matters for the product: **the response should be checked against the same affidavit/argument/length structure as the motion**, not a different rule set.

**What it must contain:** reasoned argument responding to the motion, with citations, **and its own supporting affidavit** verifying the facts underlying the response (same rule as the motion — [LIKELY, NOT VERBATIM-CONFIRMED, cross-confirmed twice]).

**Genuine weaknesses to flag:**
- Fails to address specific grounds raised in the motion (silence on a discrete argument).
- Asserts facts contradicting the motion without its own affidavit support.

**What should NOT be flagged:** raising every conceivable defense to the relief sought is not required — the response only needs to engage with the actual grounds in the motion.

**Improper to introduce:** an entirely new procedural request of the respondent's own (e.g., asking for unrelated relief) — that should be a separate motion, not smuggled into a response.

---

## 6. Reply in Support of Motion (תשובה לתגובה)

**[VERIFIED principle, though the case-law sources I found frame it in the class-action certification-motion context specifically; treat the extension to ordinary civil motions as LIKELY, NOT VERBATIM-CONFIRMED for the general-motion setting]:**

There is no separate provision guaranteeing a movant an automatic further reply after the response — תקנה 50 contemplates the court deciding "on the basis of the motion and the responses alone," implying a further reply is not built into the base procedure and rests on the court's discretion/practice.

**Established case-law principle on scope (found articulated for reply-to-response-to-certification-motion, and understood in this memo as a specific application of a general Israeli civil-procedure norm rather than a class-action-only rule) — [VERIFIED for that specific context; generalization is PRODUCT JUDGMENT pending a source in the ordinary-motion context]:**
> A reply to a response exists only to answer arguments the response itself raised — "as an auxiliary tool through which to substantiate what was stated in the [original] request, and nothing more." Arguments or evidence that **do not add a new factual or legal element** relative to the original motion are treated as legitimate direct response and may be included without leave. Arguments or evidence that **do add a new factual or legal element, or that depart from the motion's original theory, are not a "response" and require leave** to include.
> The dividing line — courts describe it as not always simple to draw — is **whether the reply's content has a genuine connective thread back to the defense/argument actually raised in the response**, versus opening a new front of argument.

**This is one of the most product-relevant findings in this whole memo**: it gives a concrete, checkable test — *"does each new point in the reply trace back to something the response raised, or is it net-new relative to the motion?"* — for flagging improper scope creep in exactly the stage your spec calls out ("motion reply improperly introducing a new factual basis").

**Genuine weaknesses to flag:** a reply that introduces facts or legal grounds absent from both the motion and the response — i.e., first appearing at the reply stage. Per the doctrine above, this is a real, well-grounded flag (subject to the class-action-context caveat).

**What should NOT be flagged:** a reply that responds to a point the response actually made, even if that point wasn't in the original motion — that is legitimate rebuttal, not scope creep, precisely because it's responsive to the other side's own submission.

---

## 7. Written Summations (סיכומים)

**[LIKELY, NOT VERBATIM-CONFIRMED, single primary-source fetch, תקנה 74]:** Summations are presumptively **oral**, delivered after the evidentiary stage closes. The court may direct **written** summations instead, considering (per the regulation's own stated factors) "the scope of the written and oral evidence, the complexity of the claim, and the nature of the dispute between the parties." For the expedited/small-claims-adjacent track, **תקנה 80(ז)** — [LOWER CONFIDENCE, single source] — permits a shortened form: a list of legal authorities and headline arguments (עיקרי טיעון), capped at 5 pages combined for both parties.

**What summations are supposed to accomplish:** tie the facts actually established at the evidentiary stage (testimony, cross-examination, documents admitted as exhibits) to the legal conclusions the party wants the court to draw. This is the procedural point in the case where "the record" (as opposed to "the allegations") becomes the currency of argument.

**[OPEN QUESTION / not independently verified against a specific regulation]:** I found **no specific regulation** in the 2018 Regulations expressly requiring that every factual proposition in a summation be tied to a citation of the evidentiary record (protocol page, exhibit number, witness testimony). This may exist in practice directions, individual judges' case-management orders, or unwritten professional norm/appellate expectation, but I could not verify a textual source for it as a *regulatory* requirement in the time available.
- **[PRODUCT JUDGMENT]:** Regardless of whether it's a codified regulation, it is well understood in Israeli litigation practice — and is the entire premise of your product spec — that by the summation stage, a factual assertion with **no record support anywhere** (no testimony, no admitted exhibit, no admission) is a real and legitimate weakness, because the evidentiary opportunity has closed. This is the mirror-image rule to the complaint/defense: **absence of evidentiary grounding is a non-issue pre-trial, and a real issue post-trial (at summations).**
- I recommend treating "tie factual claims to the evidentiary record" as a **product rule you are entitled to apply with confidence as a matter of litigation practice**, while being explicit internally that it is not itself a quoted regulation — a nuance worth keeping distinct from the sourced regulation numbers above, per your standards section.

**Genuine weaknesses to flag:**
- A factual proposition central to the argument that has no traceable record support (no exhibit, no testimony, no stipulation/admission) by the summation stage.
- A summation that argues a cause of action, defense, or remedy that was never pleaded and never the subject of a proper amendment — this is a real "new material at the wrong stage" flag (see §8).
- A summation abandoning, without acknowledgment, a position central to the pleadings, when that shift itself may be legally significant (e.g., prior admissions).

**What should NOT be flagged:** citation-light argument on pure legal questions not turning on factual proof (e.g., statutory interpretation) doesn't need "record" citations in the same way factual claims do.

---

## 8. Stage-Transition Rules (cross-document, temporal patterns)

These are the checks that only make sense comparing two or more documents over time — the section your spec calls out as most important.

1. **Complaint → Defense: unaddressed allegation.** A material factual allegation in the complaint that the defense's summary section (תקנה 13, which must track the complaint's causes of action) does not address at all, and that is not otherwise deniable-by-omission under general pleading practice, is worth flagging as a gap in the defense. **[PRODUCT JUDGMENT, grounded in the תקנה 13 structural requirement]**

2. **Defense → Reply: new-ground check.** A reply (כתב תשובה) containing a cause-of-action theory, remedy, or factual position **not present in the original complaint** is a direct violation of תקנה 18(א)'s "no new ground, no inconsistency" restriction. **[VERIFIED regulatory basis]** — high-confidence, mechanically checkable (diff the reply's assertions against the complaint's).

3. **Reply → later documents: the "last pleading of right" boundary.** Any pleading-type document appearing after the reply, without a visible leave-of-court basis, is procedurally suspect — not the reply itself. **[VERIFIED regulatory basis: post-reply leave requirement]**

4. **Motion → Response → Reply: scope creep.** A reply-to-response introducing facts or arguments that trace back to nothing in either the motion or the response is improper scope expansion; a reply-to-response that responds to something the response itself raised is legitimate, even if novel relative to the motion. **[VERIFIED doctrinal test, generalization from class-action-specific case law — see §6 caveat]**

5. **Any pleading → Summations: the "should have been evidence by now" flip.** A factual claim it was fine to leave unproven in the complaint/defense becomes a legitimate weakness if it is *still* unsupported by anything in the evidentiary record by the time summations are filed. The product should treat this as a **document-type-and-stage-relative** rule, not a fixed rule about the claim itself — same fact, different verdict depending on which document stage is being analyzed. **[Core design principle for this feature; regulatory grounding is partial per §7's open question, but the underlying practice logic is sound.]**

6. **Any pleading → Summations: quiet abandonment or contradiction.** A position taken in the complaint/defense that is materially changed, narrowed, or dropped by summations without explanation is worth flagging — not necessarily as improper, but as a fact pattern a litigator would want surfaced (it can affect costs, credibility, waiver, or estoppel arguments). **[PRODUCT JUDGMENT — litigation-practice inference, not a specific regulation.]**

7. **Complaint → Defense → Reply, remedy consistency.** Because תקנה 10 requires the complaint to list *all* remedies from a single cause of action, a later document (reply, or especially summations) that requests relief absent from that original list is worth flagging as a potential improper late addition, subject to the general rules on amendment. **[PRODUCT JUDGMENT, grounded in the תקנה 10 "all remedies" rule]**

8. **Motion timing vs. pleadings-closed window.** If the (unverified, §4) restriction on filing most motion types between close of pleadings and the pre-trial conference is confirmed, a motion of a non-exempt type filed in that window is a checkable procedural anomaly. **[Flagged pending verification.]**

---

## 9. Summary: Verified vs. Product Judgment vs. Open Questions

### (a) Real regulatory/case-law grounding found and cited
- Tripartite structure (heading / summary / detailed) for complaint and defense — **תקנה 9(ג)**.
- Complaint heading and summary content — **תקנה 10, 11** (numbering cross-confirmed by two independent source fetches; exact sub-clause wording not independently verified verbatim).
- Defense heading and summary content, including the requirement that the defense summary track the complaint's causes of action in order — **תקנה 12, 13**.
- Material-document attachment obligation (מסמך מהותי) distinct from proof of disputed facts — **תקנה 15** (numbering and substance cross-confirmed).
- Reply to defense: 14-day window, no new ground/no inconsistency restriction, 3-page cap, default-denial consequence for not filing — **תקנה 18(א)–(ב)** (cross-confirmed by three independent search passes with consistent content).
- Post-reply leave-of-court requirement for any further pleading — confirmed via direct quotation obtained from search of the regulation text.
- Counterclaim mechanics mirror the complaint/defense/reply structure "with necessary modifications" — confirmed via direct quotation.
- Motion affidavit requirement, response affidavit requirement, and length caps — **תקנה 50** (cross-confirmed twice, consistent detail on both occasions).
- Reply-to-response scope-limitation doctrine ("no new factual/legal element without leave") — confirmed via case-law-derived language, though specifically situated in the class-action certification-motion line of authority.

### (b) Reasonable product/design judgment, not an independently verified legal requirement
- Treating "material document referenced but not attached" as a flaggable weakness at the pleading stage (the underlying attachment duty is verified; treating a violation of it as a "weakness" worth surfacing to the user is a product design choice, though a well-grounded one).
- Treating unaddressed complaint allegations in a defense as a flaggable gap (the structural תקנה 13 requirement is verified; the inference that silence = weakness is practice-based judgment).
- The entire "should have been evidence by now" flip for summations — sound litigation logic, but I could not find a specific regulation requiring record-citation in summations.
- Quiet abandonment/contradiction across stages as worth surfacing (sound practice instinct, not a citable rule).
- Extending the reply-to-response scope doctrine from its class-action-certification origin to ordinary civil motions generally.

### (c) Open questions for a human lawyer to confirm before these become hard product rules
- **[HIGHEST PRIORITY — added in the follow-up verification addendum above] Does תקנה 14 impose a deemed-admission rule** (unaddressed complaint facts are deemed admitted absent express denial)? If confirmed, this should replace the current soft "worth flagging as a gap" treatment of unaddressed complaint allegations in a defense (§2, §8.1) with a much stronger, legally-grounded flag — but nothing should change until this is confirmed against a verbatim source, given the cost of being wrong here.
- **Verbatim text of תקנה 14** (complaint's detailed/third section) — I could not retrieve or quote it directly; its exact wording matters for calibrating what counts as a "missing material fact" versus an over-eager flag.
- **Exact response/reply day-counts and the pleadings-closed motion-timing restriction (תקנה 49)** — sourced from only one AI-summarized fetch each; please verify against the authoritative Nevo text or the official Reshumot publication before encoding specific day-counts.
- **Whether any regulation (as opposed to practice norm) expressly requires summations to cite the evidentiary record** — I found none; worth a direct check with a litigator or a search of appellate case law on summation adequacy.
- **Whether the reply-to-response scope doctrine (§6) has a reported decision in an ordinary (non-class-action) motion context** — would strengthen the citation for that rule.
- I was unable to access the official gov.il regulation PDF (font-embedded, no local OCR tool) or the Ministry of Justice's explanatory notes page (HTTP 403). A follow-up with proper tooling (or a firm's paid Nevo/Takdin access) could close the remaining verbatim-text gaps identified above.
