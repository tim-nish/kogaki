#!/usr/bin/env bash
# check-system-name-absent — the system's name leaves this repository's tree
# (kogaki#1347, Decision 2026-10-12 D1).
#
# WHAT THIS COVERS. The term lives in exactly one tracked place:
# `.claude/issue-sync.json`'s `lexicon` array (the deny list carries what it
# denies). This member reads the term from that entry, `git grep`s the
# tracked tree for it case-insensitively, drops a match sitting inside a
# quoted Package address — the `coding::` UnitID form, a `<repo>@<sha>` pin,
# or a `consulted:`/`receipt:` line — and drops the lexicon entry's own line,
# then fails naming every remaining file and line. It also asserts the term
# is absent from README.md's first heading, read directly rather than through
# the general scan, because the repository description and topics sit beside
# that heading and are asserted empty by convention, not by this check.
set -u
cd "$(dirname "$0")/.."

python3 - <<'PY'
import json
import re
import subprocess
import sys

LEXICON_FILE = ".claude/issue-sync.json"

# A match sitting inside a quoted Package address is exempt (kogaki#1347):
#   - the `coding::` UnitID form
#   - a `<repo>@<sha>` pin (a bare slug, '@', then a hex-looking token)
#   - a `consulted:`/`receipt:` line naming either
ADDRESS_PATTERNS = (
    re.compile(r"coding::"),
    re.compile(r"\b[\w.-]+@[0-9a-f]{7,}\b"),
    re.compile(r"\b(?:consulted|receipt)\s*:"),
)


def is_hit(path, text):
    """True if (path, text) is a reportable occurrence of the term — not the
    lexicon entry's own file, and not sitting inside a quoted Package address."""
    if path == LEXICON_FILE:
        return False
    return not any(pattern.search(text) for pattern in ADDRESS_PATTERNS)


# ---- the fixture: constructed lines, so the filter's refusal is shown
# rather than believed.
fixture = []
def case(label, cond):
    fixture.append((label, bool(cond)))

case("a bare mention in prose is a hit",
     is_hit("README.md", "Writes articles for the Gukan project."))
case("a coding:: UnitID carrying the term is exempt",
     not is_hit("policy/consultation-map.md",
                 "consulted: product-lab@dec0d568 coding::decision/knowledge-architecture-gukan-d13@ac40902"))
case("a consulted: line naming a pin is exempt",
     not is_hit("policy/consultation-map.md",
                 "consulted: product-lab@dec0d568dd8fc0b2 gukan-boundary"))
case("a receipt: line naming a pin is exempt",
     not is_hit("some/file.md", "receipt: gukan-pkg@0511b22120bd"))
case("a bare <repo>@<sha> pin with no consulted:/receipt: label is exempt",
     not is_hit("some/file.md", "see gukan-pkg@0511b22120bd for the ground"))
case("the lexicon entry's own file is exempt by path, even unaddressed",
     not is_hit(LEXICON_FILE, "    \"Gukan\""))

bad = [label for label, ok in fixture if not ok]
if bad:
    print("FAIL system-name-absent: this member's own fixture failed — " + " | ".join(bad))
    sys.exit(1)

# ---- the live scan over this repository.
with open(LEXICON_FILE, encoding="utf-8") as handle:
    terms = json.load(handle).get("lexicon", [])

if not terms:
    print("FAIL system-name-absent: .claude/issue-sync.json carries no `lexicon` entry to read the term from")
    sys.exit(1)

hits = []
for term in terms:
    out = subprocess.run(
        ["git", "grep", "-I", "-i", "-n", "-F", term],
        capture_output=True, text=True,
    )
    if out.returncode not in (0, 1):
        print("FAIL system-name-absent: git grep errored — " + out.stderr.strip())
        sys.exit(1)
    for raw in out.stdout.splitlines():
        if not raw:
            continue
        path, _, rest = raw.partition(":")
        lineno, _, text = rest.partition(":")
        if is_hit(path, text):
            hits.append((path, lineno, text.strip()))

# README.md's first heading, read directly (the repository description and
# topics sit beside it and are asserted empty by convention, not this check).
with open("README.md", encoding="utf-8") as handle:
    heading = handle.readline().rstrip("\n")
for term in terms:
    if term.lower() in heading.lower():
        hits.append(("README.md", "1", heading.strip()))

if hits:
    print("FAIL system-name-absent (kogaki#1347): the system's name is in the tracked tree outside a quoted Package address.")
    for path, lineno, text in hits:
        print(f"  {path}:{lineno}: {text[:120]}")
    sys.exit(1)

print("ok: the system's name is absent from the tracked tree outside a quoted Package address and the lexicon entry")
print(f"  terms: {', '.join(terms)}")
print(f"  fixture: {len(fixture)}/{len(fixture)} constructed cases — " + "; ".join(label for label, _ in fixture))
PY
