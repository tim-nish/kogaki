<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-23
repo: Kogaki
grain: lesson

## Trigger — what happened

Issue 1547 added one rule to the Proof Sheet's Leg check and named one test file; the rule also failed fake answers in a sibling test the Issue never named, so the work had to stop, amend the Issue and be re-admitted before that file could be touched.

## The learning

When a change adds a rule that checks what a model writes, every fake model answer that reaches that check has to obey the new rule too, wherever that fake lives. Before naming the files a change will touch, search for every fake answer that produces the checked field, not only the test the change names, and list each file holding one. Otherwise the scope is too small, and the fix is found only after the work has begun.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
