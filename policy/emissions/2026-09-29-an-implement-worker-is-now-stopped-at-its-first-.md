<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-29
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1216 on 2026-09-29: the implement worker was reaped verification-refused 30 seconds after launch, on its first read of the codebase

## The learning

The implement lane's refusal bound fired at ONE refused command, not the three the implement-issue contract describes. The refused command was a read, not a write: a python3 -c one-liner with a 2>/dev/null redirect chained with sed -n over src/brief-workflow.json. So a worker that composes a compound shell read before its first commit ends the whole cell with no work done, and the recovery the report names (return to Admission with the refused command attached) is out of proportion to a read that the Read tool could have done. Either the worker needs to be told to read files with Read, or the bound needs to exempt reads.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
