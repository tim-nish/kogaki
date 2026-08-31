#!/usr/bin/env bash
# The observation register's FORM (specs/SPEC.md §21, kogaki#624).
#
# WHAT THIS GATES, AND WHAT IT REFUSES TO GATE. §21 splits the register two
# ways: FORM is mechanical and TRUTH is human. This check asserts that every
# record HAS a status drawn from the enumerated set, an issued id matching its
# own filename, and an identity unique across the directory. It never asks
# whether `promoted` was the RIGHT call for a given observation — that is the
# judgment §21 assigns to a human, and a check that graded it would be a lint
# over judgment.
#
# WHY THE TRANSITION SET IS READ FROM THE SPEC AND NOT WRITTEN HERE. A copy of
# the set in this file would be a conformance copy with no declared precedence:
# the spec could gain a state and this check would keep refusing it, or lose
# one and this check would keep admitting it, and either divergence is silent.
# So the set is PARSED from §21's own enumeration block, and a spec whose block
# cannot be parsed fails here rather than falling back to a built-in list —
# an absent set read as "allow everything" is the non-member-fallback defect
# this suite refuses elsewhere.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"

python3 - "$@" <<'PY'
import pathlib, re, sys

SPEC = pathlib.Path("specs/SPEC.md")
DIR = pathlib.Path("reviews/register")
ID_RE = re.compile(r'^reg-\d{4}$')

def transition_set(spec_text):
    """The states §21 enumerates, read from the spec rather than copied here."""
    # TERMINATED ON A STRUCTURAL MARKER, NEVER ON A SENTENCE. An earlier form
    # ended the match at the literal prose "`pending` is the birth state",
    # which bound the whole suite to one sentence's wording: rewording it in an
    # otherwise valid §21 would have turned every run red with "transition set
    # is unreadable". The block ends at the first blank line after the
    # indented rows, or at the next heading — both are structure the block
    # itself has, rather than prose someone may edit.
    m = re.search(r'^## 21\..*?^### The transition set[^\n]*\n+((?:[ \t]+\S[^\n]*\n|\s*\n)+?)(?=\S|^###)',
                  spec_text, re.S | re.M)
    if not m:
        return None
    states = set()
    for line in m.group(1).splitlines():
        hit = re.match(r'\s{2,}(\w+)\s+→\s+(\w+)\s', line)
        if hit:
            states.add(hit.group(1)); states.add(hit.group(2))
    return states or None


def check(spec_text, records):
    """records: list of (name, text). Returns a list of failure strings."""
    failures = []
    states = transition_set(spec_text)
    if states is None:
        return ["FAIL specs/SPEC.md §21 transition set is unreadable — the "
                "state set is parsed from the spec and never defaulted here, "
                "so an unparseable block fails rather than admitting anything"]
    seen = {}
    for name, text in sorted(records):
        if not text.startswith("---\n"):
            failures.append(f"FAIL no frontmatter: reviews/register/{name}")
            continue
        fm = text.split("---\n", 2)[1]
        fields = dict(
            (k.strip(), v.strip())
            for k, _, v in (l.partition(":") for l in fm.splitlines() if ":" in l))

        rid = fields.get("id", "")
        if not ID_RE.match(rid):
            failures.append(f"FAIL malformed issued id {rid!r}: reviews/register/{name} "
                            f"— §21 issues `reg-NNNN`, never a borrowed identity")
        elif not name.startswith(rid + "-"):
            failures.append(f"FAIL id/filename disagree: reviews/register/{name} carries id {rid}")
        elif rid in seen:
            failures.append(f"FAIL duplicate identity {rid}: reviews/register/{name} "
                            f"and {seen[rid]} — an id that names two records identifies neither")
        else:
            seen[rid] = name

        st = fields.get("status", "")
        if st not in states:
            failures.append(f"FAIL status {st!r} outside the enumerated set "
                            f"({', '.join(sorted(states))}): reviews/register/{name}")
        if "source_comment" not in fields:
            failures.append(f"FAIL no source_comment field: reviews/register/{name} "
                            f"— provenance is a field, and its absence is not a blank identity")
    return failures


# ---- SELF-TEST: both directions, every invocation ----------------------------
# The suite's admission bar asks a check to discriminate, not merely to pass on
# the live tree. A conforming fixture must PASS and each malformation must FAIL,
# because a check that only ever sees good input is indistinguishable from one
# whose predicate is `True`.
SPEC_FIXTURE = """## 21. x

### The transition set, enumerated

    pending  →  promoted    x
    pending  →  dismissed   x

`pending` is the birth state
"""
GOOD = "---\nid: reg-0001\nstatus: pending\nsource_comment: 1\n---\nbody\n"
cases = [
    ("conforming", SPEC_FIXTURE, [("reg-0001-x.md", GOOD)], 0),
    ("bad status", SPEC_FIXTURE, [("reg-0001-x.md", GOOD.replace("pending", "invented"))], 1),
    ("identity taken from the foreign namespace", SPEC_FIXTURE, [("5223831374-x.md", GOOD.replace("reg-0001", "5223831374"))], 1),
    ("id/filename disagree", SPEC_FIXTURE, [("reg-0002-x.md", GOOD)], 1),
    ("duplicate identity", SPEC_FIXTURE,
     [("reg-0001-x.md", GOOD), ("reg-0001-y.md", GOOD)], 1),
    ("no frontmatter", SPEC_FIXTURE, [("reg-0001-x.md", "body only\n")], 1),
    ("no provenance", SPEC_FIXTURE,
     [("reg-0001-x.md", GOOD.replace("source_comment: 1\n", ""))], 1),
    ("unparseable spec", "## 21. x\n\nno enumeration here\n", [("reg-0001-x.md", GOOD)], 1),
]
for label, spec, recs, want in cases:
    got = len(check(spec, recs))
    if (got > 0) != (want > 0):
        print(f"FAIL fixture {label!r}: wanted {'failure' if want else 'pass'}, "
              f"got {got} failure(s)")
        sys.exit(1)
print(f"ok: fixture pass ({len(cases)} case(s)) — form, identity and the "
      f"spec-read state set discriminate in both directions")

# ---- the live tree ----------------------------------------------------------
if not DIR.is_dir():
    print("ok: no reviews/register/ — this repository carries no observation "
          "register, which §21 permits and is not an absence to repair")
    sys.exit(0)

records = [(p.name, p.read_text(encoding="utf-8"))
           for p in DIR.iterdir() if p.is_file() and p.suffix == ".md"]
failures = check(SPEC.read_text(encoding="utf-8"), records)
for line in failures:
    print(line)
if failures:
    sys.exit(1)

states = transition_set(SPEC.read_text(encoding="utf-8"))
from collections import Counter
tally = Counter(
    dict((k.strip(), v.strip()) for k, _, v in
         (l.partition(":") for l in t.split("---\n", 2)[1].splitlines() if ":" in l)
         ).get("status", "")
    for _, t in records)
print(f"ok: {len(records)} observation record(s), every id issued and unique, "
      f"every status within the set §21 enumerates ({', '.join(sorted(states))}); "
      f"tally " + ", ".join(f"{k}={v}" for k, v in sorted(tally.items()))
      + " — TRUTH is never gated here, only form")
PY
