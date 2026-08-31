---
id: reg-0150
status: pending
observed_at_pr: 580
observed_at_head: 774b1917a01c57c9f4216e56377ab4dbc238156a
class: out-of-dimension
recorded: 2026-08-20
source_comment: 5358092026
---
out-of-dimension: (accretion-class — this row's value is the count, not the instance) In-repository `file:line` pins inside spec text drift with no observer. `policy/kit/bin/issue-pins.mjs --recheck` verifies *served* pins only, so an in-repo pointer can resolve to unrelated text indefinitely while looking sound. Observed on PR #580: `specs/spec-gate-carrier/SPEC.md` §3.1 pins its load-bearing manifest quote to `specs/SPEC.md:99-101`, where the quoted text actually lives at `specs/SPEC.md:4745-4747` and `:99-101` carries unrelated text about derived-artifact sensitivity — and the same stale pointer pre-dates the diff in that file's header block. Reported as finding 1 at head `774b1917a01c57c9f4216e56377ab4dbc238156a`; recorded here because the class is a missing observer, which is a property of the repository rather than of this PR.
