<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-18
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-10-18, consulting for kogaki#1434's admission, gloss_index with tag lessons/testing was refused by the served tool as not an axis=value pair, and gateway-query.mjs returned 'gateway error: unknown: no reason given' for both lessons/testing and testing.

## The learning

The served gloss shard for testing lessons is now addressed as lessons/tag=testing; the older lessons/testing form is refused. Through policy/kit/bin/gateway-query.mjs the same shard call failed with an unexplained gateway error, while the direct MCP call with lessons/tag=testing returned the 310-line shard. A session that needs a boundary receipt from that shard should call the MCP tool with the axis=value address and quote the UnitID@hash from it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
