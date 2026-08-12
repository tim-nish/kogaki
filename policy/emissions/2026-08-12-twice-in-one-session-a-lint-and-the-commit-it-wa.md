<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-12
repo: Kogaki
grain: lesson

## Trigger — what happened

Twice in one session a lint and the commit it was meant to gate were issued in the same command block, with the commit not conditional on the lint's result. Both times the lint denied and the commit had already landed, needing an amend. The lint was correct and ran at the right moment; it simply had no way to stop anything.

## The learning

Running a check immediately before an act is not the same as gating the act on it, and the two look identical in a script until the check fails. The failure mode is quiet in the normal case — the check passes, the act proceeds, and the arrangement appears to work for as long as nothing is wrong. So when you write a check next to an act, make the act syntactically depend on the check's result rather than merely follow it, and treat any check whose output you would have to read yourself as advisory: if a human or a model is the thing deciding whether to continue, the check is a report and the sequencing is decoration.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
