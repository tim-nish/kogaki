<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-14
repo: Kogaki
grain: lesson

## Trigger — what happened

Before publishing work for review I ran the tool that checks whether a certain obligation was met, and it said everything was fine. I put that result in the summary as evidence. The tool compares the work against a starting point, and I had given it a starting point identical to the work itself, so it was comparing the work to itself and finding no differences to check. Given the real starting point it failed. A reviewer ran it properly, found the failure, and noted that the false line in my summary was worse than the failure, because a reader who believes it stops looking.

## The learning

A checking tool given a degenerate input returns a pass that looks exactly like a real pass. Comparing something against itself yields nothing to object to, and the report says what it always says. So before quoting a tool's output as evidence, confirm the tool was given something to work on: that the range is non-empty, the input list is not empty, the comparison points differ. The failure is quiet in both directions -- the tool is not broken and the operator is not careless, and nothing in the output distinguishes checked-and-clean from nothing-to-check. Worth separating two harms: the unmet obligation is recoverable, while the false claim of evidence is worse, because it redirects the next reader away from the thing that needs looking at. If you cannot show what the check actually examined, report that you ran it rather than what it concluded.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
