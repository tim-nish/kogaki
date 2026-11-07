<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-27
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-10-27, /ship-cycle 1621 opened a reviewed PR that could not merge: the required check job failed on three checks that had been red on master since a data-only commit archived the Move files they read, and the run-record tool had no outcome for a merge blocked by a red base.

## The learning

A commit that deletes files tests depend on, pushed straight to the main branch, does not fail by itself — it fails every pull request that comes after it, because the required check runs the whole suite. The deleting commit should either update those tests in the same change or not reach the main branch until they pass. And a run that is stopped only by a red base has nothing to record it as: the close screen then falls back to an older, already-repaired preflight stop and shows the wrong cause.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
