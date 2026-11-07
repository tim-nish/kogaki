<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

A ship-cycle run entered on an issue whose two acceptance items were already met — one by an unrelated later commit, one by the deletion of the file the item named. The owner closed it as discharged at a gate. The act that records a run's outcome then refused: it derives the verdict from evidence rather than taking the caller's word, and its three arms are a merged closing pull request, a recorded blocker, or refusal. An issue discharged by acts that never cited it has neither, so the run that did the work could not record that it ran, and the two recoveries the refusal named were both false — there was no pull request to merge and nothing had blocked the run.

## The learning

Making a recorder derive its verdict from evidence instead of accepting the caller's word removes the caller's ability to lie, and removes with it the caller's ability to report a true ending the enumeration does not contain. The two properties are the same property, so the enumeration has to cover every way the work can legitimately finish before the derivation is worth having; an unenumerated legitimate ending is not merely unrecorded, it is pushed toward the nearest arm that will accept it, and the nearest arm is always a lie. Here the pressure was to mint a pull request that changed nothing, or to record a blocker that had blocked nothing, either of which would put the declared outcome back under a different name — which is exactly what deriving the verdict was adopted to prevent. The tell that an enumeration is short is a refusal whose named recoveries are all unavailable at once: a refusal that can only be discharged by falsifying its own evidence is reporting a gap in the arms rather than a defect in the run.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
