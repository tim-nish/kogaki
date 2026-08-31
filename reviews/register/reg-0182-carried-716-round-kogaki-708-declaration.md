---
id: reg-0182
status: pending
observed_at_pr: 716
observed_at_head:
class:
recorded: 2026-08-30
source_comment: 5468538696
---
Carried from PR #716 round 1 (kogaki#708, the declaration repair). One `nit`,
non-blocking, assigned here by the round.

**A historical description of a replaced mechanism reads as the current one,
inside the field whose whole purpose was to stop that.** PR #716 brought three
declarations into agreement with the implementation after the marker window went
from two-line symmetric to ten-line forward. `checks/registry.json`'s
`efficacy_note` still contains a fourth occurrence of the old phrasing — three
registry lines "were passing only because this admission record's own prose
quotes the marker token **within the two-line window**".

**It is accurate as history and misleading as description.** That break-test run
genuinely predates `d0efd66`, so the sentence is true about the event it
records. But it sits in the same declaration set the PR exists to correct, in the
very field the diff edits, with no tense or date anchor — so a reader who arrives
at it takes it for the current mechanism, which is exactly the failure the
remainder was filed to remove.

**The repair is four words**: "under the then-current two-line window".

**The general shape, which is why this is worth keeping.** When a mechanism is
replaced, a sweep for its old description finds the *specifications* of it and
misses the *narrations* of it — the incident reports, the evidence notes, the
break-test records — because those are grammatically about the past and read as
about the present. A sweep keyed on the phrase alone cannot separate them; only
reading each hit for tense can, and nothing prompts that. The tell is a
replaced mechanism's vocabulary surviving in exactly the fields that record why
it was replaced.

**Not promoted:** the sentence is true, nothing is broken, and reachability is a
reader's misreading rather than a runtime path. Recorded as the count of such
narration-vs-specification residue rather than as this instance's defect.
