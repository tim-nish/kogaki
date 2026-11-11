#!/usr/bin/env python3
# Every .mjs file under src/ and checks/ is formatted as `.prettierrc.json`
# says (kogaki#1792). This member runs `prettier --check` and names each file
# that differs. The contract and the mutation evidence are this member's
# admission record in checks/registry.json.
import argparse
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
PRETTIER = pathlib.Path("node_modules") / ".bin" / "prettier"
CONFIG = ".prettierrc.json"
GLOBS = ("src/**/*.mjs", "checks/**/*.mjs")
HOOK = ".claude/hooks/lint-on-edit.py"
RULE_FILE = ".claude/rules/src-lanes.md"
PROBE_FILE = "src/yaml.mjs"
DIFFERS = re.compile(r"^\[warn\] (?P<file>\S.*\.mjs)$")


def fix_line(rel):
    return "FAIL %s is not formatted as %s says; fix it with `npx prettier --write %s`" % (rel, CONFIG, rel)


def differing(tree, paths, env=None):
    """The repository-relative files `prettier --check` reports as differing."""
    ran = subprocess.run([str(tree / PRETTIER), "--check", "--no-color", *paths], cwd=tree,
                         capture_output=True, text=True, env=env)
    files = [m["file"] for m in map(DIFFERS.match, (ran.stdout + ran.stderr).splitlines()) if m]
    if ran.returncode not in (0, 1) or (ran.returncode == 1 and not files):
        sys.exit("format: prettier did not run cleanly:\n" + ran.stdout + ran.stderr)
    return files


def join_two_lines(text):
    """The text with its first two adjacent statement lines joined onto one."""
    lines = text.split("\n")
    for i in range(len(lines) - 1):
        if lines[i].endswith(";") and lines[i + 1].endswith(";") and lines[i + 1].strip():
            return "\n".join(lines[:i] + [lines[i] + " " + lines[i + 1].strip()] + lines[i + 2:])
    sys.exit("format: %s has no two adjacent statement lines to join" % PROBE_FILE)


def fixtures():
    failed = []

    def case(label, ok):
        print(("ok   " if ok else "FAIL ") + label)
        if not ok:
            failed.append(label)

    with tempfile.TemporaryDirectory() as tmp:
        tree = pathlib.Path(tmp)
        for path in (CONFIG, PROBE_FILE, HOOK, "checks/check-format.py", ".dependency-cruiser.cjs", "eslint.config.mjs"):
            (tree / path).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(ROOT / path, tree / path)
        (tree / "node_modules").symlink_to(ROOT / "node_modules")
        case("(c0) a formatted .mjs file passes", differing(tree, [PROBE_FILE]) == [])
        target = tree / PROBE_FILE
        target.write_text(join_two_lines(target.read_text()))
        coloured = dict(os.environ, CI="true", FORCE_COLOR="1")
        case("(c1) a formatted .mjs file with two lines joined fails naming the file",
             differing(tree, [PROBE_FILE], env=coloured) == [PROBE_FILE])
        payload = {"tool_name": "Edit", "tool_input": {"file_path": str(target)}}
        ran = subprocess.run([sys.executable, str(tree / HOOK)], input=json.dumps(payload),
                             capture_output=True, text=True)
        case("(c2) the edit hook returns the file's name and the fixing command",
             ran.returncode == 2 and fix_line(PROBE_FILE) in ran.stderr)
    case("(c3) the rule file names this member as the formatter's command",
         "checks/check-format.py" in (ROOT / RULE_FILE).read_text())
    return failed


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", help="judge one repository-relative .mjs file, with no fixture pass")
    args = parser.parse_args()
    if not (ROOT / PRETTIER).exists():
        sys.exit("format: %s is absent; run `npm ci`" % (ROOT / PRETTIER))
    if args.file:
        found = differing(ROOT, [args.file])
        print("\n".join(fix_line(f) for f in found))
        return 1 if found else 0
    failed = fixtures()
    found = differing(ROOT, list(GLOBS))
    for rel in found:
        print(fix_line(rel))
    if failed or found:
        return 1
    print("format: every .mjs file under src/ and checks/ is formatted as %s says" % CONFIG)
    return 0


if __name__ == "__main__":
    sys.exit(main())
