<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-27
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-10-27 the Move library was archived to refill only from reviewed Proof Sheets; check-brief-obligations and check-paragraph-plan-axes read Move records from moves/ by name and went red on master with no code change (found during kogaki#1620).

## The learning

A test that needs a sample record should carry its own copy of that record rather than read one out of a collection that people curate. A curated collection is emptied, renamed and refilled for reasons that have nothing to do with the test, and the test then fails on a commit that touched no code. Give the test a small record of its own, written for what the test checks, and keep the live collection for checks whose subject is the collection itself.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
