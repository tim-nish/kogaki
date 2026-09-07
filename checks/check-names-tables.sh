#!/usr/bin/env bash
# Every `src/` names table names what its own file names (kogaki#987).
#
# WHAT THIS CARRIES. `src/SPEC-REFERENCES.md` holds the SPEC-references rule
# once, and every `src/` file under it carries a `THE NAMES THIS FILE USES`
# table listing the spec names that file uses. Nothing asserted that a listed
# name is actually used. PR #984 wrote twenty-four such tables from a read of
# `governing`/`governing_text` alone; the tables that resulted named a name
# no file uses (`src/deps-registry.json`'s "The enumeration and its non-member
# fallback", raised at round 1 and untouched by the fix) and dropped two names
# two files do use. The narrowing was introduced WHILE repairing a narrowing,
# at round 2 of 2, with no round left to catch it.
#
# THE PREDICATE IS THE INVERSE OF THE USUAL STALENESS CHECK, and that direction
# is the whole design. "Does every reference appear in the table?" cannot see a
# surplus row; only "does every row name a source?" can. The served position
# this rests on:
#
#   "A derived view maintained by editing its previous rendering is not a view
#   but a mirror, and a mirror accumulates — so bind the regeneration contract
#   to the DERIVATION (start from the sources, never read the prior rendering,
#   emit only what a source generates) rather than to the file's freshness,
#   because freshness is satisfiable by edit-forward while derivation is not;
#   and pair it with the inverse of the usual staleness check, since 'does
#   every pending item appear?' cannot see surplus and only 'does every line
#   name a source?' can."
#
#   consulted: product-lab@aecb3b52ea46b357a7e7c39b81b1a26c0deeff0e LESSONS.md:191
#
# THE FORWARD DIRECTION IS DECLINED AT BIRTH, stated rather than left looking
# covered. "Every name the file uses has a row" is not mechanically decidable
# here: a reference is written in free prose — `[see: SPEC-x "Name"]`,
# `(SPEC-x, the name; kogaki#N)`, `SPEC-x §"Name"` — so a matcher over it
# produces candidates a reader must judge, not failures. The exhaustive read
# in that direction was done BY HAND for kogaki#987 over every line of all
# twenty-five carriers, and the record of what was read is in that PR. This
# check holds the half that is a tree fact.
#
# WHAT IT READS, PRINTED IN ITS OWN OUTPUT. Every `src/` file carrying the
# pointer block; within each, the region from `THE NAMES THIS FILE USES` to
# the first blank comment/entry line; within that region, every row at the
# name indent. Each row's name must occur SOMEWHERE ELSE in the same file. The
# search is over the WHOLE file outside the table — not one field set — which
# is the property whose absence this check exists for.
#
# A FILE WITH NO TABLE IS NOT A FAILURE HERE. `src/render-figure.mjs` carries
# the pointer block and no table because it states at the site that no string
# in it names a spec at all. Zero rows satisfy the predicate vacuously, and the
# count is printed rather than passing silently.
#
# THE HOST SYNTAX IS STRIPPED, NEVER PARSED. A row reaches this check as
# `// <name>`, `"  <name>",` or a bare markdown line depending on its host;
# the leading comment marker, JSON quoting and trailing comma come off and the
# rest is compared as text. That is why one predicate covers six host syntaxes
# without a per-syntax branch — the difference the pointer block's two textual
# variants introduced is exactly the kind this normalisation absorbs.
#
# AND THE FILE IS NORMALISED THE SAME WAY BEFORE THE SEARCH, which is what
# makes the search cover the WHOLE file rather than the lines that happen to
# hold a name unbroken. A name in the body is routinely wrapped across a
# comment or JSON line break, so the file is joined into one string with
# comment markers, JSON string escapes and line breaks collapsed to single
# spaces, and the name is matched case-insensitively against it. Matching line
# by line reported nine wrapped names as phantoms on the first run — a false
# red, and the fastest way to get a check disabled.
#
# WHAT IT DOES NOT VERIFY, stated rather than left to look covered: that a
# row's spec label is the right spec, that the spec section still exists, or
# that a name the file uses is missing a row. The first two are reads against
# another repository's text and the third is the undecidable direction above;
# all three stay with review.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 - "$@" <<'PYX'
import re, subprocess, sys, unicodedata

