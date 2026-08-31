---
id: reg-0098
status: pending
observed_at_pr: 475
observed_at_head:
class:
recorded: 2026-08-16
source_comment: 5306331510
---
**review-lane register append — PR #475, round 2** (`8434cf0`). Two findings carried
here by `carried: register`. **Both are instance-class rows** (kogaki#374 shape):
their value is the defect each names, not a count, so **neither counts toward rule
3's three-of-a-class widening trigger**, which reads `out-of-dimension:` rows only.
**No `out-of-dimension:` row this round.**

Why the register rather than an issue or the review: the two-round bound is spent at
this report, so "resolve it in the review" is unreachable (kogaki#433), and each is
a latent non-gating finding in the diff's own text — nothing executable reads either,
so neither is reachable against currently served state (kogaki#374's floor).

---

**1. Five of `report-format.json` v6's sixteen neighborhood class notes cite the
wrong source line, and the round-2 pointer pass did not reach them.**

Round 1 found `§13.7`'s `cmdReport (:1788)` and `full_report.emitter`'s
`:1652`/`:1788`; `8434cf0` corrected those three and restated the read range as
`:3274-3422`. Within that restated range, five `read off terrain/terrain.mjs:<n>`
notes point at a line other than the `say()` they describe (verified at this head):

| class | cited | actual `say()` | what the cited line is |
|---|---|---|---|
| `neighborhood_grouping_header` | `:3379` | `:3378` | `for (const fam of famOrder) {` |
| `neighborhood_family_section` | `:3387` | `:3385` | a comment line |
| `neighborhood_group_heading` | `:3406` | `:3405` | `for (const s of rows) say(…)` |
| `neighborhood_unresolved_header` | `:3417` | `:3416` | `for (const u of unresolved) {` |
| `neighborhood_unresolved_row` | `:3419` | `:3418` | the loop's closing `}` |

`neighborhood_unmapped` (`:3412`) and the round-1-added `neighborhood_disjointness`
(`:3422`) are correct, so this is not a uniform frame shift that one offset would
repair — it is five independent citations, each landing on structural syntax rather
than on the emitted line.

The shape worth keeping: **a pointer repaired by name repairs the pointers that were
named, and a version note restating a read range ("the read range is `:3274-3422`")
reads as a re-verification of every citation inside it.** These two are different
acts and the second is the one a later reader will believe. Nothing checks a `read
off …:<n>` note against the file it names.

**2. PR #475's body is stale against its own round-2 fix.**

The body's change table still says "**fifteen** line classes under `full_report`"
(now sixteen — `neighborhood_disjointness` was added at round 1) and still says
"§14.5 — fixture count stays two; the Full Report specimen **gains** a non-empty
section" (moved to the owed tense by `8434cf0`, carrier kogaki#473). The commit
trailer carries the corrected count; the PR body, which is what the merge record and
later archaeology read first, does not.
