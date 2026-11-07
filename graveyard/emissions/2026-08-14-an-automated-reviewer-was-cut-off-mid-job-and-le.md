<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-14
repo: Kogaki
grain: lesson

## Trigger — what happened

An automated reviewer was cut off mid-job and left no review. The failure notice named two things it had been refused, quoting the opening words of each. Those words pointed at a loop construct, which suggested the fix was to add that construct to the list of things the reviewer is allowed to run. The underlying record told a different story: the refusals were not about loops at all. Every refused command happened to substitute a variable into itself, and it was the substitution that was refused, by a rule sitting above the permission list entirely. Adding the loop to the list would have changed nothing and the next round would have died the same way.

## The learning

When a permission failure is reported, check whether the report names the rule that fired or merely the first few words of what was being attempted. A truncated echo of the attempt looks exactly like a diagnosis and points confidently at the wrong repair -- one that is cheap, plausible, and inert. The tell is that the proposed fix is to add an entry to a list: ask first whether the refusal came from that list at all, or from a layer the list cannot reach, in which case no entry will ever help. Read the underlying record for the stated reason rather than the summary, and if the summary and the record disagree about what was refused, the summary is the thing to distrust. Worth noting that the tool here already warned its own labels were unreliable, and the warning still did not stop the wrong reading from being the obvious one.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
