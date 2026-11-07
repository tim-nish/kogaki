<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-29
repo: Kogaki
grain: lesson

## Trigger — what happened

Draining kogaki#1217 by hand on 2026-09-29: one of the 50 bare pointers was specs/SPEC.md citing a line in specs/SPEC.md, and no path::token anchor could be minted for it

## The learning

The anchor form resolves a token by counting its occurrences in the target file and refusing anything but exactly one. When the citing sentence lives in the target file, the anchor itself carries the token, so the count is at least two by construction and every self-reference is refused as a duplicate. The pointer was rewritten to name the receipt by its request_id value with no path, which is unique in the file and outside the checker's grammar. A drain over a closed set should classify self-references up front, because they are the one class the form cannot address, and the checker's own docs do not say so.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
