<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-14
repo: Kogaki
grain: lesson

## Trigger — what happened

A large task was closed after splitting off one leftover piece into its own new work item, so the leftover would have a clear owner. The very next change made under the ORIGINAL task's authority then did the leftover piece as well, and merged. The new item sat open for two days claiming the work was outstanding. Three separate automated reads looked at it in that time and none could tell: the report that looks for a commit fixing an item searched for the item's number and found none, because the commit named the original task; the housekeeping pass keys off a classification the item never received; and the health check asks whether an item has gone stale, never whether its work already exists. It was found only because someone finally picked the item up and checked the codebase before starting.

## The learning

When you split a leftover piece off an item and close the parent, the piece is most likely to be done by the very next work under the parent's authority — and nothing will connect the two, because the change that does it cites the parent, not the offspring. Every automated read is asking a different question: has a commit named this item, is this item classified, has this item gone stale. None asks whether the work already exists, and the three together still do not cover it, so the absence of an alarm is not evidence. The cheap moment to check is the parent's own terminal state — the merge or close that discharges it — because that is when the split is still in mind and the relationship is still visible; afterwards nobody holds both ends. Two habits follow. When a change lands under a parent's authority, ask what was split off that parent and whether this change covered it. And before starting work on any item, read the current state of the thing it asks for — the check costs one read and is the only step that catches this at all.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
