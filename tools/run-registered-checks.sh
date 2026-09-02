#!/usr/bin/env bash
# THE ONE DEFINITION OF "RUN THE SUITE" (kogaki#724).
#
# Two consumers need it — CI's registry-driven job and the review lane's
# declared mechanism in `.claude/review-lane.json` — and until this file
# existed they each carried their own. CI's was registry-driven; the lane's
# was the glob `checks/check-*.sh`. Moving four checks into the kit made the
# two disagree: CI ran 20 members and the lane ran 16, reporting green while
# executing neither the seam gate nor the kit's own install test. The lane is
# where a reviewer's mechanism grounding comes from, so the disagreement was
# invisible exactly where it mattered most.
#
# WHY REGISTRY-DRIVEN AND NOT A WIDER GLOB. A glob over two directories fixes
# today's split and leaves the next directory admit-by-default — the
# enumeration whose load-bearing half is its non-member fallback. The registry
# is already the ratified source of what the suite IS: the suite runs only
# REGISTERED checks, and an unregistered file is dead code that
# check-registry-conformance refuses. Reading it here means a member is
# covered by being registered rather than by living somewhere a pattern
# happens to reach.
#
# ONCE PER HEAD SHA (kogaki#769). The suite executes at most once per clean
# head, across sites. Before running a member, the runner looks for a recorded
# FULL-PASS verdict for `HEAD` — first in a machine-local store, then in the
# `checks` workflow's completed runs for that commit — and on a hit prints one
# `reused:` line naming the source and exits green. What makes the reuse
# honest, stated as the conditions under which it does NOT happen:
#   - the working tree's tracked files differ from HEAD (the SHA does not
#     describe the tree being checked) — untracked files are not part of the
#     key, disclosed rather than hidden: an untracked file under checks/ is
#     refused by check-registry-conformance on the run that admits it;
#   - the recorded suite did not pass in full — a failure is never reused;
#   - CHECKS_FORCE=1 — the caller wants execution, not a verdict;
#   - the lookup cannot be made (no gh, no network, no token) — degrade is
#     a full run, never a guess.
# The record is written ONLY after a run in which every member passed, and
# lives OUTSIDE the repository tree (${CHECKS_RESULT_DIR:-$XDG_CACHE_HOME/
# kogaki-checks/<repo>/}): the approved-closes receipt was once committed by
# accident and made a transient approval permanent (claude-toolkit#581); a
# verdict store inside the tree would carry the same hazard.
# A reuse prints NO `catch:` line. tools/digest-check-catches.sh counts
# `catch:` lines as EXERCISED runs, and a reuse exercised nothing; the prefix
# differs by construction so the denominator stays true.
#
# NOT ITSELF A REGISTERED CHECK, and sited outside `checks/` for that reason:
# every file in that directory must be a registry member or it is dead code,
# and a runner is not a check. `tools/` is where this repository's
# non-registered executables already live.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"

exec python3 - "$@" <<'PY'
import json, os, pathlib, subprocess, sys, time

WORKFLOW = "checks.yml"

registry = json.loads(pathlib.Path("checks/registry.json").read_text())
entries = registry["checks"]
if not entries:
    print("ok: no registered checks (registry empty)")
    sys.exit(0)


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True)


def head_key():
    """The head SHA, or None when the tree does not match it."""
    sha = git("rev-parse", "HEAD").stdout.strip()
    if not sha:
        return None
    if git("diff", "--quiet", "HEAD").returncode != 0:
        return None
    if git("diff", "--cached", "--quiet", "HEAD").returncode != 0:
        return None
    return sha


def repo_slug():
    url = git("remote", "get-url", "origin").stdout.strip()
    tail = url.rstrip("/").split("/")[-1] if url else ""
    if tail.endswith(".git"):      # not str.removesuffix: /usr/bin/python3 may predate 3.9
        tail = tail[:-4]
    return tail or pathlib.Path.cwd().name


def store_dir():
    base = os.environ.get("CHECKS_RESULT_DIR")
    if not base:
        xdg = os.environ.get("XDG_CACHE_HOME") or str(pathlib.Path.home() / ".cache")
        base = str(pathlib.Path(xdg) / "kogaki-checks" / repo_slug())
    return pathlib.Path(base)