files = subprocess.run(
    ["git", "grep", "-l", "SPEC REFERENCES IN THIS FILE", "--", "src/"],
    capture_output=True, text=True, check=False).stdout.split()
files = [f for f in files if f != "src/SPEC-REFERENCES.md"]

ROW_MARKER = "THE NAMES THIS FILE USES"


def strip_host(line):
    """Remove the host's comment marker / JSON quoting, keeping the indent."""
    s = re.sub(r"^(\s*)//\s?", r"\1", line)           # .mjs comment
    s = re.sub(r'^(\s*)"', r"\1", s)                  # JSON open quote
    s = re.sub(r'",?\s*$', "", s)                     # JSON close quote
    return s


def normalise(text):
    """One whitespace-collapsed, case-folded string per file."""
    # A JSON note array wraps a sentence across elements as `...",\n  "...`,
    # so the elements are rejoined before anything else; without this a name
    # broken across two array entries reads as absent.
    t = re.sub(r'",\s*\n\s*"', " ", text)
    t = t.replace("\\n", " ").replace('\\"', '"')
    t = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), t)
    t = re.sub(r"^\s*//\s?", " ", t, flags=re.M)
    t = t.replace("\n", " ")
    t = unicodedata.normalize("NFC", t)
    return re.sub(r"\s+", " ", t).casefold()


def phantom_rows(raw):
    """(rows counted, names the file names only in their own table row)."""
    lines = raw.split("\n")
    start = next((i for i, l in enumerate(lines) if ROW_MARKER in l), None)
    if start is None:
        return 0, []

    # The region first, then the name column INSIDE it. The two-step matters:
    # a JSON row arrives with the file's own array indent in front of the
    # table's, so an absolute indent test reads every JSON name row as a spec
    # row and the table contributes nothing — a check that passes over the
    # very files the defect was found in. The name column is therefore the
    # SHALLOWEST indent the region holds, computed per file.
    region, name_rows = [], []
    for i in range(start + 1, len(lines)):
        s = strip_host(lines[i])
        if not s.strip():
            break
        if re.match(r"^\s*(?:[\]}]|-->)", s):  # the JSON array or HTML comment
            break                              # this note closes
        region.append(s)
        name_rows.append(i)
    span = len(region)
    base = min((len(s) - len(s.lstrip(" ")) for s in region), default=0)
    keep = {i for s, i in zip(region, name_rows)
            if len(s) - len(s.lstrip(" ")) != base}
    names = [s.strip() for s in region if len(s) - len(s.lstrip(" ")) == base]

    # The haystack is the whole file with the table's NAME COLUMN removed, so
    # a row can never satisfy itself. The spec column stays in: one row's spec
    # text naming another row's name is a real use of that name, and dropping
    # the whole region would have reported it as a phantom.
    body = "\n".join(
        l for i, l in enumerate(lines)
        if i != start and (i not in range(start + 1, start + 1 + span) or i in keep))
    hay = normalise(body)

    phantoms = []
    for name in names:
        needle = normalise(name)
        # A leading article is the file's sentence, not the name: a body that
        # writes "its frontmatter trace" uses the name the table lists as "the
        # frontmatter trace". Stripping it on both sides costs no real case —
        # a phantom name is absent article and all.
        bare = re.sub(r"^(?:the|a|an) ", "", needle)
        if needle not in hay and bare not in hay:
            phantoms.append(name)
    return len(names), phantoms


# THE FIXTURE PASS. Every case is a whole synthetic carrier, so a case
# exercises the region parser and the search together rather than a helper in
# isolation — which is the arrangement that would have caught the red-blind
# first draft this member's admission record describes.
FIXTURES = [
    ("the PR #984 phantom fails", False, """{
  "note": [
    "but cannot install [see: SPEC-external-deps \\"The enumeration and its",
    "home\\"] (kogaki#55).",
    "",
    "SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982).",
    "",
    "THE NAMES THIS FILE USES, and the spec each one names:",
    "  The enumeration and its non-member fallback",
    "      SPEC-external-deps"
  ]
}
"""),
    ("the corrected row passes", True, """{
  "note": [
    "but cannot install [see: SPEC-external-deps \\"The enumeration and its",
    "home\\"] (kogaki#55).",
    "",
    "THE NAMES THIS FILE USES, and the spec each one names:",
    "  The enumeration and its home",
    "      SPEC-external-deps"
  ]
}
"""),
    ("a JSON table is read at all", False, """{
  "note": [
    "THE NAMES THIS FILE USES, and the spec each one names:",
    "  a name this file never uses",
    "      SPEC-terrain"
  ]
}
"""),
    ("an mjs table is read at all", False, """// THE NAMES THIS FILE USES, and the spec each one names:
//   a name this file never uses
//       SPEC-terrain
//
const x = 1;
"""),
    ("a name wrapped across lines is not a phantom", True, """// [implemented-against: specs/SPEC.md "Human-facing files live where the human
// works", copied 2026-09-06]
// THE NAMES THIS FILE USES, and the spec each one names:
//   Human-facing files live where the human works
//       specs/SPEC.md
//
"""),
    ("a leading article is the sentence, not the name", True, """// reads its frontmatter trace, which carries the record half
// THE NAMES THIS FILE USES, and the spec each one names:
//   the frontmatter trace
//       SPEC-draft-command
//
"""),
    ("one row's spec column may name another row's name", True, """// [see: SPEC-draft-pipeline "Every MUST is judgment"]
// The agent applies the five review areas as judgment, per Candidate.
// THE NAMES THIS FILE USES, and the spec each one names:
//   the judgment rule
//       SPEC-draft-pipeline "Every MUST is judgment"
//   the five review areas
//       SPEC-draft-pipeline "The grounds test", and the judgment rule
//
"""),
    ("no table at all is a vacuous pass, not a failure", True, """// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982).
// No owner-facing string below names a spec at all.
"""),
]

# The fixture pass runs on EVERY invocation, not behind a flag. A predicate
# that silently stopped discriminating would otherwise report a clean tree,
# and a clean tree is exactly what this member's first draft reported while
# reading none of the six JSON tables.
bad = 0
for label, should_pass, text in FIXTURES:
    _, phantoms = phantom_rows(text)
    if (not phantoms) != should_pass:
        print("FAIL: fixture case %r did not behave as declared "
              "(phantoms=%r, expected pass=%s)" % (label, phantoms, should_pass))
        bad += 1
if bad:
    sys.exit(1)
print("ok: fixture pass (%d case(s)) — the phantom predicate discriminates "
      "across both host syntaxes" % len(FIXTURES))
if "--self-test" in sys.argv:
    sys.exit(0)

rows_read = 0
failures = []

for f in files:
    n, phantoms = phantom_rows(open(f, encoding="utf-8").read())
    rows_read += n
    failures.extend((f, name) for name in phantoms)

if failures:
    for f, name in failures:
        print('FAIL: %s names "%s" in its table and nowhere else in the file.' % (f, name))
    print()
    print("read: %d file(s) carrying the pointer block, %d table row(s), each" % (len(files), rows_read))
    print("      searched over the WHOLE file outside the table, wrapping collapsed.")
    print()
    print("A row naming nothing in its own file is a table derived from an input")
    print("narrower than the file's reference surface, or a name that moved and")
    print("took the row's referent with it (kogaki#987, carrying kogaki#982).")
    print()
    print("Repair, whichever is true:")
    print("  - the file uses a DIFFERENT wording -> correct the row to the wording")
    print("    the file uses; the table records this file's names, not the spec's;")
    print("  - the file no longer uses the name -> delete the row.")
    print()
    print("The rule the tables are written under is src/SPEC-REFERENCES.md.")
    sys.exit(1)

print("ok: every src/ names table names what its file names — read %d file(s)" % len(files))
print("    carrying the pointer block and %d table row(s), each searched over" % rows_read)
print("    the whole file outside the table, wrapping collapsed.")
PYX
