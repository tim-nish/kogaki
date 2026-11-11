#!/usr/bin/env python3
# No TypeScript checkJs finding under src/ exceeds its file's count in the
# baseline, and the baseline holds no count the tree no longer reaches
# (kogaki#1791). The rule set is `jsconfig.json`; this member runs it. The
# contract and the mutation evidence are this member's admission record in
# checks/registry.json. The fixture pass runs on every invocation.
import argparse
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
TSC = pathlib.Path("node_modules") / ".bin" / "tsc"
CONFIG = "jsconfig.json"
BASELINE = "tsc-baseline.json"
HOOK = ".claude/hooks/lint-on-edit.py"
RULE_FILE = ".claude/rules/src-lanes.md"
BUILD_INFO = ".local/tsc/jsconfig.tsbuildinfo"
FINDING = re.compile(r"^(?P<file>[^\s(][^(]*)\(\d+,\d+\): error (?P<code>TS\d+): (?P<msg>.*)$")
PROBE = "const kogakiTypeProbe = (1).nothing;\n"
PROBE_FILE = "src/yaml.mjs"


def tsc(tree, incremental=False):
    args = [str(tree / TSC), "-p", CONFIG, "--pretty", "false"]
    if incremental:
        args += ["--incremental", "--tsBuildInfoFile", BUILD_INFO]
    ran = subprocess.run(args, cwd=tree, capture_output=True, text=True)
    counts, first = {}, {}
    for line in ran.stdout.splitlines():
        m = FINDING.match(line)
        if not m:
            continue
        key = (m["file"], m["code"])
        counts[key] = counts.get(key, 0) + 1
        first.setdefault(key, line)
    if ran.returncode != 0 and not counts:
        sys.exit("types: tsc did not run cleanly:\n" + ran.stdout + ran.stderr)
    return counts, first


def judge(counts, first, baseline, only=None):
    """One line per count above its baseline row and per row above its count."""
    allowed = {(f, c): n for f, codes in baseline.items() for c, n in codes.items()}
    lines = []
    for key in sorted(set(counts) | set(allowed)):
        if only is not None and key[0] != only:
            continue
        have, may = counts.get(key, 0), allowed.get(key, 0)
        if have > may:
            lines.append("FAIL %s %s: %d finding(s) where the baseline allows %d; first: %s"
                         % (key[0], key[1], have, may, first[key]))
        elif have < may:
            lines.append("FAIL %s %s: the baseline row reads %d and the tree reaches %d; lower the row in %s"
                         % (key[0], key[1], may, have, BASELINE))
    return lines


def bench(tree):
    for path in ("src", CONFIG, BASELINE, HOOK, "checks/check-types.py",
                 ".dependency-cruiser.cjs", "eslint.config.mjs",
                 "eslint-suppressions.json",
                 ".dependency-cruiser-known-violations.json",
                 "package.json"):
        src, dst = ROOT / path, tree / path
        dst.parent.mkdir(parents=True, exist_ok=True)
        (shutil.copytree if src.is_dir() else shutil.copy)(src, dst)
    (tree / "node_modules").symlink_to(ROOT / "node_modules")


def fixtures(baseline, counts, first):
    failed = []

    def case(label, ok):
        print(("ok   " if ok else "FAIL ") + label)
        if not ok:
            failed.append(label)

    with tempfile.TemporaryDirectory() as tmp:
        tree = pathlib.Path(tmp)
        bench(tree)
        target = tree / PROBE_FILE
        target.write_text(target.read_text() + PROBE)
        bad_counts, bad_first = tsc(tree)
        found = judge(bad_counts, bad_first, baseline)
        case("(c1) a property read a value does not carry, added under src/, fails naming file, code and message",
             len(found) == 1 and PROBE_FILE in found[0] and "TS2339" in found[0]
             and "nothing" in found[0])

        payload = {"tool_name": "Edit",
                   "tool_input": {"file_path": str(target)}}
        ran = subprocess.run([sys.executable, str(tree / HOOK)],
                             input=json.dumps(payload), capture_output=True,
                             text=True)
        case("(c2) the edit hook returns the finding for an edited src/ file",
             ran.returncode == 2 and "TS2339" in ran.stderr
             and PROBE_FILE in ran.stderr)

    (path, code), n = next(iter(sorted(counts.items())))
    raised = json.loads(json.dumps(baseline))
    raised[path][code] = n + 1
    found = judge(counts, first, raised)
    case("(c3) a baseline count raised above what the tree reaches fails naming the row",
         found == ["FAIL %s %s: the baseline row reads %d and the tree reaches %d; lower the row in %s"
                   % (path, code, n + 1, n, BASELINE)])

    ghost = dict(baseline, **{"src/no-such-file.mjs": {"TS2339": 1}})
    found = judge(counts, first, ghost)
    case("(c4) a baseline row naming a file tsc does not reach fails naming it",
         len(found) == 1 and "src/no-such-file.mjs TS2339" in found[0])

    case("(c5) the rule file names this member as the type check's command",
         "checks/check-types.py" in (ROOT / RULE_FILE).read_text())
    return failed


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", help="judge one repository-relative file, incrementally, with no fixture pass")
    args = parser.parse_args()
    if not (ROOT / TSC).exists():
        sys.exit("types: %s is absent; run `npm ci`" % (ROOT / TSC))
    baseline = json.loads((ROOT / BASELINE).read_text())
    if args.file:
        (ROOT / BUILD_INFO).parent.mkdir(parents=True, exist_ok=True)
        found = judge(*tsc(ROOT, incremental=True), baseline, only=args.file)
        print("\n".join(found))
        return 1 if found else 0
    counts, first = tsc(ROOT)
    failed = fixtures(baseline, counts, first)
    found = judge(counts, first, baseline)
    for line in found:
        print(line)
    if failed or found:
        return 1
    print("types: %d finding(s) over %d file(s) in the baseline, no new finding"
          % (sum(counts.values()), len(baseline)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
