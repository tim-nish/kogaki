---
id: reg-0101
status: pending
observed_at_pr: 476
observed_at_head: b2a421209ab11556a065b86ea516ede9f57e909e
class:
recorded: 2026-08-16
source_comment: 5306554914
---
**Row kind: instance-class** (kogaki#374 — a spent-bound latent non-gating in-diff carry, not an `out-of-dimension:` accretion row). Rule 3's three-of-a-class widening trigger reads `out-of-dimension:` lines only and **must not count these two**.

Source: PR #476 round 2, head `b2a421209ab11556a065b86ea516ede9f57e909e`. Both findings live in the diff's own text; the two-round bound (§4 clause 3) is spent at this head, so "resolve it in the review" is unavailable and neither justifies minting an issue.

---

**1. `docs/stories/1.70.move-screen-is-an-artifact.md:29` carries `§6.9.2 (v2)` — the per-section token the same commit established does not exist.**

The round-2 fix removed the invented `(v2)` from `specs/spec-draft-pipeline/SPEC.md:1084`, on the read that the file has **no per-section version tokens** and a file-wide counter (verified: no `### ` heading in that file carries a version token). The story doc's prose reference was not swept with it, so at this head the token survives in exactly one place in the tree — a file the same commit edits. Remedy: delete `(v2)`.

**2. `specs/spec-terrain/SPEC.md`'s new Status paragraph records the `v20`/kogaki#472 half of the token collision and not the `v19` half.**

Lines 16–20 record that `(v20)` is carried by §13.1–§13.4 (kogaki#472) with no Status entry — correct, and correctly recorded-rather-than-repaired. But `§14.4.1:4606-4607` also reads *"(v19, kogaki#472)"*, while the Status register's v19 entry (`:22`) names **kogaki#462**. That is the collision that actually lands inside the register — two amendments under one token — and it is the half left unrecorded. Remedy: one clause in the paragraph already doing this work; no additional licence needed, since it is the same recorded-not-repaired act.
