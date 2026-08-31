---
id: reg-0111
status: pending
observed_at_pr: 485
observed_at_head:
class:
recorded: 2026-08-16
source_comment: 5308165725
---
Two observations from PR #485 round 2 (kogaki#481, merged 2ce11de), each
`carried: register` at a spent bound:

1. **The v22 Status entry's index is short**: f0d43d9 amended §11 under v22
   (the round-1-directed propagation) and the entry still describes v22 as a
   §13.5 re-pointing alone — the v19 precedent ("amended by name") applied in
   the text and not in the record. One clause in the current entry names §11.

2. **`specs/spec-terrain/SPEC.md:4302` wraps at ~89 columns** against the
   file's ~78 — the finding-3 substitution landed in place without a re-flow.
   One re-wrap.
