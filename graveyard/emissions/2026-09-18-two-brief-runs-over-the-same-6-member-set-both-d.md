<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-18
repo: Kogaki
grain: lesson

## Trigger — what happened

Two /brief runs over the same 6-member set both died at the same state: the compose_path judge exceeded its 180s per-call bound on all three licensed attempts. The one attempt that did finish took about 264s and produced a complete, well-formed record. The bound's own note derives 180s from the shape of the work rather than from a measurement of it, and three attempts at that bound sum to 540s against an enclosing advance bound of 480s -- so a state that times out even once can never spend the retries it is licensed, and the first run reported nothing at all.

## The learning

A retry count and a per-attempt bound are not independent settings: their product is the real cost, and when it exceeds the bound of whatever encloses them, the last attempts are unreachable and the run dies without delivering the refusal that explains it. Check the product against the enclosing bound wherever a retry window sits inside a timed span. Separately, a per-attempt bound derived from a description of the work rather than a measurement of it can land below every real attempt, and then the failure is not intermittent but total: every attempt is cut at the same place, the retries add nothing, and the report reads as a timeout to be waited out rather than as a setting that cannot be satisfied. A bound whose ground is an argument about size owes a recorded observation of one real completion.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
