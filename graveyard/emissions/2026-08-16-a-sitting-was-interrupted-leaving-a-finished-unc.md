<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-16
repo: Kogaki
grain: lesson

## Trigger — what happened

A sitting was interrupted leaving a finished, uncommitted edit in a shared working tree. Four later work sessions ran in the same tree, each carefully stepping around the edit; it was finally shipped only when the owner explicitly pointed a session at the work item it belonged to, a day later.

## The learning

An uncommitted edit in a shared working tree is invisible as WORK: every disciplined passer-by treats it as someone else's live state and steps around it, so the more careful the collaborators, the longer it sits. The honest reading is that an orphaned edit ages into abandonment, and stepping around it silently is only right while its author might still be active. A session that finds one should name it loudly in its own report AND on the work item it appears to belong to, so the owner decides adoption from the item's thread rather than from whoever happens to open the tree next; and an interrupted session's cheapest gift to its successors is a work-in-progress commit on a branch, which converts ambiguous tree state into an addressable, resumable artifact.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
