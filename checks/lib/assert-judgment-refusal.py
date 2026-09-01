#!/usr/bin/env python3
"""An UNJUDGED run REFUSES — it does not reach a Full Report (kogaki#741/#754).

Replaces `assert-judgment-skip.py`, which asserted the superseded ruling: that
both neighborhood states were conditional, that a run naming neither SKIPPED
them, and that `full_report` completed anyway. §13.4 now makes both states
UNCONDITIONAL and the Report REQUIRES the judgment pass by design, so the arm
this file checks is the inverse of the one it replaced.

Two things are asserted, and the second is what makes the first mean anything:

  1. no Full Report artifact was written, and
  2. NEITHER neighborhood state is recorded as a skipped conditional —

because a run that refused for some unrelated reason would satisfy (1) alone,
and a record still naming the states as skipped would mean the conditional
design survived somewhere the flip did not reach.
"""
import json
import sys

rec = json.load(open(sys.argv[1]))
skipped = set(rec.get("conditional_skipped") or [])
states = {"neighborhood_input", "J3_neighborhood"}
problems = []

still_skipped = states & skipped
if still_skipped:
    problems.append(
        f"the run record names {sorted(still_skipped)} as skipped conditional(s); "
        "§13.4 makes both states unconditional, so nothing may record them as skipped")

wrote = [a for a in (rec.get("artifacts_written") or [])
         if "FullReport" in str(a) or str(a).endswith("full_report")]
if wrote:
    problems.append(
        f"a Full Report was written ({wrote}) by a run carrying no neighborhood judgment; "
        "§13.4 refuses an unjudged neighborhood rendering and there is no path to one")

if problems:
    for p in problems:
        print(f"  - {p}")
    sys.exit(1)
sys.exit(0)
