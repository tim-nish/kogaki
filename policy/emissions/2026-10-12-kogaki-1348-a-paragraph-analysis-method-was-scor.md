<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-12
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1348: a paragraph-analysis method was scored against the owner's notes on four paragraphs, two of them held out from the agent that drafted them

## The learning

A rule written for a whole passage can hide the thing a smaller unit is about. The analysis format records the first sentence's link as 'none' because a passage has nothing before it. Applied to one paragraph, that rule left no place to say how the paragraph follows from the one before, and both failed checks were about exactly that link. Separately: when a check is scored against notes the drafting model must not see, the session that has read those notes cannot draft the held-out cases itself. Hand them to a fresh agent with a closed list of input files, and write the pass rules down before reading its output.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
