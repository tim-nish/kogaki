<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

A regex reading a field out of a serialized block used '^field:\\s*(.*)$' with the multiline flag. In JavaScript '\\s' matches a newline, so a field left blank consumed its own line break and captured the FOLLOWING field's line as its value. The value reached an owner-facing document heading. It was found by a fixture that supplied a whitespace-only value expecting a refusal and got a pass.

## The learning

A whitespace class that includes the line break turns a per-line parser into one that silently reads across lines, and it shows up only on an empty value — the case a hand-written example never has. The blank input is the one worth a fixture, because a filled field hides the defect and a missing field takes a different path entirely. Where a pattern is meant to read one line, say so with a class that excludes the newline rather than trusting an anchor to hold it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
