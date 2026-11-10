#!/usr/bin/env bash
# No file under `src/`, `specs/spec-draft-pipeline/SPEC.md` or `.claude/skills/` names a
# "Leg Waypoint" or a "Paragraph Waypoint" (kogaki#1775, owner design 2026-11-10): the Brief
# ends at Legs and carries no Waypoint, "Waypoint" names only the ParagraphPlan's claims, and
# the Leg-level point it plans over until kogaki#1777 is a "Brief Waypoint".
# THE PREDICATE IS OVER THE FORBIDDEN FORM: `leg` or `paragraph`, a space or hyphen, and
# `waypoint(s)`, in any case, also wrapped at a line break. A hit is a failure, never a
# candidate. A snake_case field (`paragraph_waypoints`) does not match: kogaki#1777 owns it.
# NO EXEMPTION LIST: this check's fixtures live outside the scanned roots. NOT VERIFIED: that
# "Waypoint" and "Brief Waypoint" are each used for the right thing -- that stays with review.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 - "$@" <<'PYX'
import re, subprocess, sys

RETIRED = re.compile(r"(?:\b|(?<=\\b))(?:leg|paragraph)[ -]waypoints?\b", re.IGNORECASE)
# THE SAME NAME WRAPPED at a line break, the continuation line's comment or quote marker
# skipped, or SPLIT ACROSS A STRING CONCATENATION (`Leg ` + `Waypoint`): a line-by-line read
# misses both, a rename by line missed 28 wrapped sites, and review found the split one.
WRAPPED = re.compile(r"\b(?:leg|paragraph)[ \t]*(?:\n[ \t]*(?:[#/>*]+[ \t]*)?"
                     r"|[\"'`][\s+]*[\"'`][ \t]*)waypoints?\b", re.IGNORECASE)

def hits(text):
    found = [(i, l.strip()) for i, l in enumerate(text.splitlines(), 1) if RETIRED.search(l)]
    for m in WRAPPED.finditer(text):
        n = text.count("\n", 0, m.start()) + 1
        found.append((n, text.splitlines()[n - 1].strip() + " / (wrapped)"))
    return found

# THE FIXTURE PASS RUNS ON EVERY INVOCATION. Cases 1-7 are the retired forms;
# 8-10 are the CONTROLS that stop the deny passing vacuously.
FIXTURES = [
    ("a Leg Waypoint fails", False, "binds one paragraph Move to every Leg Waypoint"),
    ("a Paragraph Waypoints list fails", False, "generates that Leg's Paragraph Waypoints"),
    ("an upper-case form fails", False, "THE PARAGRAPH WAYPOINT IS ONE SEGMENT"),
    ("a hyphenated form fails", False, "the Leg-Waypoint count"),
    ("a form in regex source fails", False, "nums(/\\bParagraph Waypoint (\\d+)\\b/g)"),
    ("a form wrapped at a comment line fails", False, "// binds a Move to every Leg\n// Waypoint in order"),
    ("a form split across a string concatenation fails", False, "renders each Leg `\n      + `Waypoint's Waypoints"),
    ("a bare Waypoint passes", True, "each Waypoint is one Segment of the bound Move"),
    ("a Brief Waypoint passes", True, "one paragraph per Brief Waypoint, in order"),
    ("a snake_case field passes", True, "`paragraph_waypoints` and `leg_waypoint_you_must_plan`"),
]

bad = 0
for label, should_pass, text in FIXTURES:
    if (not hits(text)) != should_pass:
        print("FAIL: fixture case %r did not behave as declared (hits=%r, expected pass=%s)" % (label, hits(text), should_pass))
        bad += 1
if bad:
    sys.exit(1)
print("ok: fixture pass (%d case(s)) — the retired-name predicate discriminates" % len(FIXTURES))
if "--self-test" in sys.argv:
    sys.exit(0)

files = subprocess.run(["git", "ls-files", "src/", "specs/spec-draft-pipeline/SPEC.md", ".claude/skills/"],
                       capture_output=True, text=True, check=True).stdout.split()
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
        print("FAIL: %s:%d names a retired Waypoint name." % (f, n))
        print("      %s" % (l[:160],))
    print()
    print("read: %d of %d file(s)." % (read, len(files)))
    print()
    print("The Brief ends at Legs and carries no Waypoint (kogaki#1775): write \"Waypoint\" for the")
    print("ParagraphPlan's claims and \"Brief Waypoint\" for the Leg-level point it plans over.")
    sys.exit(1)
print("ok: check-retired-waypoint-names — read %d of %d file(s) under src/, the draft-pipeline spec and .claude/skills/; "
      "none names a Leg Waypoint or a Paragraph Waypoint (kogaki#1775)" % (read, len(files)))
PYX
