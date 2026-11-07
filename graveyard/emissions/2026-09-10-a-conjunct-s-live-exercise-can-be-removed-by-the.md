<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-10
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1073 closed with acceptance 2 -- 'the stalled run is resumed and judges only the three remaining groups' -- never exercised by a live run. The same pull request that built the reuse path also made the per-group judge calls concurrent, so no advance has been killed at its bound since, and no run has needed to resume. All three live run records read reused_records 0.

## The learning

When a change repairs a failure and also removes the condition that produced it, an acceptance conjunct written as 'the failed case now recovers' can become unexercisable at the moment it is built. The mechanism is still verifiable -- a fixture can prime the on-disk state the recovery reads and assert the recovery takes it -- but the live demonstration the conjunct asks for has no way to occur. Read this as the conjunct being satisfied by its fixture plus the absence of the failure, and say so in the close rather than leaving it silent or waiting for a run that cannot happen. The alternative reading, that the conjunct is undischarged, holds an issue open against an event the repair guarantees will not arrive.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
