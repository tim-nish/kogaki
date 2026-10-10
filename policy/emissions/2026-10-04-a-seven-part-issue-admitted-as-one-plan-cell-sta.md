<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-04
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki #1251 was admitted with one plan cell covering seven separate changes across the Persona file, the Brief schema, the compose validator, the Packet template and the review items. The second dispatch on 2026-10-04 ran 19 minutes, compacted its context, and ended with no file changed (compacted-without-progress); the first dispatch had left only the receipt commit.

## The learning

When an Issue lists several independent changes, admission should split them into several plan cells. A single cell makes the worker read the whole surface before it edits anything, and it can run out of room before the first change lands. A worker that ends without changing a file is a sign the plan cell is too big, not that the worker needs more turns.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
