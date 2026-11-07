<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-14
repo: Kogaki
grain: lesson

## Trigger — what happened

Adding the /paragraph-plan stage (kogaki#1375): /draft had to read the stage's output file, and the first cut imported the reader from src/paragraph-plan.mjs. Tracking the stage's skill file turns that module into a command module, and the ownership check forbids one command's module importing another's.

## The learning

When a new stage writes a file a later stage reads, put that file's writer and reader in shared code from the start, not in the new stage's own module. The moment the new stage gets a tracked skill it becomes a command, and an import from one command's module into another's is refused. Running the check only on uncommitted work hides this, because the check reads tracked files.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
