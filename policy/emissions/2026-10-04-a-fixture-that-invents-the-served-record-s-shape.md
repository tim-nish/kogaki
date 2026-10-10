<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-04
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1250's worker resolved a Journey's prose from the element_survey record's body field, and its fixture fed the resolver a hand-made record carrying that field. The fixture and the suite were green, but the served record is a manifest with no prose at all, so every live Packet build would have refused. One live gateway call at pickup found it; the prose is in the gloss_index shards the record's renderings name.

## The learning

When code reads a served record, the fixture's record must be copied from a real served response, not written from the field names the code expects. A fixture built from the code's own assumptions only proves the code agrees with itself. One live call made while reviewing the worker's result is the cheapest check that the assumed shape exists.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
