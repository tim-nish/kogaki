---
id: reg-0132
status: pending
observed_at_pr: 546
observed_at_head: c1e85e0
class:
recorded: 2026-08-19
source_comment: 5341827682
---
**From PR #546 round 2 (kogaki#524, head `c1e85e0`) — two findings carried at a spent bound.**

Both are in-diff and both are cheap; neither was fixed because round 2 is the bound, and moving the head would leave `review-report` naming a stale commit with no reachable round.

**should — §4.11 asserts an admission §4.1 does not make.** `specs/spec-draft-pipeline/SPEC.md:842` says `bridges` "is admitted in §4.1 as optional"; §4.1's field list at line 291 does not carry it. The runtime is correct and validated; it is the spec that is internally inconsistent, and a reader checking §4.1 for the field's contract finds nothing. Repair: add `bridges` to §4.1's list, pointing at §4.11 for its shape.

**nit — the validation stops short of the property its own failure message names.** `brief/compose.mjs:71-76` checks that `bridges` is an array of exactly two non-empty strings, never that either id names a Step in the path. The message says "the two adjacent steps this Step was inserted between", so a value naming steps that do not exist passes. Repair: resolve both ids against the seen set, the way `depends_on` and `step_effect` grounds already do — the surrounding code has the pattern.

Successor: neither is filed as its own issue yet. The natural home is the next Brief-composition sitting that touches §4.1's field list, which will have both files open.
