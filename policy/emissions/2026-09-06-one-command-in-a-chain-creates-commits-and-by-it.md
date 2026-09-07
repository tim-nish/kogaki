<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

One command in a chain creates commits and, by its own contract, never pushes. The next command's preflight gates on the default branch being in sync with its remote, so the second command refused on its first act, on state the first command had just created by behaving correctly. Discharging it needed an approval gate the operator had to answer. While that question was open a concurrent session merged a pull request, so the granted push was rejected as non-fast-forward and the act had to be re-derived against a tree that had moved since the question was composed.

## The learning

Two commands can each be correct and still compose into a refusal, when one's postcondition is the other's gated precondition and nothing between them owns the transition. The seam is invisible from inside either contract: the first command is right not to push, and the second is right to demand a synced branch. What makes it costly rather than merely awkward is that the discharge is an approval gate, so the composition spends an operator interruption on a state the system produced itself. Two things follow. When a command's preflight refuses on state the immediately preceding command in the same sitting created, say so in the question — the operator is being asked to approve the seam, not the act, and a question that names only the act hides why it is being asked. And re-read the world after the answer and before the act: a gate is an interval during which other sessions keep working, so the tree the question was composed against is not necessarily the tree the answer executes against, and an act that was safe when proposed can need re-deriving before it is safe to run.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
