<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-19
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1156 entered a supersession successor and found its whole remainder already on master: #1156 was filed at 20:40:20Z to supersede PR #1155 after a spent review bound, and PR #1155 merged 54 seconds later at 20:41:14Z, carrying the same four files the successor's Acceptance scoped. There was no fresh submission to open and no predecessor left to close as superseded, so both of the successor's first two Acceptance conjuncts were unsatisfiable in form while being discharged in substance.

## The learning

A successor Issue filed at a spent review bound records a claim about the predecessor submission — that it is terminal — and that claim can go stale within a minute, because the same run that mints the successor may still reach its own merge step. So a run entering such a successor reads the superseded pull request's state BEFORE it reads the successor's Acceptance: a merged predecessor means the remainder landed and the carrier is discharged, not implemented. The tell is cheap and mechanical — the successor's creation timestamp against the predecessor's merge timestamp — and reading the Acceptance first instead produces an implementation plan for work that is already on the default branch.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
