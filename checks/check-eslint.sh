#!/usr/bin/env bash
# No JavaScript finding under src/ or checks/ falls outside the suppressions
# baseline, and the baseline holds no row whose finding is gone (kogaki#1747).
# The rule set is `eslint.config.mjs`; this member runs it. The contract and
# the mutation evidence are this member's admission record in
# checks/registry.json.
#
# One `eslint --max-warnings 0 src checks` with `eslint-suppressions.json`:
# ESLint names file, line and rule for a finding outside it and refuses a
# suppression whose finding is gone in a linted file. A suppression row naming
# a file ESLint did not lint is refused here. The fixture pass runs on every
# invocation.
set -euo pipefail
cd "$(dirname "${0}")/.."

python3 - "$@" <<'PYX'
import json, pathlib, shutil, subprocess, sys, tempfile

ROOT = pathlib.Path.cwd()
ESLINT = ROOT / "node_modules" / ".bin" / "eslint"
CONFIG = "eslint.config.mjs"
SUPPRESSIONS = "eslint-suppressions.json"
HOOK = ".claude/hooks/lint-on-edit.py"
RULE_FILE = ".claude/rules/src-lanes.md"
UNDECLARED = "export const kogakiProbe = kogakiUndeclaredName;\n"


def lint(tree, paths, suppressions=SUPPRESSIONS):
    return subprocess.run(
        [str(ESLINT), "--max-warnings", "0", "--suppressions-location",
         suppressions, *paths], cwd=tree, capture_output=True, text=True)


def ghost_rows(tree, suppressions):
    """Suppression rows naming a file that is not under src/ or checks/."""
    return sorted(key for key in suppressions
                  if not key.startswith(("src/", "checks/"))
                  or not (tree / key).is_file())


def bench(tree):
    for path in ("src", "checks", CONFIG, SUPPRESSIONS, HOOK,
                 ".dependency-cruiser.cjs",
                 ".dependency-cruiser-known-violations.json"):
        src, dst = ROOT / path, tree / path
        dst.parent.mkdir(parents=True, exist_ok=True)
        (shutil.copytree if src.is_dir() else shutil.copy)(src, dst)
    (tree / "node_modules").symlink_to(ROOT / "node_modules")


def hook(tree, rel):
    payload = {"tool_name": "Edit",
               "tool_input": {"file_path": str(tree / rel)}}
    return subprocess.run([sys.executable, str(tree / HOOK)],
                          input=json.dumps(payload), capture_output=True,
                          text=True)


if not ESLINT.exists():
    sys.exit("eslint: %s is absent; run `npm ci`" % ESLINT)

baseline = json.loads((ROOT / SUPPRESSIONS).read_text())
failed = []


def case(label, ok):
    print(("ok   " if ok else "FAIL ") + label)
    if not ok:
        failed.append(label)


with tempfile.TemporaryDirectory() as tmp:
    tree = pathlib.Path(tmp)
    bench(tree)
    rel = "src/brief/run-state.mjs"
    target = tree / rel
    clean = target.read_text()
    target.write_text(clean + UNDECLARED)
    line = len(clean.splitlines()) + 1

    ran = lint(tree, [rel])
    case("(c1) a reference to an undeclared identifier under src/ fails naming file, line and rule",
         ran.returncode == 1 and rel in ran.stdout
         and ("%d:" % line) in ran.stdout and "no-undef" in ran.stdout)

    ran = hook(tree, rel)
    case("(c2) the edit hook returns the finding for an edited src/ file",
         ran.returncode == 2 and "no-undef" in ran.stderr)
    target.write_text(clean)

    path, rules = next(iter(baseline.items()))
    rule = next(iter(rules))
    cut = dict(baseline)
    cut[path] = {k: v for k, v in rules.items() if k != rule}
    (tree / "cut.json").write_text(json.dumps(cut))
    ran = lint(tree, [path], "cut.json")
    case("(c3) a suppression removed for a finding that still exists fails naming it",
         ran.returncode == 1 and path in ran.stdout and rule in ran.stdout)

    over = json.loads(json.dumps(baseline))
    over[path][rule]["count"] += 1
    (tree / "over.json").write_text(json.dumps(over))
    ran = lint(tree, [path], "over.json")
    case("(c4) a suppression whose finding is gone fails",
         ran.returncode != 0 and "--prune-suppressions" in ran.stderr)

    ghost = dict(baseline, **{"src/no-such-file.mjs": {rule: {"count": 1}}})
    case("(c5) a suppression row naming no linted file fails naming it",
         ghost_rows(tree, ghost) == ["src/no-such-file.mjs"])

case("(c6) the rule file names this member as the lint's command",
     "checks/check-eslint.sh" in (ROOT / RULE_FILE).read_text())

ran = lint(ROOT, ["src", "checks"])
if ran.returncode != 0:
    print(ran.stdout + ran.stderr)
    failed.append("eslint")
for key in ghost_rows(ROOT, baseline):
    print("FAIL suppression row names no linted file %s" % key)
    failed.append(key)

if failed:
    sys.exit(1)
print("eslint: %d file(s) in the suppressions baseline, no new finding"
      % len(baseline))
PYX
