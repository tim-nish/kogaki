#!/usr/bin/env python3
# Each tier value has its reader (kogaki#1794): the runner refuses a registry
# entry whose tier is not `fast` or `pre-push`, naming it, and the edit hook
# runs every `fast` member whose `covers` holds the edited path and exits 2
# with the member's output on a failure. The contract and the mutation
# evidence are this member's admission record in checks/registry.json.
import json
import pathlib
import subprocess
import sys
import tempfile

RUNNER = "tools/run-registered-checks.py"
HOOK = ".claude/hooks/lint-on-edit.py"


def member(id_, tier, covers, body):
    return {"id": id_, "file": "checks/check-%s.sh" % id_, "covers": covers,
            "admission": {"tier": tier}, "_body": body}


def sandbox(base, entries):
    (base / "checks").mkdir(parents=True, exist_ok=True)
    for e in entries:
        (base / e["file"]).write_text("#!/usr/bin/env bash\n" + e["_body"])
    clean = [{k: v for k, v in e.items() if k != "_body"} for e in entries]
    (base / "checks" / "registry.json").write_text(
        json.dumps({"checks": clean}))
    return base


def run_runner(root, base):
    return subprocess.run([sys.executable, str(root / RUNNER)], cwd=base,
                          capture_output=True, text=True)


def run_hook(root, base, rel):
    payload = json.dumps({"tool_input": {"file_path": str(base / rel)}})
    return subprocess.run([sys.executable, str(root / HOOK)], input=payload,
                          capture_output=True, text=True)


def fixtures(root, tmp):
    cases = []
    base = sandbox(tmp / "runner", [member("old", "ci", [], "exit 0\n")])
    ran = run_runner(root, base)
    cases.append(("(t1) the runner refuses a `ci` tier, naming the entry",
                  ran.returncode == 2 and "old ('ci')" in ran.stderr))
    base = sandbox(tmp / "hook", [
        member("quick", "fast", ["data/x.json"], "echo quick-boom; exit 1\n"),
        member("slow", "pre-push", ["data/x.json"], "echo slow-ran; exit 1\n"),
    ])
    (base / "data").mkdir()
    (base / "data" / "x.json").write_text("{}\n")
    (base / "data" / "y.json").write_text("{}\n")
    ran = run_hook(root, base, "data/x.json")
    cases.append(("(t2) the edit hook runs a failing `fast` member covering "
                  "the path and exits 2 with its output",
                  ran.returncode == 2 and "quick-boom" in ran.stderr))
    cases.append(("(t3) the edit hook does not run a `pre-push` member",
                  "slow-ran" not in ran.stderr))
    ran = run_hook(root, base, "data/y.json")
    cases.append(("(t4) a path no `fast` member covers returns 0",
                  ran.returncode == 0 and not ran.stderr))
    return cases


def main():
    root = pathlib.Path(subprocess.run(
        ["git", "rev-parse", "--show-toplevel"], capture_output=True,
        text=True, check=True).stdout.strip())
    with tempfile.TemporaryDirectory() as tmp:
        cases = fixtures(root, pathlib.Path(tmp))
    failed = [label for label, ok in cases if not ok]
    for label in failed:
        print("FAIL fixture %s" % label)
    if failed:
        return 1
    print("check-tier-readers: PASS (%d fixture cases)" % len(cases))
    return 0


if __name__ == "__main__":
    sys.exit(main())
