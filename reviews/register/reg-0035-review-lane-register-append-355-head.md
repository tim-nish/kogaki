---
id: reg-0035
status: pending
observed_at_pr: 355
observed_at_head: 1db39c9
class:
recorded: 2026-08-11
source_comment: 5251156098
---
review-lane register append — PR #355 (head `1db39c9`), round 1.

**`carried: register` — two findings from PR #355, so they survive the merge.**

1. **§6.2 v7 rule 3's surface scope is decided only in the implementation.**
   `cmdCotags` suppresses a split that is not tighter than its parent;
   `cmdReport` renders the SubGroups from the same subdivision record with no
   verdict consulted, so one run's two owner surfaces disagree about whether the
   group has a split. §6.2 v7 item 3 reads unconditionally. Remedy is one of two
   small edits and the choice is a spec act: scope rule 3 to the judging screen,
   or apply the suppression in `cmdReport`.
2. **No mutation table in the PR record**, for a diff that changes two
   subdivision fixtures in `checks/check-terrain-composition.sh`
   (`specs/SPEC.md:511`). Accretion-class: the value is the count. This is the
   record's absence, not a claim about the fixtures — the added crafted case
   genuinely discriminates.

**`out-of-dimension:` — a review spawn cannot discharge the lane's own re-route
remedy.** The skill prescribes filing carved-out scope through
`story-sync file-issue`; that path is not among a review spawn's granted tools,
so every out-of-scope finding degrades to `declined:` or `carried: register`,
and `carried: #<N>` is unreachable from the session that found the scope. Class:
lane-instrument gap — the same class as kogaki#65 item 3's denial extractor, a
per-review sitting discovering it has no instrument for something the lane
requires of it. Recorded here rather than re-derived per round.
