#!/usr/bin/env bash
# No src/ import crosses a lane boundary, reaches a playground or closes a
# cycle beyond the known-violations baseline, and the baseline names no edge
# that is gone (kogaki#1746). The rule is `.dependency-cruiser.cjs`; this
# member runs it. The contract and the mutation evidence are this member's
# admission record in checks/registry.json.
#
# One cruise of src/ with the baseline as known violations. A violation
# dependency-cruiser does not mark known is a new edge; a baseline row that
# matches no violation is a stale row. Either fails, naming the edge. The
# fixture pass runs on every invocation.
# Not verified: an import built at run time (a computed `import()` path) or a
# file read with `readFileSync`, which no import graph sees.
set -euo pipefail
cd "$(dirname "${0}")/.."

python3 - "$@" <<'PYX'
import json, os, pathlib, shutil, subprocess, sys, tempfile

ROOT = pathlib.Path.cwd()
DEPCRUISE = ROOT / "node_modules" / ".bin" / "depcruise"
CONFIG = ".dependency-cruiser.cjs"
BASELINE = ".dependency-cruiser-known-violations.json"
HOOK = ".claude/hooks/lint-on-edit.py"
RULE_FILE = ".claude/rules/src-lanes.md"


def edge(row):
    cycle = tuple(step["name"] for step in row.get("cycle", []))
    return (row["rule"]["name"], row["from"], row["to"], cycle)


def show(key):
    name, frm, to, cycle = key
    tail = " → ".join(cycle) if cycle else to
    return "%s: %s → %s" % (name, frm, tail)


def cruise(tree):
    """Every violation dependency-cruiser finds under `tree`/src."""
    out = subprocess.run(
        [str(DEPCRUISE), "src", "--config", CONFIG, "--ignore-known", BASELINE,
         "--output-type", "json"],
        cwd=tree, capture_output=True, text=True)
    if not out.stdout.strip():
        sys.exit("dependency-rules: depcruise produced no report: %s"
                 % out.stderr.strip())
    return json.loads(out.stdout)["summary"]["violations"]


def judge(violations, baseline):
    """`[message]` — empty when the tree holds the baseline exactly."""
    found = {edge(v) for v in violations}
    known = {edge(r) for r in baseline}
    new = sorted(edge(v) for v in violations
                 if v["rule"]["severity"] != "ignore" or edge(v) not in known)
    stale = sorted(known - found)
    return (["new edge %s" % show(k) for k in dict.fromkeys(new)]
            + ["baseline row names no current edge %s" % show(k)
               for k in stale])


def bench(tree):
    for path in ("src", CONFIG, BASELINE, HOOK):
        src, dst = ROOT / path, tree / path
        dst.parent.mkdir(parents=True, exist_ok=True)
        (shutil.copytree if src.is_dir() else shutil.copy)(src, dst)


def hook(tree, rel, with_modules):
    modules = tree / "node_modules"
    if with_modules and not modules.exists():
        modules.symlink_to(ROOT / "node_modules")
    if not with_modules and modules.is_symlink():
        modules.unlink()
    payload = {"tool_name": "Edit",
               "tool_input": {"file_path": str(tree / rel)}}
    return subprocess.run([sys.executable, str(tree / HOOK)],
                          input=json.dumps(payload), capture_output=True,
                          text=True)


if not DEPCRUISE.exists():
    sys.exit("dependency-rules: %s is absent; run `npm ci`" % DEPCRUISE)

baseline = json.loads((ROOT / BASELINE).read_text())
violations = cruise(ROOT)
CROSSING = 'import {} from "../terrain/survey.mjs";\n'
failed = []


def case(label, ok):
    print(("ok   " if ok else "FAIL ") + label)
    if not ok:
        failed.append(label)


with tempfile.TemporaryDirectory() as tmp:
    tree = pathlib.Path(tmp)
    bench(tree)
    target = tree / "src/brief/run-state.mjs"
    target.write_text(CROSSING + target.read_text())

    got = judge(cruise(tree), baseline)
    case("(c1) a new import from src/brief/ into src/terrain/ fails naming the edge",
         any("src/brief/run-state.mjs → src/terrain/survey.mjs" in m
             for m in got))

    row = baseline[0]
    got = judge(violations, baseline[1:])
    case("(c2) a baseline row removed for an edge that still exists fails naming it",
         ("new edge " + show(edge(row))) in got)

    ghost = dict(row, **{"from": "src/brief/no-such-file.mjs"})
    got = judge(violations, baseline + [ghost])
    case("(c3) a baseline row naming no current edge fails naming it",
         got == ["baseline row names no current edge " + show(edge(ghost))])

    ran = hook(tree, "src/brief/run-state.mjs", True)
    case("(c4) the edit hook returns the new edge for an edited src/ file",
         ran.returncode == 2 and "src/terrain/survey.mjs" in ran.stderr)

    ran = hook(tree, "README.md", False)
    case("(c5) the edit hook runs nothing for a path outside src/**/*.mjs",
         ran.returncode == 0 and not ran.stdout and not ran.stderr)

case("(c6) the rule file names this member as the rule's command",
     "checks/check-dependency-rules.sh" in (ROOT / RULE_FILE).read_text())

for message in judge(violations, baseline):
    print("FAIL " + message)
    failed.append(message)

if failed:
    sys.exit(1)
print("dependency-rules: %d known violation(s) in the baseline, no new edge"
      % len(baseline))
PYX
