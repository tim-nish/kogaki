---
id: reg-0186
status: pending
observed_at_pr: 733
observed_at_head: 48057ac
class: out-of-dimension
recorded: 2026-08-31
source_comment:
---
out-of-dimension: PR #733 — `reviews/register/`'s `class:` field has no
specified vocabulary. 144 of the 185 migrated records carry it empty (the
migration derived it from a leading `<token>:` in the row, which only 41 rows
had); `tools/render-register.sh` renders the empty case as `(unclassified)`
and `checks/check-observation-records.sh` does not gate it, because
`specs/SPEC.md` §21 enumerates the *status* set and says nothing about
classes.

This is accretion-class rather than a defect in this PR: the field is honest
about what the source rows carried, and inventing a class per record would be
the same inference the migration explicitly declined for `status`. What is
open is whether `class:` should have an enumerated vocabulary at all, or
should be dropped in favour of the class already stated in each record's prose.

**This record is its own first exhibit.** It is the first observation written
directly to the record directory rather than appended to the issue carrier,
raised by the review lane on the very PR that builds the directory — so the
new carrier is exercised by the change that introduces it rather than only
after it.

`source_comment` is empty because there is none: this observation never passed
through the issue. An empty provenance field on a record born here is correct,
and is distinguishable from a lost one precisely because the field exists.
