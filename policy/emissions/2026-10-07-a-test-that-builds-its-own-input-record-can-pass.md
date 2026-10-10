<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1257 moved Terrain's fixture cases off internal functions and onto the command line. The case for the 'observed' judge line had handed the renderer a made-up invocation record carrying an id field. Driven through a real run, the same line printed the word undefined, because no real invocation record carries an id: the renderers had been reading a field only the test ever wrote.

## The learning

When a test constructs the record a function reads, it can quietly supply a field the real producer never writes, and the test then proves the function works on data that does not exist. The test passes and the shipped output is broken. Prefer driving the function from what the real producer writes, through the public entry point; when a hand-built record is unavoidable, build it from a real one and change only the field under test, so every field the test did not touch is a field the program actually writes.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
