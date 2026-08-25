<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-19
repo: Kogaki
grain: lesson

## Trigger — what happened

A ship-cycle run was invoked with the argument 'PR 537'. That number exists as neither a pull request nor an issue in the repository, and the highest number ever allocated there was 527. Restricting the run's work list to that argument would have produced an empty work list.

## The learning

When a command takes an argument that names a thing, and the command's normal response to an argument is to narrow its work to that thing, a name that matches nothing narrows the work to nothing. The run then finishes quickly, reports no errors, and looks exactly like a run that had nothing left to do. The two outcomes are indistinguishable to whoever reads the report, and the one that is wrong is the one that looks the most reassuring. So resolve the name against the real set of things before narrowing anything, and when it matches nothing, say so and ask which thing was meant rather than picking the closest match. Guessing is tempting here because the closest match is usually right - 537 really was a slip for 527 - but a guess that is usually right is still a guess about which work gets done, and that belongs to the person who typed the argument. Asking cost one question; guessing wrong would have merged the wrong change or silently done nothing at all.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
