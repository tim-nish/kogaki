<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-08
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1259 --session on 2026-10-08, after claude-toolkit#1456 landed: tracking-status reads #1259's three children closed, but ~/.claude/hooks/lint-implement-license.py still refuses any commit on an Issue with an anchored tracking: structural-carrier comment, with no check for a later admission stamp carrying admitted-over-discharges.

## The learning

When a state can be lifted, every reader of that state has to learn the lift, not only the reader that triggered the fix. claude-toolkit#1456 taught admission and tracking-status that a tracking carrier with discharged children is lifted, but the licence hook reads the stamp on its own and was not changed, so the work stays uncommittable and a run finds out only at its first commit. Before starting a pass, check every reader of the state the fix touched.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
