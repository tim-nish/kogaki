<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-25
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1583 added a second model call per paragraph whose usual answer is just {"trigger": "none"}. The shared job supervisor accepted an answer only if it carried a named list (legs, segments), so that answer would have been read as unreadable and asked again forever; the footprint had to widen mid-run to add a declared no-list form.

## The learning

When an Issue dictates a new model call's answer shape, check that answer against the shared runner's read contract before admission, not after: a runner that insists every answer carries a list silently assumes no call ever answers 'nothing applies'. The fix is one declared opt-out on the runner, named by the caller, so every existing caller reads unchanged.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
