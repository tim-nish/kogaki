<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-26
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1204 on 2026-09-26: the implementer worker died at exec (exit 127, the Windows claude shim) before its first turn, and spawn-implementer then refused every re-dispatch because the plan, allow file and Issue body were unchanged.

## The learning

A guard that refuses to repeat a failed dispatch until its inputs change assumes the failure came from those inputs. A launcher that could not start is not caused by the plan, the allow list or the Issue body, so the guard blocks the one retry that would have worked, and the only way past it is to edit an input that was never wrong. A failure that happened before the worker's first turn should be read as an infrastructure failure and should not count as a failed attempt on the work order.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
