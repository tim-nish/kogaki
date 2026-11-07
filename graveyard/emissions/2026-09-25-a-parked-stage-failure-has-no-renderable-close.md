<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-25
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1199: the implementer ended verification-refused, the retry was refused because no dispatch input had changed, and the owner chose to park the issue. record-pass then refused (no merged PR, no Blocker, no discharge), and next-actions refused because no pass or held row existed.

## The learning

When the owner parks an issue after a failed stage, the run has no typed way to record that ending. record-pass only reads a merge, a Blocker or a discharge; the park command is owner-invoked, so the run cannot write a held row for itself. The close has to be reported in prose, and recording a Blocker with no condition just to get a row wedges later passes.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
