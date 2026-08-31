---
id: reg-0156
status: pending
observed_at_pr: 586
observed_at_head: 49e6282fe5c383e773e7cb88678df39486566108
class:
recorded: 2026-08-21
source_comment: 5365663223
---
Register append — review lane, PR #586 round 2 (head `49e6282fe5c383e773e7cb88678df39486566108`).

**Row kind: instance-class** (kogaki#374) — three spent-bound latent non-gating
in-diff carries, NOT `out-of-dimension:` rows. Their value is the defect each
names, not the count, so **none of them counts toward rule 3's three-of-a-class
widening trigger**, which reads `out-of-dimension:` lines only. Two rounds were
spent and auto-merge is armed on #586, so "resolve it in the review" was
unavailable and the kogaki#374 floor applies.

All three are in `checks/check-spec-pin-resolve.sh`, landed by PR #586 under
kogaki#583.

1. **The `>`-blockquote branch is exercised by no fixture and no mutation.**
   `:189-192` joins a contiguous blockquote whole, which is what lets a
   quotation spanning two or more `>` lines be matched at all — the corpus's
   dominant citation shape and kogaki#583 instance 1's own. Neither
   `wrong-pin.md` nor `blank-line-shape.md` uses a `>` line, so deleting the
   walk leaves all four fixture cases passing, and the PR's mutation table
   exercises the blank-skip, the quote match and the line-range check but never
   this branch. kogaki#209's shape one branch over: the branch that made the
   founding specimen visible is the one no counterfactual protects. Remedy: a
   fifth fixture (a two-line `>`-blockquote a blank line above a wrong pointer)
   and a fourth mutation row.

2. **`quote_present` can return `True` having matched nothing.** `:126-134`
   splits the quotation on `…`/`...` and skips every segment under 12
   normalized characters; a quotation whose segments are all short — e.g.
   `"the count … the pins … the tree"`, 31 chars, three sub-12 fragments —
   skips every segment and returns `True`. The pointer then yields `ok-quoted`
   (`:211`) and increments the `with their adjacent quote matched at the target`
   tally, so a pair nothing verified is reported as verified. The weaker half is
   already live: `specs/spec-terrain/SPEC.md:1873` quotes
   `"nothing … discharges an ordering"`, where the discriminating fragment is
   dropped and only the 22-char tail is required. Latent at that head (no
   all-short-segment quotation in the corpus); reachable by any spec amendment
   that elides twice. Remedy: require at least one matched segment, or fail
   closed when every segment is skipped — a floor whose exceptions can consume
   the whole input has no floor.

3. **`bare-served.md` appears in no row of the mutation table.** Four fixtures
   are added or changed by #586 and kogaki#230 asks that each appears; three do.
   The bare-served classifier (`:160-166`) is the one report-only branch whose
   count — 69 — the admission record explicitly names as the evidence a later
   promotion argues from, so a classifier nothing has been shown to discriminate
   underwrites a number a future decision act will lean on. One row (widening
   `PIN_ADJACENCY`, or removing the `SERVED_NAMESPACE` match) closes it.

Report: https://github.com/tim-nish/kogaki/pull/586#issuecomment-5365659238
