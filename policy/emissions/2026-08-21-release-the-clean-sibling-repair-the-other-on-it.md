<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-21
repo: Kogaki
grain: lesson

## Trigger — what happened

A review round routed two findings to the author in-cycle on a PR whose sibling was already merge-ready; the orchestrator merged the clean sibling immediately, had the lane fix the routed findings, and spent the second review round on a delta-scoped re-read of just the fix

## The learning

When a batch produces one clean artifact and one with author-routed findings, do not hold the clean one hostage to the pair: release it at once and run the repair cycle on the other alone. The second review of the repaired one can then honestly scope itself to the delta - the fix commit against the first round's findings - which costs a fraction of a full re-read. The trap on the other side: an in-cycle fix moves the artifact's identity, so anything already armed to act on the old identity (an auto-merge, a cached approval) must be checked before the fix lands, not after.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
