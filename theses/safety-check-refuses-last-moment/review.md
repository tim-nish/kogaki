# Review — safety-check-refuses-last-moment

This record is the owner's. The residue at the end carries one empty
`classified:` field per line, and this tool never fills it: what a surviving
item is evidence about — the Packet, or ReviewDraft itself — is the judgment
the two-pass bound exists to hand over.

## What was reviewed

- **Draft reviewed.** `draft.md` — restored to the article this run read, byte for byte.
- **Reviewed Draft.** `draft.reviewed.md` — the article with this run's 3 correction(s) in it.
- **Body sha.** `81d9258f257f29325c004db05e3957acad660b9f10d8b29239d797f7c92abdaa`
- **Opened.** 2026-09-08T08:10:31.758Z
- **Closed.** 2026-09-08T08:25:34.444Z
- **Passes.** two (compare, check)

### The Packets it was reviewed against

- `c1` — `../../runs/draft/safety-check-refuses-last-moment/packets/c1.md` sha `7ea8dbe9453a333e4683ff6bc7f8b4a25689b53dd7cb3ef9c0c03e5650c274ab`
- `c2` — `../../runs/draft/safety-check-refuses-last-moment/packets/c2.md` sha `0a9a1c8c0dcbaf0950a9a84aa8dd9d7c94eeb5e7972e7bf000120a8c087d814a`
- `c3` — `../../runs/draft/safety-check-refuses-last-moment/packets/c3.md` sha `2cf985013669e27c4fd5d85e481eb10f9981bb672801764553c6f14684e86ad9`
- `c4` — `../../runs/draft/safety-check-refuses-last-moment/packets/c4.md` sha `b409e698cbaa623b5b553d1d818c161287dcbbb15acf809d84ecb308cc010545`
- `c5` — `../../runs/draft/safety-check-refuses-last-moment/packets/c5.md` sha `2619cc499b426eaf419fd735a47cf01d41be18ef0c9d36c4c8435f3ab5c5dcfe`

### Where this run's evidence is

The workspace is `/home/tomoya/work/kogaki/runs/review/safety-check-refuses-last-moment` — machine state, gitignored and pruned to the last few
runs. Each pass wrote only under its own directory:

- **Pass 1 — `compare`.** `runs/review/safety-check-refuses-last-moment/pass-1/`
  - `recovery/<step>.md` — what the blind reviewer was handed
  - `recovered/<step>.json` — what they wrote back
  - `join/<step>.<item>[.<pair>].md` — the pair each verdict was given on
  - `ledger/` — the cold reader's Section entries and final claim
  - `corrections/<step>.md` — the input each correction was written from
  - `join.json` — pass one's verdicts, and which pairs were decided mechanically
- **Pass 2 — `check`.** `runs/review/safety-check-refuses-last-moment/pass-2/`
  - `recovery/<step>.md` and `recovered/<step>.json` — the corrected Steps, re-read blind
  - `join/<step>.<item>[.<pair>].md` — the pairs inside the second pass's bound
  - `check.json` — pass two's verdicts, the bound it applied, and what it carried

A pair pass two carried rather than re-judged has its verdict in `pass-1/join.json`
and its input under `pass-1/join/`; the bound in `check.json` says which.

- **Snapshots.** `runs/review/safety-check-refuses-last-moment/snapshots/` — the article before and after each correction.
- **Run record.** `runs/review/safety-check-refuses-last-moment/run.json` — every path above, per Step, as it was written.

## Findings

- **c1 / register-tests** — fails (best-effort)
  - Multiple relations joined by semicolon in line twenty-nine violate the one relation per sentence test.
  - span: [27,42]
  - recovered record: `runs/review/safety-check-refuses-last-moment/pass-1/recovered/c1.json`
  - the pair the judge saw: `runs/review/safety-check-refuses-last-moment/pass-1/join/c1.register-tests.md`
- **c2 / grounds-unused** — fails (best-effort)
  - a ground no recovered claim rests on
  - evidence: ground (step_effect c1): The reader is holding the prompt list and testing whether each item earns its place.
  - span: [46,56]
  - recovered record: `runs/review/safety-check-refuses-last-moment/pass-1/recovered/c2.json`
  - the pair the judge saw: none — this line was not a judge's answer to a rendered Packet; `runs/review/safety-check-refuses-last-moment/pass-2/check.json` records how it was decided
