---
id: reg-0050
status: pending
observed_at_pr: 387
observed_at_head: c3bb0fa
class:
recorded: 2026-08-12
source_comment: 5264120467
---
## Appended from PR #387 round 2 (head `c3bb0fa`)

Two rows, of the two different kinds this ledger now holds (kogaki#374). Each says which it is, so rule 3's three-of-a-class trigger reads only what it is meant to.

### Row 1 — INSTANCE-class (a spent-bound carry, NOT counted toward widening)

`carried: register` from PR #387's round-2 report, second round spent.

**The defect.** `specs/spec-terrain/SPEC.md` head block states "**This line was FALSE from the moment it was written**", and that the slot "was decided and its answer was shipping in `terrain.mjs`" at that moment. Two timestamps falsify both halves:

- `145d90a`, which introduced the `STILL OPEN IN THIS FILE` lead-in — `2026-08-12T01:33:22+09:00`
- kogaki#300's owner-selection comment filling the slot — `2026-08-12T01:50:30+09:00`, **17 minutes later**
- `180c014` (PR #367), which introduces `NEIGHBOR_ID` into `terrain/terrain.mjs` — `2026-08-12T10:02:01+09:00`, **8.5 hours later**

The line was accurate for seventeen minutes and then went stale under a decision recorded on another carrier. Remedy is one clause. Non-gating under kogaki#72 — prose accuracy in a spec's historical aside, no consumer born on it.

**Why it is here rather than on an issue.** The two rounds §4 clause 3 allows are spent at `c3bb0fa`, and minting an issue or a successor for a one-clause prose repair costs at least two further review rounds. Recorded here so the count of *this* class — an unmeasured historical claim written inside a paragraph whose subject is measuring claims — stays visible: it is now the **second** instance on this one file, round 1's finding 1 being the first, each introduced by the sitting repairing the previous one.

### Row 2 — `out-of-dimension:` (ACCRETION-class, counted)

`out-of-dimension:` PR #387 — the lane's prescribed **fixed first move**, an unscoped tier-1 `gloss_index` survey, is unperformable as written from a review session. The call returns 76,961 characters on a **single line**, which exceeds the harness's tool-result token cap; the harness spills it to a file and directs the reader to byte-slice it, which is exactly the ad-hoc slicing `.claude/skills/review-lane/SKILL.md`'s *What a review reads* section rules out of scope for a per-PR review. So the opening move is either skipped or paid for in the turns that section exists to protect.

This is a property of the **lane**, not of PR #387, and is recorded once here rather than re-discovered each round — the instrument gap kogaki#65 item 3's denial extractor is the precedent for. The shape a fix would take is a bounded first move (a tier-1 survey with a result cap, or a headline-count-limited form), not a wider grant.
