#!/usr/bin/env python3
"""An unjudged run SKIPS both judgment-point states and still completes the
report (kogaki#690, owner ruling 2026-08-29).

Asserts the skip is RECORDED, not merely that nothing broke: the ruling makes
an unjudged pull a legitimate terminal, and what the declaration removes is the
SILENT version of it — a run whose record does not name the skip is
indistinguishable from a table that never had the states.
"""
import json
import sys

rec = json.load(open(sys.argv[1], encoding="utf-8"))
skipped = set(rec.get("conditional_skipped") or [])
completed = set(rec.get("completed") or [])
missing = {"neighborhood_input", "J3_neighborhood"} - skipped
if missing:
    print(f"    not recorded as skipped: {', '.join(sorted(missing))}", file=sys.stderr)
    sys.exit(1)
if "full_report" not in completed:
    print("    full_report did not complete on the unjudged path", file=sys.stderr)
    sys.exit(1)
sys.exit(0)
