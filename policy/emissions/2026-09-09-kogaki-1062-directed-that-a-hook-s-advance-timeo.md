<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1062 directed that a hook's advance timeout be re-derived from measured work: groups times the per-call bound plus margin, which came to 1200s. A registered check asserts that same constant stays below the harness's 600s hook default, because a bound at or above the default can never fire first. Both are ratified, and they cannot both hold. Every other item of the issue was implemented, green and mutation-tested; only the number collided.

## The learning

Repairing a bound has two shapes that look like one instruction, and only one of them is an implementation. Shrinking the work inside the bound is local and can be built and tested; raising the bound is a claim about the ceiling above it, and that ceiling is usually held by someone else - another check, a harness default, an environment fact the repository does not even commit. So when an issue says a bound was derived from the wrong thing, separate the two before starting: build the work-shrinking half, and treat the number as owed to a decision rather than picking one that happens to fit under the ceiling - because picking to fit is the same budget-first derivation the issue was filed to end. Name the collision in the artifact that carries the number, so the next reader finds a stated deferral instead of a stale figure that looks measured.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
