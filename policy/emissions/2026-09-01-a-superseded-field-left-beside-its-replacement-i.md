<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-01
repo: Kogaki
grain: lesson

## Trigger — what happened

Implementing kogaki#754: the display selection was widened from 'the entries at the highest level' to 'the first ten in level order'. The new list was added as a new field and the old one was left on the returned object with a comment saying nothing renders from it. The renderer still destructured the old field, so the counts line said three and one row rendered, with two silently dropped.

## The learning

When a computation is superseded, delete the field that carried the old answer rather than leaving it beside the new one. A field kept 'for the fixtures' or 'because it is still true' is indistinguishable, at the call site, from the field a caller is supposed to read — and the call site is exactly where the supersession has to land. The failure is silent in the worst way: both fields hold real data, so nothing throws, and the output is internally inconsistent rather than absent. Deleting the old field turns the same mistake into a crash at the first read. The general shape: a supersession is finished when the superseded thing is unreachable, not when the replacement exists.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
