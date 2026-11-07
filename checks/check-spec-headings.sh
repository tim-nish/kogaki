#!/usr/bin/env bash
# No numbered heading in a committed spec carries a number another heading in
# the same file already carries (kogaki#1713). The contract, the fixture cases
# and the mutation evidence are this member's admission record in
# checks/registry.json.
#
# Over every `*.md` file `git ls-files specs/` reports, read outside fenced
# blocks: `## N.`, `### N.M`, `#### N.M.K`, a trailing letter (`6.9.1a`) being
# a number of its own. ORDER IS NOT ASSERTED: `specs/SPEC.md` sites §3.1 and
# §3.2 after §6 on purpose. The fixture pass runs on every invocation, so a
# predicate that stopped discriminating cannot report a clean tree.
# Not verified: heading order, nesting, whether a `§N.M` citation resolves,
# or a heading's text.
set -euo pipefail
cd "$(dirname "${0}")/.."

python3 - "$@" <<'PYX'
import re, subprocess, sys

HEADING = re.compile(r"^#{2,6}\s+(\d+(?:\.\d+)*)([a-z])?\.?(?:\s|$)")
FENCE = re.compile(r"^(```|~~~)")


def key(number, suffix):
    parts = [(int(p), "") for p in number.split(".")]
    if suffix:
        parts[-1] = (parts[-1][0], suffix)
    return tuple(parts)


def failures_of(text):
    """`[(line, message)]` over one document's numbered headings."""
    out = []
    seen = {}
    fenced = False
    for n, line in enumerate(text.splitlines(), 1):
        if FENCE.match(line):
            fenced = not fenced
            continue
        if fenced:
            continue
        m = HEADING.match(line)
        if not m:
            continue
        label = m.group(1) + (m.group(2) or "")
        k = key(m.group(1), m.group(2))
        if k in seen:
            out.append((n, "section %s is numbered twice (first at line %d)"
                        % (label, seen[k])))
        seen.setdefault(k, n)
    return out


FIXTURES = [
    ("(c1) a duplicated section number fails naming the second line", False,
     "## 4. The duty\n### 4.3 Location\n### 4.3 Location again\n"),
    ("(c2) a section sited out of order passes; position is not asserted", True,
     "## 5. Binds\n## 6. Out of scope\n## 3.1 A pointer addresses an anchor\n"),
    ("(c3) a numbered heading inside a fenced block is not read", True,
     "## 1. One\n```\n## 1. One, quoted\n```\n## 2. Two\n"),
    ("(c4) a clean numbered document passes", True,
     "## 3. Shape\n### 3.1 What\n### 3.6 Legibility\n## 4. Duty\n## 5. Binds\n"),
    ("(c5) a lettered suffix beside its bare base is a second number", True,
     "### 6.9 Nine\n#### 6.9.1 One\n#### 6.9.1a Entails\n#### 6.9.2 Two\n"),
    ("(c6) an unnumbered heading between numbered ones is not read", True,
     "## 1. One\n## Appendix\n## 2. Two\n"),
]

bad = 0
for label, should_pass, text in FIXTURES:
    got = failures_of(text)
    if (not got) != should_pass:
        print("FAIL: fixture case %r did not behave as declared "
              "(failures=%r, expected pass=%s)" % (label, got, should_pass))
        bad += 1
if bad:
    sys.exit(1)
print("ok: fixture pass (%d case(s)) -- the heading-number predicate "
      "discriminates" % len(FIXTURES))
if "--self-test" in sys.argv:
    sys.exit(0)

files = [f for f in subprocess.run(["git", "ls-files", "specs/"],
                                   capture_output=True, text=True,
                                   check=True).stdout.split()
         if f.endswith(".md")]
# THE PRINTED COUNT IS READS PERFORMED, never files listed: a file that could
# not be opened is named and not counted.
read = 0
skipped = []
failures = []
for f in files:
    try:
        text = open(f, encoding="utf-8").read()
    except (OSError, UnicodeDecodeError) as exc:
        skipped.append((f, exc.__class__.__name__))
        continue
    read += 1
    failures.extend((f, n, msg) for n, msg in failures_of(text))

for f, why in skipped:
    print("skipped: %s (%s) -- NOT read, and not counted as read." % (f, why))

if failures:
    for f, n, msg in failures:
        print("FAIL: %s:%d %s." % (f, n, msg))
    print()
    print("read: %d of %d spec file(s) under specs/." % (read, len(files)))
    print("Repair: give the later heading a number of its own, or retire it")
    print("with its number; a retired number is never reused.")
    sys.exit(1)

print("ok: no spec numbers two headings alike -- read %d of %d spec file(s) "
      "under specs/." % (read, len(files)))
PYX
