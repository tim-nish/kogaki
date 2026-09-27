<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-26
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1204: spawn-implementer's detached worker ran bare `claude`, resolved a Windows npm shim whose .exe is missing, and died at exit 127 before its first turn, while the invoking shell resolved the working Linux binary.

## The learning

A driver that launches a tool by bare name gets whatever PATH its detached child happens to have, and that is not the PATH the operator tested with. The same accident had already killed review rounds; it now killed an implementation worker with zero work done, and the run then had no way to record that nothing happened, because the close only knows how to record work that advanced or a named blocker. Launch child tools by absolute path, and treat 'the stage never started' as its own recordable outcome rather than a stage failure.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
