<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-11
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1331: the Brief's Defined Terms had to be written once at mint, but classifying words is judgment and the mint was a plain write step with no model call

## The learning

When a value must be written exactly once by a step that does no judging, give that step one judged question of its own, asked just before it writes, rather than adding a new step to the flow. A new step would be a second place able to write the value, and every saved run that already passed the writer would now look unfinished and replay the new step first. The cost is that the run's count of judgment points no longer counts this one, which the reviewer flagged.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
