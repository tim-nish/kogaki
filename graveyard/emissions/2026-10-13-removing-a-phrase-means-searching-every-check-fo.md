<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-13
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1350's plan removed two rules from the reader file and listed the one check that reads that file by name; the worker's suite then failed on a second check, check-brief-compose case (o), which asserts one of the removed sentences word for word in the rendered Packet.

## The learning

When a change deletes a sentence from a shipped file, the set of checks it touches is every check that quotes that sentence, which a search for the file's name does not find. Before writing the plan's file list, search the check folder for each removed phrase itself, not only for the file path.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
