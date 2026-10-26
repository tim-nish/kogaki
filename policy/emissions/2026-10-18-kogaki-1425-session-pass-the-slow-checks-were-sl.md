<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-18
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1425 session pass: the slow checks were slow on process starts, and a pyenv shim multiplied them

## The learning

When a test suite's cost grows, measure what it starts before touching what it waits on. kogaki's terrain-runtime check grew from 5 s to 30 s in CI, and its Design assumed waited-out bounds and duplicated cases; the measured cause was about 430 child-process starts after every case moved onto the runtime's command surface, with no case waiting at all. The hook check beside it cost 190 Python starts, and on a machine where python3 resolves through a pyenv shim each start cost 68 ms against 11 ms for the binary, so putting the binary on PATH alone cut the check from 15.4 s to 4.6 s with nothing else changed. A bound set before that measurement sends the implementer after the wrong remedy; a design for a slow check names the start count and the interpreter path first.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
