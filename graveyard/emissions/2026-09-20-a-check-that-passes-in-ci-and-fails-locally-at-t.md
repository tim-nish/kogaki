<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-20
repo: Kogaki
grain: lesson

## Trigger — what happened

On PR #1164 the review engine's own run of the declared check suite went red on the very member the change extended, while the completed CI run for that exact commit reported the same member passing. The member also passed alone, five times in a row, and under deliberate CPU contention. The second review round resolved it by reading the completed CI run for that head as the authoritative fact, and carried the local red separately as a finding about the member's cost: the new cases pushed it to 21.9 seconds against its own declared 18-second budget, and the local machine runs the suite eight jobs wide.

## The learning

When a check disagrees with itself between two runs at the same commit, the disagreement is evidence about what the check COSTS, not about whether the thing it guards is broken. The instinct is to treat the red as the true reading and the green as luck, and to go hunting for a flaky case. That hunt finds nothing, because there is no flaky case: the member is all-or-nothing and its assertions are deterministic. What varies is how much machine it gets. So the two readings should be separated at the point they are taken — one act decides whether the guarded property holds, and it reads the run that has a stable amount of machine behind it; a different finding records that the member now costs more than it declared. Folding them into one verdict makes a budget overrun look like a broken invariant, and the repair aimed at a broken invariant is a rewrite of code that was never wrong. It also cuts the other way: a member whose declared cost has gone stale will keep going red on whoever has the busiest machine, while everyone else sees green and reads their report as noise.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
