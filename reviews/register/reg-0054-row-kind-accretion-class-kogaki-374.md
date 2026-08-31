---
id: reg-0054
status: pending
observed_at_pr: 395
observed_at_head: 76cb2f4
class:
recorded: 2026-08-12
source_comment: 5266338993
---
**Row kind: accretion-class `out-of-dimension:`** (kogaki#374 — counts toward rule 3's three-of-a-class trigger; not a spent-bound carry).

out-of-dimension: `_rounds_observation(bodies, bound=None)` raises `TypeError` on an argument-less call rather than binding nothing — `len(heads) <= None` (`checks/check-review-report.sh:1984`) is not a valid comparison in Python 3, while the docstring at `:1909-1914` describes the argument-less call as one that "binds nothing". Pre-existing at PR #395's base, untouched by that diff, and outside both of the lane's dimensions: it is neither a licence question nor a boundary-vs-receipt question. Class: **a docstring describing a degradation the code does not actually perform.**

Observed on PR #395 (head `76cb2f4`), review-lane round 1.