def local_verdict(sha):
    path = store_dir() / f"{sha}.json"
    if not path.exists():
        return None
    try:
        rec = json.loads(path.read_text())
    except (OSError, ValueError):
        return None
    if rec.get("outcome") != "pass" or rec.get("head") != sha:
        return None
    return f"local store {path} (recorded {rec.get('recorded_at', '?')}, " \
           f"{rec.get('checks', '?')} checks)"


def ci_verdict(sha):
    """A completed, successful `checks` workflow run for this exact commit.

    `gh` absent, unauthenticated or offline degrades to None — a full run —
    and says nothing, because a lookup that cannot be made is not evidence
    either way.
    """
    try:
        out = subprocess.run(
            ["gh", "run", "list", "--workflow", WORKFLOW, "--commit", sha,
             "--status", "success", "--limit", "1",
             "--json", "databaseId,url,createdAt"],
            capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.TimeoutExpired):
        return None
    if out.returncode != 0:
        return None
    try:
        runs = json.loads(out.stdout or "[]")
    except ValueError:
        return None
    if not runs:
        return None
    r = runs[0]
    return f"CI run {r.get('databaseId')} {r.get('url', '')} (created {r.get('createdAt', '?')})"


sha = head_key()
forced = os.environ.get("CHECKS_FORCE", "") == "1"
if sha and not forced:
    source = local_verdict(sha) or ci_verdict(sha)
    if source:
        print(f"reused: full-pass suite verdict for head {sha} from {source}; "
              f"{len(entries)} registered check(s) not executed "
              f"(CHECKS_FORCE=1 to execute)")
        sys.exit(0)
elif sha is None:
    print("note: tracked files differ from HEAD; no verdict is reused or "
          "recorded for this run", flush=True)
elif forced:
    print("note: CHECKS_FORCE=1; executing every member", flush=True)

failed = []
for entry in entries:
    # A `file` carrying a separator is REPO-ROOT-RELATIVE; a bare name
    # resolves under checks/ as it always has (kogaki#724).
    path = (pathlib.Path(entry["file"]) if "/" in entry["file"]
            else pathlib.Path("checks") / entry["file"])
    print(f"== {entry['id']} ({path})", flush=True)
    started = time.monotonic()
    result = subprocess.run(["bash", str(path)])
    elapsed_ms = round((time.monotonic() - started) * 1000)
    # The catch ledger's primary capture (kogaki#113): one line per check per
    # exercised run, in the run log — assembled on demand, never a stored
    # second ledger (owner decision 2026-08-06). A "fail" is a catch: the
    # check found what it guards against. Flushed per line so a cancelled run
    # does not lose the catches already made.
    # `ms=` is the measured cost per run (kogaki#20): the static `runtime_ms`
    # declared at admission rots, and retention weighs measured cost. Lines
    # predating this field simply lack it; the digest counts timed runs as
    # their own denominator rather than guessing.
    print(f"catch: {entry['id']} outcome="
          f"{'pass' if result.returncode == 0 else 'fail'} ms={elapsed_ms}",
          flush=True)
    if result.returncode != 0:
        failed.append(entry["id"])

if failed:
    print(f"FAIL: {len(failed)} of {len(entries)} registered check(s) failed: "
          + ", ".join(failed))
    sys.exit(1)

if sha:
    # Written only on a full pass, only for a clean head, only outside the
    # tree (kogaki#769). A write failure is reported and is not a suite
    # failure: the verdict is true whether or not it was stored.
    try:
        d = store_dir()
        d.mkdir(parents=True, exist_ok=True)
        (d / f"{sha}.json").write_text(json.dumps({
            "head": sha, "outcome": "pass", "checks": len(entries),
            "recorded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }, indent=2) + "\n")
        print(f"recorded: full-pass verdict for head {sha} at {d}")
    except OSError as e:
        print(f"note: verdict not recorded ({e}); the next run executes again")
print(f"ok: {len(entries)} registered check(s) pass")
PY
