<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-14
repo: Kogaki
grain: lesson

## Trigger — what happened

A pipeline files its own work items through a typed creation command, then later stages decide what is finished and close it. The creation command records the new item in one place; every later stage looks in a different place. Nothing errors. The item exists, its work gets done and merged, and then it sits open forever, because the machinery that would close it cannot see it at all. The gap surfaced only when someone asked why a specific finished item was still open and found the closing stage had emitted nineteen findings and not one row about it. Measured afterwards: nine of thirteen open items were in that state.

## The learning

When a system both creates work items and later decides they are done, check that the creating act writes the state the deciding acts read. It is easy to miss because the creating act is correct about its own record and the deciding acts are correct about theirs — the defect lives between them, and the symptom is an absence, which no output shows. Absence is the specific hazard: a stage that skips an item reports nothing about it, so a finished-but-unclosed item is indistinguishable from one nobody has got to yet. Two habits catch it. When you add a creating act, list the acts that will later read what it produced and confirm each reads a field the creation actually writes. And where several readers share a lookup, put the requirement in that shared lookup rather than in each reader, because fixing readers one at a time leaves the number of blind ones unchanged. The strongest tell that this is your problem is that the system produced the orphan itself: an item created by hand at least gets noticed by the person who made it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
