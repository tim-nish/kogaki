<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

Three /ship-cycle sessions entered the same tracking issue's children within one minute on 2026-09-09. concurrency-check answered 'proceed with hint' for all of them and named the reason itself: no issue declares a footprint, so none intersects any other. The one guard whose job is to serialize two runs over one file was structurally unable to fire. Recording a footprint is refused on this repository's admission path: admit-issue verdict rejects --plan-cell under an unevaluated disposition, and every issue here admits unevaluated because no PolicyCheck is registered.

## The learning

The footprint guard has two halves that live in different acts, and a repository can satisfy neither without noticing. The declaring half rides the admission verdict's plan cell; the reading half is concurrency-check. A plan cell is accepted only under a disposition that carries an implementation licence, and a repository with no PolicyCheck registry admits every issue as unevaluated, which carries none. So the declaration is refused at the only place it can be made, concurrency-check reads an empty footprint on both sides, and 'no live claim's footprint intersects this one' is returned for two runs about to edit the same file. The verdict is not wrong about what it read; it is a true statement about an absence. What makes it dangerous is that it reads identically to disjointness, and the note it prints saying so is advisory while the verdict is what the scheduler consumes. A guard whose input can only be supplied through a gate that refuses it is not a weak guard, it is an unarmed one, and the repository cannot tell the two apart from the answer.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
