<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A consult receipt had to be recorded in two different places for two different readers, and neither reader mentioned the other. One gate read the issue body and refused until the receipt was there; a second gate counted receipts only over commit messages and the pull request body, and explicitly did not read the issue body it had just searched to decide that a boundary was touched. Satisfying the first left the second red, with nothing on either surface saying so.

## The learning

When two gates enforce the same obligation over different evidence sources, the discharge is not one act — and the second gate's failure looks like a fresh violation rather than a filing error, so the natural response is to redo the work instead of copying the record. Say, at each gate, which sources it reads. A gate that searches a source to decide the obligation APPLIES and then refuses to read that same source for the DISCHARGE is the sharpest form: it has the evidence in hand and declines it, which no reader would predict. Where the obligation is discharged by a record rather than by an act, prefer the most durable carrier the strictest reader accepts — a commit message over an editable pull request body — because one copy that satisfies everything beats two that drift.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
