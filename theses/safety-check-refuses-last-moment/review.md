# Review — safety-check-refuses-last-moment

This record is the owner's. The residue at the end carries one empty
`classified:` field per line, and this tool never fills it: what a surviving
item is evidence about — the Packet, or ReviewDraft itself — is the judgment
the two-pass bound exists to hand over.

## What was reviewed

- **Draft.** `draft.md`
- **Body sha.** `b2b01a9f14716773f61bda623543aa2f4ff63644c008bee4e31207bc2f78bc86`
- **Opened.** 2026-09-07T12:03:58.743Z
- **Closed.** 2026-09-07T12:20:55.068Z
- **Passes.** two (compare, check)

### The Packets it was reviewed against

- `c1` — `../../runs/draft/safety-check-refuses-last-moment/packets/c1.md` sha `7ea8dbe9453a333e4683ff6bc7f8b4a25689b53dd7cb3ef9c0c03e5650c274ab`
- `c2` — `../../runs/draft/safety-check-refuses-last-moment/packets/c2.md` sha `99b6c3c0e068c57487ad14c7839a398eaab62a93e47b833503f73ecf35a05a86`
- `c3` — `../../runs/draft/safety-check-refuses-last-moment/packets/c3.md` sha `9020af3c6c61eafb128c3c043b58f92a7a205416aa3731beb041f02d7295fa40`
- `c4` — `../../runs/draft/safety-check-refuses-last-moment/packets/c4.md` sha `d738b86e19ae09995de69fdfbe536defbf0c92f02a473bc871ff3ba61c4d459f`
- `c5` — `../../runs/draft/safety-check-refuses-last-moment/packets/c5.md` sha `d12682ec552e0d7c2eccd7d1b0e5c1684e07c514e2527169593caefb523107ec`

## Findings

- **c1 / grounds** — fails (preserved)
  - this recovered claim pairs with no ground the Packet declares, so the passage asserts more than it was given — widened
  - span: [27,27]
- **c1 / concessions** — cannot-decide (preserved)
  - The recovered concessions are rendered as broken object placeholders instead of text, so there is nothing readable to compare against the declared ground.
  - span: [27,45]
- **c1 / register-tests** — fails (best-effort)
  - Sentences such as the closing line of the first paragraph and the line stating the rule for a fifth question each join two relations with 'and', breaking the one-relation-per-sentence test.
  - span: [27,45]
- **c1 / packet-wording** — fails (best-effort)
  - this line quotes the Packet rather than writing from it
  - evidence: industrial hazard studies apply about seven fixed prompts
  - span: [31,31]
- **c2 / grounds** — fails (preserved)
  - this recovered claim pairs with no ground the Packet declares, so the passage asserts more than it was given — widened
  - span: [49,49]
- **c2 / concessions** — cannot-decide (preserved)
  - The recovered concessions are rendered as malformed placeholder objects rather than actual text, so whether either ground was carried more weakly cannot be judged.
  - span: [49,57]
- **c2 / grounds-unused** — fails (best-effort)
  - a ground no recovered claim rests on
  - evidence: ground (step_effect c1): The reader is holding the prompt list and testing whether each item earns its place.
  - span: [49,57]
- **c2 / register-tests** — fails (best-effort)
  - The sentence joining the check runs, someone merged it, and a configuration entry names its file packs three relations into one sentence, breaking the one-relation-per-sentence test.
  - span: [49,57]
- **c3 / grounds** — fails (preserved)
  - this recovered claim pairs with no ground the Packet declares, so the passage asserts more than it was given — widened
  - span: [59,59]
- **c3 / restates-earlier-step** — fails (best-effort)
  - this line repeats an earlier Step verbatim
  - evidence: a fact the acting code can compute or
  - span: [61,61]
- **c3 / register-tests** — fails (best-effort)
  - Line sixty-seven packs two relations into one sentence with an and-clause, breaking the one-relation-per-sentence test.
  - span: [59,67]
- **c4 / grounds** — fails (preserved)
  - this recovered claim pairs with no ground the Packet declares, so the passage asserts more than it was given — widened
  - span: [71,71]
- **c4 / concessions** — cannot-decide (preserved)
  - The recovered-from-prose list is rendered as unusable placeholder objects rather than actual text, so whether either ground was carried weakly with no concession cannot be judged.
  - span: [71,83]
- **c4 / already-knows** — cannot-decide (best-effort)
  - Nothing was declared to compare against, and the excerpt alone does not show whether late refusal, spent reading, or the weak form were already established in an earlier step.
  - span: [71,83]
- **c4 / restates-earlier-step** — fails (best-effort)
  - this line repeats an earlier Step verbatim
  - evidence: reaches the moment it is meant to judge
  - span: [71,71]
- **c4 / register-tests** — fails (best-effort)
  - Several sentences put an abstract noun such as the fault, the cost, or the property in the acting-subject slot instead of a concrete actor, so the concrete-subject-acting test is not met.
  - span: [71,83]
- **c5 / grounds** — fails (preserved)
  - this recovered claim pairs with no ground the Packet declares, so the passage asserts more than it was given — widened
  - span: [85,85]
- **c5 / concessions** — cannot-decide (preserved)
  - The recovered concessions are malformed placeholder objects rather than text, so there is nothing usable to compare against the declared grounds.
  - span: [85,97]

