#!/usr/bin/env python3
"""Compose the claims record the judgment-point block drives with (kogaki#690).

Its own file rather than an inline heredoc: the block already nests one
heredoc for the fixture JSON, and a second one inside the same shell function
is how a quoting error becomes a silently skipped assertion.
"""
import json
import sys

survey = json.load(open(sys.argv[1], encoding="utf-8"))
group = "testing × (no second served tag)"
members = [c["id"] for c in survey["candidates"] if "testing" in (c.get("tags") or [])]
json.dump({
    "composition_pin": {"tag": "testing", "pin": survey["pin"], "groups": {group: members}},
    "claims": {group: "all carry the selected tag and no other"},
}, open(sys.argv[2], "w", encoding="utf-8"))
