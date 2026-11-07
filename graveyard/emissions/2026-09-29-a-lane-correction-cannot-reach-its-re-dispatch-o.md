<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-29
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1217 on 2026-09-29: the second worker stopped verification-refused, the lane allow list was widened with git show as the Failure report directs, and the re-dispatch was refused at dispatches_per_cell_max=2 before any worker ran

## The learning

The verification-refused report names correcting the lane's allow declaration and running the cycle again as the recovery, but the per-cell dispatch bound counts every dispatch across every plan hash and nothing resets it. So after a second worker is refused, the correction the report asks for can never be exercised: the lane edit lands, the next spawn is refused on count alone, and re-admission does not help either. The two rules together leave a cell with no route to a third attempt except raising the machine-local bound, which is an owner decision the report does not mention.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
