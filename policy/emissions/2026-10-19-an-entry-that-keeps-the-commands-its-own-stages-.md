<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-19
repo: Kogaki
grain: lesson

## Trigger — what happened

Cutting src/brief.mjs into modules (kogaki#1466): the Issue kept the enter, adopt and mint commands and the flow binding in the entry, but the stage handlers being moved out call those commands and the job await passes the flow binding back to the engine.

## The learning

When a file is split so that its entry keeps only the commands, check first which of the moved pieces call back into what the entry keeps. If a moved module needs a function or value the entry defines, it has to import the entry, and that circle works only while the entry is loaded first; the day anything imports the module directly, a value the entry builds at load time is read before it exists and the program stops. The fix is to move whatever the modules call back into one of the modules, so the imports run in one direction and the entry is only ever imported, never importing back.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
