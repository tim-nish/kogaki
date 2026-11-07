<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-30
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1231 in kogaki: the implementer built most of the cell (two commits, suite green but for one member) and was then killed at the recovered-refusal bound (8 recovered over a bound of 6, 7 standing) while orienting: three Read refusals on files over 500 lines, a python3 -c read of registry.json, two runs of a check outside the footprint, and two suite runs piped or redirected into a file. Every recent kogaki worker (#1216, #1224, #1225, #1229, #1231) ended the same way, and none ever reached a green suite because the boundary-receipts member needs a consult receipt a worker cannot write.

## The learning

In a repository whose source files run to two or three thousand lines, a worker's orientation is where the refusals happen: the read guard's 400-line window, the ban on python one-liners, and the literal-prefix allow rules each refuse a natural first move, and the recovered ones are counted against a bound of six even though each was corrected. The bound then ends a worker whose build is nearly done. The cheap recovery is to read the worktree before anything else: finish the remainder in the session, commit the consult receipt the worker can never write, amend the footprint to name the files it had to touch, and post the exact allowed command forms on the issue; then either re-dispatch as verify-only or push the branch and open the PR from the worktree, which is the route that closed the previous four kogaki issues.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
