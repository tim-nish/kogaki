<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-19
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1449 asked the paragraph planner and its judge to take a Paragraph Waypoint's words only from its Leg Waypoint's point and Claim, but an earlier owner decision (kogaki#1382) had already removed the Claim from what the planner is given.

## The learning

A rule that names an input for a model to check against is only as good as that input actually reaching the model. Before writing such a rule, look at what the call really receives. Where the named input was removed, say in the rule itself what the check falls back to, rather than naming something the model cannot see.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
