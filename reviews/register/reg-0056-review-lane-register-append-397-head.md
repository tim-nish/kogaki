---
id: reg-0056
status: pending
observed_at_pr: 397
observed_at_head: ac1ba250b5c5bcea217de91f499a847b2deaf0e9
class:
recorded: 2026-08-12
source_comment: 5267461075
---
review-lane register append — PR #397 (head `ac1ba250b5c5bcea217de91f499a847b2deaf0e9`), round 1.

**Row kind: instance-class** — a `carried: register` disposition on an open non-gating finding, not an `out-of-dimension:` observation. Per kogaki#374 it does **not** count toward rule 3's three-of-a-class widening trigger, which reads over `out-of-dimension:` lines only.

finding (nit, open): `.claude/skills/review-lane/SKILL.md:845-846` — the round-counting repair landed by PR #397 names `rally_cycles()` as "the one place the count is computed". `rally_cycles()` returns `(heads, unattested)`; the count is composed in `rounds_used()` (`tools/review-sweep.sh:1549`, `len(heads) + len(unattested)`), whose own docstring reserves that phrase for itself. The unit rule the sentence points at is correct; the function named for the *count* is one over. Remedy is one clause.

Class, for anyone reading the ledger for recurrence: a repair that re-points prose at the shipped code lands on the neighbouring function — the same text-vs-code genre kogaki#283 repaired, one notch smaller.
