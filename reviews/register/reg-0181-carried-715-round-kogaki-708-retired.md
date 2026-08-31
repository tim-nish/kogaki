---
id: reg-0181
status: pending
observed_at_pr: 715
observed_at_head:
class:
recorded: 2026-08-30
source_comment: 5468159509
---
Carried from PR #715 round 2 (kogaki#708, the retired-vocabulary tripwire).
One `nit`, assigned here by the round; the round's `should` is a live remainder
on #708 rather than here.

**A two-key edit landed as a 152-line reformat of a served spec artifact.**
`d0efd66` added two `_retired_vocab_ok` sibling keys to
`specs/spec-terrain/survey-schema.json` by round-tripping the file through
Python's `json.dump(indent=2)`. That exploded every inline array and object to
one element per line, so a 2-line change arrived as 152 insertions and 24
deletions, burying the reviewable part of the hunk in a file consumers read.

**Semantically inert, which is exactly why it is worth recording.** Every array
kept its members in order and the file parses identically, so no check could
fail and no reader of the *result* would notice. The cost is entirely at review
time: a reviewer's ability to see what changed was destroyed by a formatting
side effect of the tool used to make the change.

**The general shape.** A structured-data edit made by parsing and re-serializing
re-authors the WHOLE file under the serializer's conventions, not the file's.
The diff is then a claim about the serializer rather than about the edit. The
cheap alternatives are a textual insertion at the site, or `json.dump` with the
file's own formatting recovered — and the tell is a diff stat wildly out of
proportion to the described change, which is visible before pushing and was not
looked at here.

**Not promoted to an issue:** the file is correct as it stands, so there is no
defect to repair — only a practice to apply next time a served JSON artifact is
edited programmatically. Reachability is the authoring act, not the runtime.
