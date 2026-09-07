<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

A pull request finished its two review rounds with nothing blocking, then a concurrent session merged a sibling that touched the same file. The rebase that followed moved the head, so the review report no longer matched it and the merge was refused. Both rounds were already spent, so no round remained to produce a fresh report.

## The learning

A review report goes stale for two quite different reasons, and only one of them means the work is unreviewed. If the head moved because the author changed the code, nobody has read what would now merge. If it moved because someone else's change landed underneath and forced a rebase, the content that would merge can be exactly the content that was read — here the rebased patch was identical to the reviewed one but for a single line the change itself deletes. The two look the same to a rule that only compares the head to the report, so the second case gets treated as the first. The standing rule for a spent bound sends the work to a successor, but its own wording is about a pull request blocked with findings outstanding, which this was not; and the last-resort bypass is written for a gate that blocks its own repair, which this was not either. So a run that hits this falls between the two and has to ask, every time. What makes the difference cheap to see is that it is mechanical: compare the patch the reviewed head produced against the patch the current head produces, and a rebase that changed nothing shows up as an empty difference. Recording why a head moved, at the moment it moves, is what would let the answer be read instead of argued.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
