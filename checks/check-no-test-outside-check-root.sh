#!/usr/bin/env bash
# check-no-test-outside-check-root — no Test lives outside the Check root
# (kogaki#1238, owner decision 2026-10-01).
#
# WHAT THIS COVERS. `.claude/checks.json` declares `checks/` as the one place
# this repository's Tests live. Until kogaki#1238 ten runtime and tool files
# under `src/` and `tools/` carried their own: a `--self-test` flag or a
# `self-test` subcommand, a `runSelfTest`/`selfTest`/`self_test` function and
# the fixture library it drove. Five were reached by nothing after kogaki#1194
# and were deleted; five were reached by a registered member and their cases
# moved under `checks/` as case files. This member keeps the tree there: it
# scans every file under the roots for the four shapes a Test outside the
# Check root takes and fails naming each file and line.
#   (a) a `--self-test` flag;
#   (b) a `self-test` subcommand dispatch, the quoted token;
#   (c) a `runSelfTest`, `selfTest` or `self_test` function, defined or called;
#   (d) a fixture-pass header — a comment line opening with "the fixture pass",
#       the marker every one of the ten carried above its case library.
# Prose that merely mentions a fixture pass mid-sentence does not match (d),
# and nothing under `checks/` is read: an inline fixture inside a member is
# under the Check root by construction.
#
# THE ROOTS AND THE EXCLUDED ROOT ARE STATED ON EVERY RUN. The roots are
# `src/` and `tools/`. `policy/kit/` is the vendored client kit (kogaki#1120);
# its own self-tests are governed where the kit is authored and this member
# does not read them. The denominator — how many files the scan read — is
# printed so a narrowed read cannot look like a clean one.
#
# WHY THE REASON IS PRACTICAL. A worker runs only the checks it finds listed
# under the Check root, so a Test anywhere else is one nobody is allowed to
# run — kogaki#1237's worker was refused twice on exactly that.
set -u
cd "$(dirname "$0")/.."

python3 - <<'PY'
import os
import re
import sys
import tempfile

ROOTS = ("src", "tools")
EXCLUDED = ("policy/kit", "the vendored client kit (kogaki#1120), outside the roots by construction; its self-tests are governed where the kit is authored")
# Each shape: a name for the report and the line pattern that detects it.
SHAPES = (
    ("a --self-test flag", re.compile(r"--self-test\b")),
    ("a self-test subcommand dispatch", re.compile(r"""["']self-test["']""")),
    ("a self-test function", re.compile(r"\b(?:runSelfTest|selfTest|self_test)\s*\(|\bdef\s+self_test\b")),
    ("a fixture-pass header", re.compile(r"^\s*(?://|#|/\*)\s*-*\s*[Tt]he fixture pass\b")),
)


def scan(base, roots=ROOTS):
    """(hits, files_read). A hit is (relative path, line number, shape name,
    the line). Binary files are skipped; everything else under the roots is
    read, whatever its extension, because a Test is not confined to one."""
    hits, files = [], 0
    for root in roots:
        top = os.path.join(base, root)
        if not os.path.isdir(top):
            continue
        for dirpath, dirnames, filenames in os.walk(top):
            dirnames.sort()
            for name in sorted(filenames):
                path = os.path.join(dirpath, name)
                try:
                    with open(path, encoding="utf-8") as handle:
                        text = handle.read()
                except (UnicodeDecodeError, OSError):
                    continue
                files += 1
                rel = os.path.relpath(path, base)
                for number, line in enumerate(text.split("\n"), 1):
                    for shape, pattern in SHAPES:
                        if pattern.search(line):
                            hits.append((rel, number, shape, line.strip()))
    return hits, files


# ---- the fixture pass: constructed trees, so the scan's refusal is shown
# rather than believed. Every case builds its own tree under a temp dir.
def plant(base, rel, text):
    path = os.path.join(base, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(text)


fixture = []
def case(label, cond):
    fixture.append((label, bool(cond)))

with tempfile.TemporaryDirectory() as tmp:
    plant(tmp, "src/x.mjs", 'const argv = process.argv.slice(2);\nif (argv.includes("--self-test")) run();\n')
    hits, _ = scan(tmp)
    case("a planted --self-test flag under src/ fails the scan, naming the file",
         [h[0] for h in hits] == ["src/x.mjs"] and hits[0][2] == "a --self-test flag")
with tempfile.TemporaryDirectory() as tmp:
    plant(tmp, "tools/y.py", 'import sys\nif sys.argv[1:] and sys.argv[1] == "self-test":\n    pass\n')
    hits, _ = scan(tmp)
    case("a planted self-test subcommand under tools/ fails the scan, naming the file",
         [h[0] for h in hits] == ["tools/y.py"] and hits[0][2] == "a self-test subcommand dispatch")
with tempfile.TemporaryDirectory() as tmp:
    plant(tmp, "tools/z.sh", '#!/bin/sh\n# --- the fixture pass (AC7) ---\n_FX = []\n')
    plant(tmp, "src/w.mjs", 'async function runSelfTest() {}\n')
    hits, _ = scan(tmp)
    case("a fixture-pass header and a self-test function each fail the scan on their own line",
         sorted((h[0], h[2]) for h in hits) == [("src/w.mjs", "a self-test function"), ("tools/z.sh", "a fixture-pass header")])
with tempfile.TemporaryDirectory() as tmp:
    plant(tmp, "src/ok.mjs", '// Brief parsing — pure over the document text, exported for the fixture pass.\nexport function parse() {}\n')
    plant(tmp, "policy/kit/bin/q.mjs", 'if (process.argv.includes("--self-test")) selfTest();\n')
    plant(tmp, "checks/check-inline.sh", 'if [ "$1" = "--self-test" ]; then exit 0; fi\n')
    hits, files = scan(tmp)
    # The exclusion is BY CONSTRUCTION — the walk never enters a path outside
    # the roots — so what this case can show is exactly that: the kit file and
    # the inline fixture under checks/ are never read (one file scanned), and
    # a mid-sentence mention of a fixture pass under src/ is not a hit.
    case("prose mentioning a fixture pass under src/ is not a hit, and files outside the roots (the vendored kit, checks/) are never read: one file scanned, no hit",
         hits == [] and files == 1)

bad = [label for label, ok in fixture if not ok]
if bad:
    print("FAIL no-test-outside-check-root: this member's own fixture failed — " + " | ".join(bad))
    sys.exit(1)

# ---- the live scan over this repository.
hits, files = scan(".")
if hits:
    print("FAIL no-test-outside-check-root (kogaki#1238): a Test lives outside the Check root `checks/`.")
    print("  Bring its cases under checks/ as a case file run by a registered member, or delete it; nothing is left in place for observation.")
    for rel, number, shape, line in hits:
        print(f"  {rel}:{number} carries {shape}: {line[:100]}")
    print(f"  roots: {', '.join(r + '/' for r in ROOTS)}; excluded: {EXCLUDED[0]}/ — {EXCLUDED[1]}; {files} file(s) scanned")
    sys.exit(1)

print("ok: no Test outside the Check root (kogaki#1238)")
print(f"  roots: {', '.join(r + '/' for r in ROOTS)}")
print(f"  excluded: {EXCLUDED[0]}/ — {EXCLUDED[1]}")
print(f"  denominator: {files} file(s) scanned under the roots, {len(SHAPES)} shapes per line")
print(f"  fixture: {len(fixture)}/{len(fixture)} constructed trees — " + "; ".join(label for label, _ in fixture))
PY
