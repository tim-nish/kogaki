<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-26
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-10-26 a full check run for kogaki#1614 failed one member with 'no space left on device'; /tmp held 417 scratch folders left by the Proof Sheet leg-run check, about 61 GB, because each run makes a fresh temporary folder and nothing removes it.

## The learning

A test that creates a temporary folder per run and never removes it does not fail itself; it slowly uses up the disk until some later, unrelated test fails with an out-of-space error that points nowhere near the cause. The failure also looks like a defect in whatever change was being tested. A per-run scratch folder needs a removal at the end of the run, or a sweep of old ones at the start, and a disk-space failure in a suite should first be checked against leftover test folders before the change under test is suspected.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
