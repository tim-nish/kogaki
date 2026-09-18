<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-17
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1141 taught tools/run-registered-checks.sh to grade a member's exit 11 as a degrade rather than a failure, so a machine-local seam's absence would stop turning CI red. The same PR's round 1 had already recorded, as a non-gating finding, that the member itself calls exit 11 on paths reachable with a failure ALREADY set — it finds a published cell that does not resolve, then loses its operator config, and reports the second. The disposition pass named the composition the moment the grade landed: before the change that run was at least red; after it, the suite exits 0 and the log says the check did not run.

## The learning

A grade that excuses a member from the suite is not a property of the suite alone. It composes with how that member decides WHICH of its own outcomes to report, so an exemption keyed on an exit code inherits every path by which the member can reach that code while holding a real failure in hand. The two defects were each defensible in isolation and were reviewed in isolation: one was a non-gating should on the member, the other was the owner's directed repair at the suite. Neither review saw the product, because the finding and the fix landed in different rounds of the same pull request. So when a change makes an exit code load-bearing, the thing to re-read is not the change but every site that can PRODUCE that code — and a member's own already-recorded failure being discarded on the way to a degrade is the shape to look for first.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