- **c2 / packet-wording** — fails (best-effort)
  - this line quotes the Packet rather than writing from it
  - evidence: every shipped component is called from somewhere passes
  - span: [50,50]
  - recovered record: `runs/review/safety-check-refuses-last-moment/pass-1/recovered/c2.json`
  - the pair the judge saw: none — this line was not a judge's answer to a rendered Packet; `runs/review/safety-check-refuses-last-moment/pass-2/check.json` records how it was decided
- **c3 / grounds** — fails (preserved)
  - The claim explicitly asserts that thinking will not settle the question, going beyond what the grounds explicitly establish about mechanisms.
  - span: [58,58]
  - recovered record: `runs/review/safety-check-refuses-last-moment/pass-2/recovered/c3.json`
  - the pair the judge saw: `runs/review/safety-check-refuses-last-moment/pass-2/join/c3.grounds.1.md`
- **c3 / grounds-unused** — fails (best-effort)
  - a ground no recovered claim rests on
  - evidence: ground (step_effect c2): The reader can now establish that a check is live, which is the precondition for asking what kind it should be.
  - span: [58,68]
  - recovered record: `runs/review/safety-check-refuses-last-moment/pass-2/recovered/c3.json`
  - the pair the judge saw: none — this line was not a judge's answer to a rendered Packet; `runs/review/safety-check-refuses-last-moment/pass-2/check.json` records how it was decided
- **c3 / register-tests** — fails (best-effort)
  - The prose violates the one-relation-per-sentence test with compound sentences containing multiple coordinated clauses.
  - span: [58,68]
  - recovered record: `runs/review/safety-check-refuses-last-moment/pass-2/recovered/c3.json`
  - the pair the judge saw: `runs/review/safety-check-refuses-last-moment/pass-2/join/c3.register-tests.md`
- **c3 / packet-wording** — fails (best-effort)
  - this line quotes the Packet rather than writing from it
  - evidence: which is the precondition for asking what kind
  - span: [68,68]
  - recovered record: `runs/review/safety-check-refuses-last-moment/pass-2/recovered/c3.json`
  - the pair the judge saw: none — this line was not a judge's answer to a rendered Packet; `runs/review/safety-check-refuses-last-moment/pass-2/check.json` records how it was decided
- **c4 / grounds** — fails (preserved)
  - Claiming a refusal can be placed anywhere when only machine output is discarded introduces a placement norm the grounds do not license.
  - span: [88,88]
  - recovered record: `runs/review/safety-check-refuses-last-moment/pass-2/recovered/c4.json`
  - the pair the judge saw: `runs/review/safety-check-refuses-last-moment/pass-2/join/c4.grounds.14.md`
- **c5 / grounds-unused** — fails (best-effort)
  - a ground no recovered claim rests on
  - evidence: ground (step_effect c4): The reader is auditing individual checks with a settled list and has no reason to look between them.
  - span: [92,104]
  - recovered record: `runs/review/safety-check-refuses-last-moment/pass-2/recovered/c5.json`
  - the pair the judge saw: none — this line was not a judge's answer to a rendered Packet; `runs/review/safety-check-refuses-last-moment/pass-2/check.json` records how it was decided
- **c5 / packet-wording** — fails (best-effort)
  - this line quotes the Packet rather than writing from it
  - evidence: auditing individual checks with a settled list and
  - span: [92,92]
  - recovered record: `runs/review/safety-check-refuses-last-moment/pass-2/recovered/c5.json`
  - the pair the judge saw: none — this line was not a judge's answer to a rendered Packet; `runs/review/safety-check-refuses-last-moment/pass-2/check.json` records how it was decided

## The cold reader — Section findings

- **Section 2 / section-belief-after** — fails (preserved)
  - The recovered belief includes three dead-check routes and liveness requirements that exceed the declared focus on diagnostic signatures.
  - declared: The reader diagnoses the category from the failure signature: a flag asserted by the actor that erred, or a prompt people learn to click through.
  - recovered: "Can it fire" is really three independent conditions — something has to reach the check, something has to write the input it reads, and the object the rule is about has to be inside the arguments it gets — and a config entry naming a real file settles none of them; the second one is especially treacherous because the usual is-it-called test goes green while the input stays dead. As for fact-versus-judgment, I can't settle it by staring at the property, but I can read it off behaviour: an empty refusal record paired with the acting side supplying the input means a judgment was routed as a mechanical check, while instant approvals paired with nobody able to quote the prompt means a computable fact was handed to a person. Neither signature counts alone — it's the pairing that's diagnostic — and both presuppose the check is live, since a dead check's blank record says nothing.
  - span: [44,70]
  - route: corrected at **c3** — a preserved item already fails on this Step, so the Section's finding is that Step's
