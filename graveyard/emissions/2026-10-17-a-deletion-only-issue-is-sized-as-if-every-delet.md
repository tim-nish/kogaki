<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-17
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1423 (delete 32 registered checks with their fixtures) was refused at admission: the 100-file plan cell estimated 872 tool calls against the 200 ceiling, because the estimate charges each named file by its line count whether the work reads it or only removes it.

## The learning

The admission size estimate cannot tell a file that will be edited from one that will only be deleted, so a change that removes many files is refused for a worker even though deleting a file costs one command. Such an Issue can only run in the owner's own session (the --session launch), so mark it for the session when it is filed rather than discovering the refusal at the run.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
