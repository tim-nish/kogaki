<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-18
repo: Kogaki
grain: lesson

## Trigger — what happened

On kogaki#1411 the ParagraphPlan reader began requiring a join on every Leg Waypoint after the first. The admitted file list named the stage and its own check but not checks/check-proof-sheet-leg-brief.sh, which writes a plan file through the shared writer and has /draft read it. The Issue body had to be amended and the Issue re-admitted before that check could be edited.

## The learning

When a change makes a reader require something it used to accept without, list every caller of the record's shared writer before sizing the file list, checks included. Each caller that builds the record outside the stage now produces a file the reader refuses, so each one is part of the change. A search for the writer's name across the check folder finds them in one step.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