## The cold reader — Section findings

- **Section 1 / section-question** — fails (preserved)
  - The heading promises four questions to ask while installing a check, but the recovered question asks what replaces recognition, which is the section's opening framing rather than the question its heading names.
  - declared: Four questions to ask while you are installing a check
  - recovered: If recognising a class of defect after reading about it does not actually help me catch it, what replaces recognition?
  - span: [25,47]
  - route: corrected at **c1** — a preserved item already fails on this Step, so the Section's finding is that Step's
- **Section 2 / section-belief-before** — fails (best-effort)
  - The declared starting belief is the naive single-yes-or-no reading of one question, but the recovered text is an already-advanced conclusion about a tiny fixed set of questions and the load-bearing shortness of that list, so the section opens on a reader who does not exist yet.
  - declared: The reader has a prompt and reads it as a single yes-or-no about whether the check was installed.
  - recovered: I now believe that noticing a bad check is not something better attention can deliver, because attention runs along the line of the rule being enforced and checks fail off that line; what works instead is a deliberately tiny fixed set of questions — here four — that you ask because you are installing a check at all, not because you judged this one risky. I also believe the list's shortness is the load-bearing property, and that additions are only earned by a real miss of something that was available.
  - span: [49,83]
  - route: corrected at **c2** — a preserved item already fails on this Step, so the Section's finding is that Step's
- **Section 3 / section-question** — fails (preserved)
  - The heading promises only where the refusal sits in the process, but the recovered question also covers what a fourth question sees that the first three cannot, a second topic the heading does not name.
  - declared: Where the refusal sits in the process
  - recovered: Why is a check that fires correctly still not necessarily in the right place, and what does a fourth question see that the first three cannot?
  - span: [85,115]
  - route: corrected at **c4** — a preserved item already fails on this Step, so the Section's finding is that Step's
- **Section 3 / final-claim** — fails (preserved)
  - The recovered text states a broad four-question checklist claim about installing safety checks generally, while the declared line makes the narrower, specific claim that a correctly-refusing last-moment check is not necessarily in the right place.
  - declared: A safety check that refuses work at the last moment is not necessarily in the right place, even when its refusal is correct.
  - recovered: Installing a safety check is a moment that deserves a fixed four-question checklist rather than more care, because the ways checks fail — an input with no writer, a rule about something the check was never handed, a fact given to a human or a judgment given to a flag, a correct refusal billed to the wrong party, and a sequence whose earlier step revokes what a later one needs — all leave the system reading as safe and sit off the line of attention the installer is already following. The list's authority comes from being short and triggered by the act, so it is asked at all, and it grows only when something genuinely available was missed with no existing question standing where it could have seen it.
  - span: [85,115]
  - route: corrected at **c4** — a preserved item already fails on this Step, so the Section's finding is that Step's

## Corrections

- **c1** (pass 1) — re-realized from a Packet re-rendered against the article as it stood, with a Correction block carrying 3 failed item(s) and 6 held preserved item(s)
  - change share: 14 of 18 sentence(s) differ from the previous realization
  - packet overlap: 1 of 10 line(s) repeat a run of the Packet's ground or state wording
- **c2** (pass 1) — re-realized from a Packet re-rendered against the article as it stood, with a Correction block carrying 4 failed item(s) and 5 held preserved item(s)
  - change share: 19 of 19 sentence(s) differ from the previous realization
  - packet overlap: 0 of 5 line(s) repeat a run of the Packet's ground or state wording
- **c3** (pass 1) — re-realized from a Packet re-rendered against the article as it stood, with a Correction block carrying 3 failed item(s) and 6 held preserved item(s)
  - change share: 16 of 16 sentence(s) differ from the previous realization
  - packet overlap: 0 of 5 line(s) repeat a run of the Packet's ground or state wording
- **c4** (pass 1) — re-realized from a Packet re-rendered against the article as it stood, with a Correction block carrying 3 failed item(s) and 5 held preserved item(s)
  - change share: 27 of 28 sentence(s) differ from the previous realization
  - packet overlap: 0 of 7 line(s) repeat a run of the Packet's ground or state wording
- **c5** (pass 1) — re-realized from a Packet re-rendered against the article as it stood, with a Correction block carrying 4 failed item(s) and 4 held preserved item(s)
  - change share: 21 of 21 sentence(s) differ from the previous realization
  - packet overlap: 0 of 7 line(s) repeat a run of the Packet's ground or state wording

## Residue

Each line is an item that survived every pass this run made. Fill
`classified:` with `packet` or `reviewdraft`.

- **c1 / grounds** — this recovered claim pairs with no ground the Packet declares, so the passage asserts more than it was given — widened — still failing after pass two
  classified:
- **c2 / grounds** — this recovered claim pairs with no ground the Packet declares, so the passage asserts more than it was given — widened — still failing after pass two
  classified:
- **c3 / grounds** — this recovered claim pairs with no ground the Packet declares, so the passage asserts more than it was given — widened — still failing after pass two
  classified:
- **c4 / grounds** — this recovered claim pairs with no ground the Packet declares, so the passage asserts more than it was given — widened — still failing after pass two
  classified:
- **c5 / grounds** — this recovered claim pairs with no ground the Packet declares, so the passage asserts more than it was given — widened — still failing after pass two
  classified:

