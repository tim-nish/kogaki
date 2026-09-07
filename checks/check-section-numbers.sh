#!/usr/bin/env bash
# No `src/` file names a spec SECTION NUMBER (kogaki#991).
#
# WHAT THIS CARRIES. `src/SPEC-REFERENCES.md` holds the SPEC-references rule
# once, and its "What a reference never names" states, on measured ground
# rather than as a preference:
#
#   "Neither marker names a section number or a line range, because both
#   renumber. This is measured rather than feared: the line range
#   `src/cite-check.mjs` used to print to the owner had already drifted onto an
#   unrelated bullet, and three of `src/runs.mjs`'s section numbers did not
#   resolve to the content they were cited for."
#
# Nothing asserted it. Two sites named one anyway, both quoting the section's
# heading beside its number, and both were found by two review rounds reading
# ONE diff (PR #989 rounds 1 and 2) rather than by any act that runs on every
# head. That is the named defect: the rule was carried by reading alone.
#
# THE POSITION THIS RESTS ON, quoted at its pin rather than paraphrased:
#
#   "A rule is enforced only at the layer where it can be broken — a
#   prohibition needs a mechanical gate at the tool boundary because prose is
#   advisory to a system whose job is to satisfy instructions."
#
#   consulted: product-lab@4a58f2a3a895ffa358115db2ad38cb95a56b5523 LESSONS.md:209
#
# THE PREDICATE IS OVER THE FORBIDDEN FORM, NEVER OVER REFERENCES. This is the
# distinction that makes the member admissible where its sibling's forward
# direction was declined at birth. `check-names-tables.sh` declines "every name
# the file uses has a row" because a REFERENCE is written in free prose and a
# matcher over prose yields candidates a reader must judge. This check matches
# no reference: it matches a section sign followed by a digit, a closed form
# with no grammar to parse. A hit is a failure, never a candidate.
#
# THERE IS NO EXEMPTION LIST, and the absence is chosen rather than inherited —
# an enumerated prohibition's load-bearing half is what happens to what it does
# not name. Two `src/` sites hold this very pattern as REGEX SOURCE
# (`src/assemble.mjs`'s leak-guard constant and `src/draft.mjs`'s self-test),
# and neither matches, because in regex source the section sign is followed by
# a backslash rather than a digit. A third, `src/assemble.mjs`'s comment naming
# its own specimen, writes it escaped for exactly this reason and says so at the
# site. So the convention that keeps the tree clean is textual and already
# established, and this member adds no blessed-path list that a later site
# could be quietly added to.
#
# WHAT IT READS. Every file `git ls-files src/` reports — not the subset
# carrying the pointer block. Scoping to carriers would leave a non-carrier free
# to name a number, and the rule binds implemented code rather than the files
# that happen to document it. The file count is printed rather than only the
# verdict.
#
# WHAT IT DOES NOT VERIFY, stated rather than left to look covered: that a
# reference names the RIGHT spec, that a named section still exists, that a
# quoted heading is quoted accurately, or that a LINE RANGE is absent — the
# rule's other half. The first three are reads against another repository's
# text and stay with review. The fourth has no closed form: a line range is
# written as bare digits that every other use of a number in these files also
# produces, so a matcher for it would be the candidate-generator this member
# exists by not being. It is declined here at birth rather than left to read
# as covered.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 - "$@" <<'PYX'
import re, subprocess, sys

# The forbidden form: a section sign, optional whitespace, a digit. Written
# from the same source `src/assemble.mjs` already runs in production for the
# owner-facing half of this rule, so the two cannot drift into disagreeing
# about what a section number is.
SECTION_NUMBER = re.compile(r"§\s*\d")

def hits(text):
    return [(i, l.strip()) for i, l in enumerate(text.splitlines(), 1)
            if SECTION_NUMBER.search(l)]

# THE FIXTURE PASS RUNS ON EVERY INVOCATION, not behind a flag. A predicate
# that silently stopped discriminating would otherwise report a clean tree, and
# a clean tree over `src/` is exactly what this member reports when it is
# working. Cases 1 and 2 are the two defects verbatim; 3 is the form the rule
# licenses in their place; 4 and 5 are the CONTROLS that stop the deny passing
# vacuously by refusing everything with a section sign in it.
FIXTURES = [
    ("the kogaki#991 site-1 defect fails", False,
     'propagating SPEC-terrain v36 §15.6.3 — \\"A removed entry point is '
     'DELETED, and leaves no stub\\": the nine refusing stubs are gone'),
    ("the kogaki#991 site-2 defect fails", False,
     '// §15.6.3 — "A removed entry point is DELETED, and leaves no stub"). The stub'),
    ("the licensed named form passes", True,
     '// SPEC-terrain v36 §"A removed entry point is DELETED, and leaves no stub"'),
    ("regex SOURCE for this very pattern passes", True,
     'const SECTION_REFERENCE = /§\\s*\\d/;'),
    ("a spaced section number fails", False,
     "// (SPEC-draft-pipeline § 6.1): the composed input"),
]

bad = 0
for label, should_pass, text in FIXTURES:
    if (not hits(text)) != should_pass:
        print("FAIL: fixture case %r did not behave as declared "
              "(hits=%r, expected pass=%s)" % (label, hits(text), should_pass))
        bad += 1
if bad:
    sys.exit(1)
print("ok: fixture pass (%d case(s)) — the section-number predicate "
      "discriminates" % len(FIXTURES))
if "--self-test" in sys.argv:
    sys.exit(0)

files = subprocess.run(["git", "ls-files", "src/"],
                       capture_output=True, text=True, check=True).stdout.split()
# THE PRINTED COUNT IS READS PERFORMED, NEVER FILES LISTED. A file that could
# not be opened or decoded is skipped, and counting the listing instead would
# report it as read — a number that cannot go DOWN when coverage does is the
# same shape of evidence that let this family's sibling pass over six files it
# appeared to cover. Skipped files are named rather than absorbed.
failures = []
read = 0
skipped = []
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
        print("FAIL: %s:%d names a spec section number." % (f, n))
        print("      %s" % (l[:120],))
    print()
    print("read: %d of %d file(s) under src/." % (read, len(files)))
    print()
    print("A section number renumbers, and a reader cannot check a number that")
    print("has moved. This is measured rather than feared: see the ground in")
    print("src/SPEC-REFERENCES.md's \"What a reference never names\".")
    print()
    print("Repair: DELETE the number and keep the section's quoted heading —")
    print("  SPEC-x v36 §\"The heading, quoted\"")
    print("which is the form the rule licenses. Where the site quotes the")
    print("heading already, the number is redundant and the repair is a")
    print("deletion rather than a rewrite.")
    sys.exit(1)

print("ok: no src/ file names a spec section number — read %d of %d file(s)"
      " under src/." % (read, len(files)))
print("    No exemption list: regex source for this pattern does not match it,")
print("    and a comment naming a specimen escapes it at the site.")
PYX
