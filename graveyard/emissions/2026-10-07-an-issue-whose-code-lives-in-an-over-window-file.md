<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-07
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1299 on 2026-10-07: admit-issue verdict refused the only possible plan cell because src/terrain.mjs alone (about 475 KB) exceeds a worker's reading window; the split that would shrink it (#1259) is in progress in another session, and no native blocked-by relation names it, so record-pass had nothing to record the stop against.

## The learning

When an Issue's fix lives in a file larger than a worker's window, admission cannot stamp it at all, so the Issue is effectively blocked by whatever Issue splits that file. Filing such an Issue should add the native blocked-by relation to the split at filing time; otherwise a run reaches admission, is refused, and has no typed way to close. Separately, the same Issue's Acceptance named a check file that had already been removed under the retention rule, so a filer should confirm a named check still exists before citing it as the carrier.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
