<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-27
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1205 on 2026-09-27: the implementer was stopped verification-refused 30 seconds in, before any edit, because its first three reads of a 1206-line checker were refused by the read-window guard (read it in 400-line windows). The failure question offered two arms, inspect and lane-declaration, both of which route the correction to the allow list or the plan footprint; the owner chose inspect, and inspection showed no allow entry or footprint could have prevented any of the three refusals. Same defect as /ship-cycle 1203 the day before, now on a second issue.

## The learning

When a worker's stop rule counts shape corrections (re-issue this read in a smaller window) as permission denials, any issue whose plan names a large file will stop at its first reads, and the recovery arms the harness offers cannot fix it, because they only edit permissions. The failure is in the counter, not in the lane, so the same issue fails identically on every re-dispatch until the counter distinguishes a correction from a denial. A recovery menu is only complete if at least one arm reaches the component that actually refused.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
