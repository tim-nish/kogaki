#!/usr/bin/env bash
# No file under `src/`, `prompts/` or `.claude/skills/`, and not `specs/spec-draft-pipeline/SPEC.md`,
# holds the word `waypoint` (kogaki#1885, maintainer's decision 2026-11-19): the list of claims a Leg
# was decomposed into left the implementation and the records, and nothing is renamed to keep it.
# THE PREDICATE IS OVER THE WORD: `waypoint` in any case and with any ending, also inside a longer
# name (`paragraph_waypoints`, `waypointsRefusal`). A hit is a failure, never a candidate.
# ONE FILE IS LEFT OUT BY NAME: `src/candidate-schema.json`, whose text two calls of `/brief` are
# sent; kogaki#1890 rewords it and removes this exception. This check's fixtures live outside the
# scanned roots.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 - "$@" <<'PYX'
import re, subprocess, sys

RETIRED = re.compile(r"waypoint", re.IGNORECASE)
LEFT_OUT = {"src/candidate-schema.json"}

def hits(text):
    return [(i, l.strip()) for i, l in enumerate(text.splitlines(), 1) if RETIRED.search(l)]

# THE FIXTURE PASS RUNS ON EVERY INVOCATION. Cases 1-6 are forms of the word;
# 7-9 are the CONTROLS that stop the deny passing vacuously.
FIXTURES = [
    ("the bare word fails", False, "each Waypoint is one Segment of the bound Move"),
    ("the plural fails", False, "generates that Leg's waypoints"),
    ("an upper-case form fails", False, "THE WAYPOINT IS ONE SEGMENT"),
    ("a stored key fails", False, "`waypoints`: [{ point, case }]"),
    ("a snake_case field fails", False, "`paragraph_waypoints` and `leg_waypoint_you_must_plan`"),
    ("a name in code fails", False, "export function waypointsRefusal(list, at) {"),
    ("a Leg said by its relation passes", True, "each Leg says its relation's `holds` in its `text`"),
    ("the two words apart pass", True, "the way a point is made"),
    ("another word on the same stem passes", True, "wayfinding through the Reader Path"),
]

bad = 0
for label, should_pass, text in FIXTURES:
    if (not hits(text)) != should_pass:
        print("FAIL: fixture case %r did not behave as declared (hits=%r, expected pass=%s)" % (label, hits(text), should_pass))
        bad += 1
if bad:
    sys.exit(1)
print("ok: fixture pass (%d case(s)) — the retired-word predicate discriminates" % len(FIXTURES))
if "--self-test" in sys.argv:
    sys.exit(0)

listed = subprocess.run(["git", "ls-files", "src/", "prompts/", "specs/spec-draft-pipeline/SPEC.md", ".claude/skills/"],
                        capture_output=True, text=True, check=True).stdout.split()
files = [f for f in listed if f not in LEFT_OUT]
failures, read, skipped = [], 0, []
for f in files:
    try:
        text = open(f, encoding="utf-8").read()
    except (OSError, UnicodeDecodeError) as exc:
        skipped.append((f, exc.__class__.__name__))
        continue
    read += 1
    failures.extend((f, n, l) for n, l in hits(text))

for f, why in skipped:
    print("skipped: %s (%s) — NOT read, and not counted as read." % (f, why))
if failures:
    for f, n, l in failures:
        print("FAIL: %s:%d holds the retired word." % (f, n))
        print("      %s" % (l[:160],))
    print()
    print("read: %d of %d file(s); left out by name: %s." % (read, len(files), ", ".join(sorted(LEFT_OUT))))
    print()
    print("The list of claims a Leg was decomposed into left Kogaki (kogaki#1885): remove what the line")
    print("describes, and do not keep it under another word.")
    sys.exit(1)
print("ok: check-retired-waypoint-names — read %d file(s) under src/, prompts/ and .claude/skills/ and the draft-pipeline "
      "spec, leaving out %s; none holds the retired word (kogaki#1885)" % (read, ", ".join(sorted(LEFT_OUT))))
PYX
