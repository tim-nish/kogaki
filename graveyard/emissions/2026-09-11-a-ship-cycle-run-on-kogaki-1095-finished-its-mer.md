<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-11
repo: Kogaki
grain: lesson

## Trigger — what happened

A ship-cycle run on kogaki#1095 finished its merge and ran the cleanup classifier over its own leftovers. The classifier emitted two report-only rows that block each other: the branch is report-only because a live checkout holds it (a delete would refuse), and the worktree is 'keep' because it sits on a branch that is being kept. Neither row was executable, so a cleanup pass could never propose removing either, however many times it ran.

## The learning

A cleanup classifier that reads liveness from the tree can emit a pair of findings whose reasons are each other. The way out is not a smarter classifier: it is that the party who CREATED the pair tears down its own half first. A run that opens a worktree owns removing it, and only after that does the branch become an ordinary merged-branch row any cleanup pass can see. Stated generally: a resource held open by another resource you also own is not a finding for a later sweep, it is your own teardown, and a sweep that inherits the pair will report it forever.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
