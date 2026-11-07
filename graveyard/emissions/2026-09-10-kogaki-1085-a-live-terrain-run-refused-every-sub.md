<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-10
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1085: a live Terrain run refused every SubGroup id its own display had just printed, and the refusal that said so was written to a stream the session cannot read

## The learning

When one state PRINTS an id and another RESOLVES it, they must read one carrier. Here the display minted SubGroup ids from the judgment record the run itself had written, while the next state re-read that record from a command-line argument the run had no route to supply — so Group ids resolved, SubGroup ids on the same screen did not, and each half was internally consistent, which is why neither site looked wrong. The repair is not a new lookup but the removal of the second carrier: the states that resolve join the record from the run, with the argument kept as the fallback for callers that have no run. Beside it: a refusal is only raised if it lands somewhere the party who caused it can read. This one went to stderr from inside a PostToolUse hook, whose only channel to the session is its stdout's additionalContext — so an advance that ended a run ended it silently, and the session's only reading was a run record naming one state fewer than it expected.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
