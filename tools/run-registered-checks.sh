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
# THE REUSE IS DECIDED BEFORE CONCURRENCY, not beside it (kogaki#769 rebased
# onto kogaki#789). Reuse removes the whole execution; concurrency shortens it.
# So the verdict lookup runs before the pool is sized, and a reuse reports no
# `suite:` line either — there was no wall time and no member sum to report,
# and printing zeros would put a measurement in the log for a run that
# measured nothing.
#
# NOT ITSELF A REGISTERED CHECK, and sited outside `checks/` for that reason:
# every file in that directory must be a registry member or it is dead code,
# and a runner is not a check. `tools/` is where this repository's
# non-registered executables already live.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"

# MEMBERS RUN CONCURRENTLY AND THE LOG IS PRINTED IN REGISTRY ORDER (kogaki#789).
# The work is unchanged and so is every observation: the same members run, each
# still gets its `== ` header, its own output and its own `catch:` line, in the
# same order. Only the waiting is shortened.
#
# WHAT THIS IS AND IS NOT. Concurrency is a MARGIN TOOL, not the lever. The
# binding quantity is total cost per ship-cycle (sum of runtime x invocations),
# which this does not change at all — it moves WALL TIME only, and its floor is
# the slowest single member, so a suite dominated by one slow check is barely
# helped. The lever for that member is assertion ALTITUDE or a declared tier,
# ordered BEFORE margin tools:
#   consulted: product-lab@823aa804af92350d6fc6e83a396c7229b6585780 topics/claude-code-ops.md:214
#   consulted: product-lab@823aa804af92350d6fc6e83a396c7229b6585780 topics/claude-code-ops.md:273
# The suite line printed at the end reports wall time BESIDE the serial sum so
# the gap between them is visible rather than asserted, and so a member growing
# into the new floor is legible at the next run.
#
# THE COST IS LIVE PROGRESS. Each member's stdout and stderr are captured to a
# buffer instead of streaming, because eighteen members interleaving live output
# is unreadable — which is why the buffering is the design and not an oversight.
# stderr is merged into stdout so a member's own two streams keep their true
# relative order, which streaming gave for free.
#
# ESCAPE HATCHES, both of which restore the old execution exactly:
#   CHECKS_JOBS=1        environment, whole run, for debugging or a constrained
#                        runner. Any positive integer caps the pool.
#   "serial": true       per registry entry, for a member that cannot share the
#                        tree. Serial members run one at a time, alone, before
#                        the pool starts, so "alone" means it. No member
#                        declares it today: `runs-retention` and
#                        `registry-conformance` are the only ones touching
#                        shared paths and both only READ them.
exec python3 - "$@" <<'PY'
import concurrent.futures, json, os, pathlib, subprocess, sys, time

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


def member_path(entry):
    # A `file` carrying a separator is REPO-ROOT-RELATIVE; a bare name
    # resolves under checks/ as it always has (kogaki#724).
    return (pathlib.Path(entry["file"]) if "/" in entry["file"]
            else pathlib.Path("checks") / entry["file"])


