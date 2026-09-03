<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

Running /draft after the runtime consolidated into a flat src/ directory (#767). The skill file still instructed 'node draft/draft.mjs resolve' and referenced 'brief/path-review-agent.md'; the first command failed with MODULE_NOT_FOUND and the sitting had to locate the runtime from git history before it could proceed.

## The learning

When code is consolidated into a new directory, the instruction files that tell an assistant how to invoke that code are a separate carrier and do not move with it. A refactor that passes every test can still leave every entry point unreachable, because the tests call the code directly and the skill file is the only thing that calls it the way an operator does. The failure is loud rather than silent, which is the lucky case; the same stale pointer in a file path that happens to still exist would have been read as correct. Treat the instruction files that name a command as part of that command's surface, and move them in the same change that moves the code.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
