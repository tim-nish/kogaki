#!/usr/bin/env python3
"""The arm's own premise: the enumeration it judges against is EMPTY (kogaki#690).

Asserted rather than assumed. If the selection stops yielding an empty
neighborhood — a fixture change, a bound change — the arm below would pass by
testing the populated case a sibling arm already covers, which is the
assertion-that-cannot-fail shape this block exists to avoid.
"""
import json
import sys

emitted = json.load(open(sys.argv[1], encoding="utf-8"))
n = len(emitted.get("candidates") or [])
if n:
    print(f"    the enumeration carries {n} candidate(s), not 0", file=sys.stderr)
    sys.exit(1)
sys.exit(0)
