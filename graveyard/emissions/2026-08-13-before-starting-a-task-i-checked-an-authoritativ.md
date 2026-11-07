<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-13
repo: Kogaki
grain: lesson

## Trigger — what happened

Before starting a task I checked an authoritative status field and it read clean. During the task I pushed additional work, which changed that field. At the end I performed the irreversible action without re-reading the field, and it did the thing the earlier check had confirmed it would not do. The earlier reading had been correct when taken.

## The learning

A check of a mutable property answers about the moment it ran, and the gap between that moment and the action is where the answer expires. This is distinct from checking the wrong thing: the field can be exactly right, read exactly correctly, and still be stale by the time it matters, because the work done in between is what changed it. The tell is that the check feels settled — a clean reading produces a sense of having handled it, and nothing prompts a second look, least of all when the intervening work was unrelated in intent. The rule that follows is about placement rather than method: a read of a property that a later step can change belongs immediately before the step that depends on it, not at the moment the concern first arises. Where the action is irreversible, that placement is the whole safeguard. It is worth noticing when the intervening work is the thing that flipped it, since that is the case where nobody suspects anything: the change was a side effect of doing the task correctly, and no error was made anywhere along the way.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
