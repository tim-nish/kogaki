<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-19
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1447: adding a review item over the Packet's Opens-from lines showed that the waypoints block's list reader keeps only list items, so the indented Opens-from line under each waypoint never reached any review item, including the one already asking whether waypoint text leaked into the prose.

## The learning

When a document gains a new kind of line inside an existing section, check that the reader of that section still returns it. A reader built to pick out list items quietly drops anything else, so every check that reads the section goes on passing while never seeing the new line. Here the joins added to the plan's waypoints were invisible to the draft review for as long as they existed, and the 'does the prose copy a waypoint' question was never asked about them. The fix is to give the new line its own reader, numbered by where it sits, rather than assume the section's reader covers it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
