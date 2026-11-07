<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-19
repo: Kogaki
grain: lesson

## Trigger — what happened

A /brief run opened its first owner gate. The global rule requires a gate-declaration sidecar file to be written immediately before the AskUserQuestion call; the open-gate rule (kogaki#1028) denies every tool but that one call, Bash and Write included. The sidecar could not be written, and the declaration had to fall back to assistant text.

## The learning

When one rule says 'write this file before the act' and another says 'while this is open, only the act itself is admissible', the second silently voids the first, and the failure surfaces as a refusal on a correctly-followed instruction rather than as a conflict anyone declared. A rule that demands a side-effect before a guarded act has to be satisfiable inside the guard, which means the guard must exempt it by name or the rule must name its own fallback carrier. Where a fallback exists, say which carrier is primary and which is the fallback, so the party that hits the collision knows it is still compliant instead of guessing.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
