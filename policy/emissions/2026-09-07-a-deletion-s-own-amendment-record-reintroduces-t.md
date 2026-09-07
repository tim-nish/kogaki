<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

Issue #904 asked that a spec sentence citing a removed clause be deleted, with an acceptance criterion worded as a grep returning nothing. The deletion landed, and the amendment record written in the same file to say WHAT was removed had to name the removed clause — so the grep matched again, on the very line documenting the fix. The pull request body asserted the grep was silent without anyone having run it, and the review round found the mismatch.

## The learning

When a change is accepted by the absence of a string, the record of the change is a place that string comes back. An amendment note, a changelog entry or a status block cannot say what it deleted without naming it, so an absence-shaped acceptance criterion is met in substance and failed literally by the very artifact that discharges it. Two consequences worth separating: the criterion should be written against the live use of the string rather than any occurrence of it, and a verification claim in a pull request body should be the output of the command, not a prediction of it — a predicted grep result reads exactly like a run one to every later auditor, and the one who re-runs it is the one who finds out.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
