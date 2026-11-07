<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-16
repo: Kogaki
grain: lesson

## Trigger — what happened

A grammar file declares each line kind's shape as a form string, with alternatives separated by a pipe. The validator splits alternatives on space-pipe-space, which silently consumes one space from each side -- so an alternative describing an indented line lost one column of its indentation and could never match the line it described. Nothing failed, because the surface's unrecognised-line rule was already switched off by three catch-all kinds.

## The learning

When a mini-language's separator is whitespace-sensitive and the payloads it separates are whitespace-significant, every alternative after the first is silently corrupted by the amount the separator consumes, and the corruption is invisible wherever a fallback also matches. Test a declared form by matching it against a real emitted line at declaration time, not by reading it -- a form that has never matched anything is indistinguishable from a form with a one-character defect, and the difference only surfaces when the enforcement the form feeds is finally switched on, which is the worst moment to discover a corpus of broken declarations.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
