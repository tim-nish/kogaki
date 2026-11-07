<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A preflight guard exists because two automated runs left a repository main working tree checked out on a feature branch. It refused today on the same condition — but the run whose record it sits in had ended on the default branch and committed there, and no automated run had touched the tree in between. Something else left it on a stale branch, and the guard's own record describes the failure only as something those runs do.

## The learning

A guard catches a CONDITION, and the incident record that earned it names an ACTOR. Those diverge the moment a second actor can produce the same state, and nothing announces the divergence: the guard keeps firing correctly while its record narrows the reader's model of what causes the condition. The cost lands on the remedy — a record naming only the first actor argues for constraining that actor, which leaves the condition reachable by every other route. A guard's record is worth re-reading each time it fires, asking whether the actor it names is the one that produced this instance.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
