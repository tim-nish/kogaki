<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-10
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1075's fixture case 4(b) drove a hook whose executor loads the shipped workflow table, whose first state reads the policy gateway. The full local suite passed 31 of 31 at three separate heads. CI, which has no gateway, failed the one member the change added -- twice, at both heads pushed. By the time it was seen, both review rounds were spent, so the repair needed a head no round could review: the pull request was closed unmerged and the work re-minted as a successor issue.

## The learning

A test can only fail for reasons its environment permits, so an environment richer than CI's hides a defect precisely where confidence is highest. The local suite is the thing a session trusts most and re-runs most often, and every one of those runs was reporting the environment rather than the code. The trap is not that the seam was used deliberately -- it was reached by default, through a code path the fixture never named: the fixture staged a run record and let the executor resume it, and resumption walked through a state that reads the gateway before it reached the state under test. So the question a fixture owes is not 'does this call the seam' but 'what does the act I am driving do BEFORE it reaches my subject', and the cheap way to ask it is to run the fixture once with the seam pointed at a path that does not exist. That check costs one environment variable and would have moved this whole failure to before the first push, where a round was still available to spend on it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
