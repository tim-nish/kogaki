<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-24
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1176 took six implementer dispatches. Five stopped as verification-refused because the worker wrapped its check in pipes, redirects, timeout and ; echo $?; the sixth had the check passing but its instructions ignored.

## The learning

Widening a worker's permission rules one pattern at a time never converges: each rule matches only the bare command, and the model keeps composing wrappers around it (a mid-pattern * inside a :* prefix rule does not match at all). An instruction in the brief telling the worker not to compose shell was ignored in the very next run. The fix belongs where the check is run, not in the allow list: give the worker one typed act that runs a named check and reports its exit and tail, so there is nothing left to wrap.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
