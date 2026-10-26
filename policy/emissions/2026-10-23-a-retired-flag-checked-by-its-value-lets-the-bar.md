<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-23
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1531: the Proof Sheet's retired --terms flag was refused only when it carried a value, because the command line reader keeps a bare flag as true and the refusal read the value as text.

## The learning

When a flag is retired, refuse it on its presence, not on its value. A reader that turns a value-less flag into true, paired with a check that only looks at text values, quietly accepts the bare flag; and a refusal placed inside one entry point misses the others (here, resume). Put the refusal once, at the command line, before any entry point is chosen.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