def run_member(entry):
    """Run one member, returning its captured output, status and cost.

    Captures rather than streams, and merges stderr into stdout so the
    member's own interleaving survives. Nothing is printed here: printing is
    the caller's, in registry order, so the log does not depend on the order
    members happen to finish in.
    """
    started = time.monotonic()
    result = subprocess.run(["bash", str(member_path(entry))],
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    return {
        "entry": entry,
        # RAW BYTES, never decoded. Streaming passed a member's output to fd 1
        # untouched, and decoding it here would silently rewrite any non-UTF-8
        # byte a member emits into U+FFFD — a log difference this change has no
        # licence to make. No member emits such output today; that is why it
        # stays bytes rather than why it would be safe to decode (PR #794
        # round 1).
        "output": result.stdout,
        "returncode": result.returncode,
        "elapsed_ms": round((time.monotonic() - started) * 1000),
    }


def resolve_jobs():
    """Pool size: CHECKS_JOBS if it names a positive integer, else CPUs capped.

    A malformed or non-positive CHECKS_JOBS is a typo, and the safe reading of
    a typo here is the OLD behaviour: fall back to serial and say so, rather
    than silently running the default width the operator was trying to change.
    """
    raw = os.environ.get("CHECKS_JOBS")
    if raw is not None:
        try:
            n = int(raw)
        except ValueError:
            n = 0
        if n < 1:
            print(f"note: CHECKS_JOBS={raw!r} is not a positive integer — "
                  "running serially", flush=True)
            return 1
        return n
    return min(os.cpu_count() or 4, 8)


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

jobs = resolve_jobs()
serial_entries = [e for e in entries if e.get("serial") is True]
pool_entries = [e for e in entries if e.get("serial") is not True]
if jobs == 1:
    serial_entries, pool_entries = entries, []

results = {}
wall_started = time.monotonic()
# Serial members run FIRST and ALONE — the whole point of the declaration is
# that nothing else is touching the tree while they do.
for entry in serial_entries:
    results[entry["id"]] = run_member(entry)
if pool_entries:
    with concurrent.futures.ThreadPoolExecutor(max_workers=jobs) as pool:
        for result in pool.map(run_member, pool_entries):
            results[result["entry"]["id"]] = result
wall_ms = round((time.monotonic() - wall_started) * 1000)

failed = []
serial_sum_ms = 0
# REGISTRY ORDER, always — the printed log is what CI, a reviewer and
# `tools/digest-check-catches.sh` all read, and it must not vary with timing.
for entry in entries:
    result = results[entry["id"]]
    print(f"== {entry['id']} ({member_path(entry)})", flush=True)
    # Through the binary buffer, so the member's bytes reach the log exactly as
    # they left it. The print above is flushed, so ordering holds.
    sys.stdout.buffer.write(result["output"])
    sys.stdout.buffer.flush()
    serial_sum_ms += result["elapsed_ms"]
    # The catch ledger's primary capture (kogaki#113): one line per check per
    # exercised run, in the run log — assembled on demand, never a stored
    # second ledger (owner decision 2026-08-06). A "fail" is a catch: the
    # check found what it guards against. Flushed per line so a cancelled run
    # does not lose the catches already made.
    # `ms=` is the measured cost per run (kogaki#20): the static `runtime_ms`
    # declared at admission rots, and retention weighs measured cost. Lines
    # predating this field simply lack it; the digest counts timed runs as
    # their own denominator rather than guessing.
    # Still each member's OWN measured cost, timed around that member's own
    # subprocess rather than sliced out of the wall.
    #
    # BUT IT IS INFLATED BY CONTENTION, and that is stated here because `ms=`
    # is what retention weighs. Measured on this repository, three runs each:
    # serial wall 9.20/9.74/9.34s with the sum equal to it by construction;
    # at 8 jobs wall 5.25/4.95/5.09s with the per-member sum 13.39/11.95/12.08s.
    # So the wall falls ~46% while the summed member cost RISES ~28% — the same
    # member, doing the same work, reports a larger number because it was
    # sharing a CPU. A concurrent `ms=` and a serial `ms=` are therefore not
    # comparable, and a digest mixing them is reading one number generated two
    # ways.
    # The `suite:` line below is the discriminator — it names the mode and
    # prints BOTH figures — but `tools/digest-check-catches.sh` reads only the
    # `catch:` lines, so its cost totals will shift upward at this change with
    # nothing in those lines saying why. Marking the catch line would settle it
    # and is deliberately NOT done here: kogaki#789 acceptance 2 requires the
    # `catch:` lines to stay byte-identical to a serial run, and that grammar is
    # a shared contract rather than this file's to widen. Named as a follow-on,
    # not left to be discovered from a step in a graph.
    print(f"catch: {entry['id']} outcome="
          f"{'pass' if result['returncode'] == 0 else 'fail'} "
          f"ms={result['elapsed_ms']}",
          flush=True)
    if result["returncode"] != 0:
        failed.append(entry["id"])

# Wall BESIDE the summed member cost (kogaki#789 acceptance 1). No target is
# asserted and none is checked: this is a cap that REPORTS, never a target that
# PULLS.
#
# IT IS CALLED "member sum" AND NOT "serial sum", because under concurrency it
# is neither (PR #794 round 1). The figure is the sum of the per-member `ms=`
# values actually recorded, and those are contention-inflated — measured ~28%
# above what the same members total when run serially. Labelling it "serial
# sum" would have made the one line added to expose the wall/serial gap
# overstate the very side it was quoting, and the qualifier belongs in the
# PRINTED log rather than only in this file's comments, since the log is what a
# reader and CI actually see.
mode = (f"{jobs} job(s)" if pool_entries else "serial")
inflated = " (contention-inflated; not a serial baseline)" if pool_entries else ""
print(f"suite: wall {wall_ms/1000:.2f}s; member sum {serial_sum_ms/1000:.2f}s"
      f"{inflated} over {len(entries)} member(s); {mode}"
      + (f", {len(serial_entries)} declared serial" if serial_entries and pool_entries else ""))

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