- **Section 2 / section-belief-before** — fails (best-effort)
  - The declared starting state of single-answer thinking contradicts what section one establishes about the four-question approach.
  - declared: The reader has a prompt and reads it as a single yes-or-no about whether the check was installed.
  - recovered: Carefulness is not something I can summon at install time, because my attention is committed to the line I'm working on; the workable substitute is a fixed, short list of questions triggered by the act of installing a check itself, the way hazard studies and aviation checklists are triggered by a step or a phase rather than by a person's state of mind. The list here is four questions — can it fire, is it a fact or a judgment, whose effort does its refusal spend, does an earlier step revoke what a later one needs — and it is short on purpose, growing only when something that was visible at install time gets missed.
  - span: [44,70]
  - route: corrected at **c3** — a preserved item already fails on this Step, so the Section's finding is that Step's
- **Section 3 / section-belief-before** — fails (best-effort)
  - The recovered understanding of routing complexity contradicts the declared naive starting state that working checks end the interrogation.
  - declared: The reader treats a check that fires correctly as the end state the prompts are aiming at.
  - recovered: "Can it fire" is really three independent conditions — something has to reach the check, something has to write the input it reads, and the object the rule is about has to be inside the arguments it gets — and a config entry naming a real file settles none of them; the second one is especially treacherous because the usual is-it-called test goes green while the input stays dead. As for fact-versus-judgment, I can't settle it by staring at the property, but I can read it off behaviour: an empty refusal record paired with the acting side supplying the input means a judgment was routed as a mechanical check, while instant approvals paired with nobody able to quote the prompt means a computable fact was handed to a person. Neither signature counts alone — it's the pairing that's diagnostic — and both presuppose the check is live, since a dead check's blank record says nothing.
  - span: [72,110]
  - route: corrected at **c4** — a preserved item already fails on this Step, so the Section's finding is that Step's
- **Section 3 / final-claim** — fails (preserved)
  - The recovered claim adds mechanism and solution beyond the declared negative statement about placement.
  - declared: A safety check that refuses work at the last moment is not necessarily in the right place, even when its refusal is correct.
  - recovered: A safety check being correct tells you nothing about whether it is in the right place: a refusal that lands at the last moment can be perfectly right every time and still be billing a person's already-spent attention for a fault introduced upstream, and no fix aimed at making the check work will ever surface that. So checks should be interrogated at install time by a fixed short list — can it fire, is it a fact or a judgment, whose effort does its refusal spend, and does anything earlier revoke what something later needs — with the last two aimed at placement and at the relations between checks, which examining each check on its own can never reach.
  - span: [72,110]
  - route: corrected at **c4** — a preserved item already fails on this Step, so the Section's finding is that Step's

## Corrections

- **c3** (pass 1) — re-realized from a Packet re-rendered against the article as it stood, with a Correction block carrying 3 failed item(s) and 6 held preserved item(s)
  - change share: 28 of 35 sentence(s) differ from the previous realization
  - packet overlap: 1 of 6 line(s) repeat a run of the Packet's ground or state wording
- **c4** (pass 1) — re-realized from a Packet re-rendered against the article as it stood, with a Correction block carrying 4 failed item(s) and 6 held preserved item(s)
  - change share: 30 of 41 sentence(s) differ from the previous realization
  - packet overlap: 0 of 10 line(s) repeat a run of the Packet's ground or state wording
- **c5** (pass 1) — re-realized from a Packet re-rendered against the article as it stood, with a Correction block carrying 4 failed item(s) and 4 held preserved item(s)
  - change share: 25 of 31 sentence(s) differ from the previous realization
  - packet overlap: 1 of 7 line(s) repeat a run of the Packet's ground or state wording

## Residue

Each line is an item that survived every pass this run made. Fill
`classified:` with `packet` or `reviewdraft`.

- **c3 / grounds** — The claim explicitly asserts that thinking will not settle the question, going beyond what the grounds explicitly establish about mechanisms. — still failing after pass two
  - recovered record: `runs/review/safety-check-refuses-last-moment/pass-2/recovered/c3.json`
  - the pair the judge saw: `runs/review/safety-check-refuses-last-moment/pass-2/join/c3.grounds.1.md`
  classified:
- **c4 / grounds** — Claiming a refusal can be placed anywhere when only machine output is discarded introduces a placement norm the grounds do not license. — still failing after pass two
  - recovered record: `runs/review/safety-check-refuses-last-moment/pass-2/recovered/c4.json`
  - the pair the judge saw: `runs/review/safety-check-refuses-last-moment/pass-2/join/c4.grounds.14.md`
  classified:

