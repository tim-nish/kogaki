<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1051's carrier-vitality trip: an issue with four runs against it, no merged pull request of its own, and both acceptance conjuncts satisfied by work that landed through two successor issues. The arbitration gate had to decide whether the original carrier was discharged, and the only evidence available was existence-shaped -- merged successor PRs, a green fixture suite, a run record.

## The learning

When work reaches an issue's acceptance through successor issues rather than through the issue's own pull request, the question at the close is not whether the work exists but whether each acceptance conjunct has evidence OF ITS OWN CLASS. An acceptance item asserting a check passes is discharged by a green run of that check; an item asserting a live run reaches a rendered surface is discharged only by that run's own record, never by the fixture that models it. So the discharge read is per-conjunct and typed, and a carrier can be fully discharged with zero commits attributed to it -- which is invisible to every mechanical query, because each query asks about the carrier and the evidence sits under other numbers. The trap is the reverse case and it looks identical from outside: an acceptance conjunct whose deliverable class has no matching evidence class anywhere is not deferred, it is undischargeable, and a close that reads the successors' merged PRs as covering it is asserting standing from existence evidence.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
