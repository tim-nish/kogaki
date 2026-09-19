<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-19
repo: Kogaki
grain: lesson

## Trigger — what happened

Realizing a /draft run needed the served Journey prose for four Strands, all tagged agents. Fetching the agents journey shard returned prose for two of them and nothing for the other two: each record's rendering address carries its own time window, and the four Strands were split across two windows. A grep for a missing record in the already-fetched shard returns empty, which reads exactly like a record that has no prose.

## The learning

When a store addresses its renderings by a compound key — a tag plus a window, a shard plus a period — records sharing the tag do not share the address. Fetching one shard and then searching it for each record you want silently converts a wrong-address miss into an absent-record finding, because both come back empty. Read each record's own declared rendering address from the manifest before fetching anything, and fetch the set of addresses that set of records actually names. A reader who can only report 'not in the shard I looked at' should say that, rather than 'not present'.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
