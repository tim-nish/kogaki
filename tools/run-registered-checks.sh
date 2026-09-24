#!/usr/bin/env bash
# THE ONE DEFINITION OF "RUN THE SUITE" (kogaki#724).
#
# `--ci-shape` (kogaki#1182) IS A DECLARED MODE, not an ad hoc environment a
# caller composes by hand. On 2026-09-22 a `/ship-cycle 1172` session wanted
# to run this suite the way `.github/workflows/checks.yml` runs it -- no
# `claude` on PATH, no policy gateway -- and had to guess the shape: a
# hand-built symlink directory for the tools it assumed CI has, and a first
# attempt that omitted `node`, so the suite failed for a reason unrelated to
# the change under review. `--ci-shape` sources the one declaration of that
# shape, `tools/ci-shape-env.sh`, restricts PATH to exactly the binaries
# `.github/workflows/checks.yml`'s job provides, points `TSUREZURE_GATEWAY_JS`
# at a nonexistent path, forces execution (`CHECKS_FORCE=1` semantics), and
# records its verdict under its own key so it is never read as, or reused by,
# a full-tool run at the same head.
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
#   - the only CI run for this SHA is a `pull_request` run — it checked out
#     the MERGE commit, not this one, so its verdict is about a different
#     tree. Only `push` runs are trusted; see `ci_verdict`.
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
SUITE_SELF="$0"
cd "$(git -C "$(dirname "$SUITE_SELF")" rev-parse --show-toplevel)"

# --ci-shape (kogaki#1182) and --compare-base (kogaki#1188): THE ONLY TWO
# FLAGS THIS RUNNER TAKES, checked here rather than left for the python
# heredoc to notice, because the shape must be built and exported before
# anything below -- the open-gate directory, the npm precondition, the
# members themselves -- runs under it. Both stripped from "$@" so neither is
# mistaken downstream for a member argument that does not exist. THE TWO
# COMPOSE: a caller may pass both in either order.
CI_SHAPE=0
COMPARE_BASE=""
REMAINING_ARGS=()
i=0
ARGS=("$@")
while (( i < ${#ARGS[@]} )); do
  arg="${ARGS[$i]}"
  if [[ "$arg" == "--ci-shape" ]]; then
    CI_SHAPE=1
  elif [[ "$arg" == "--compare-base" ]]; then
    (( i + 1 < ${#ARGS[@]} )) || { echo "run-registered-checks.sh: --compare-base needs a <ref>" >&2; exit 2; }
    i=$(( i + 1 ))
    COMPARE_BASE="${ARGS[$i]}"
  else
    REMAINING_ARGS+=("$arg")
  fi
  i=$(( i + 1 ))
done
export COMPARE_BASE
# Guarded before expanding, as SUITE_OWNED_TMPDIRS already is below (PR #1183
# round 1, finding 3): an empty array expands to an unbound variable under
# `set -u` on bash before 4.4, which would abort the ORDINARY no-argument
# invocation. Both runners here carry bash 5, so this is portability and the
# file's own convention rather than a live failure.
if ((${#REMAINING_ARGS[@]})); then set -- "${REMAINING_ARGS[@]}"; else set --; fi

# THE SUITE GETS ITS OWN OPEN-GATE DIRECTORY (kogaki#1028 item 5).
#
# The guard members source refuses when `KOGAKI_OPEN_GATES` is unset, because a
# check that starts the executor otherwise mints pointers in the owner's live
# directory — and that directory now gates a live session. The runner is the one
# place that can supply one for the whole suite, so it does, and says so: the
# suite is unaffected, a check run BY HAND without one still refuses, and no run
# of either kind reaches the live directory.
#
# A CALLER'S OWN SETTING IS NEVER OVERRIDDEN. A member being debugged against a
# prepared directory keeps it.
#
# THE TRAP REMOVES ONLY WHAT THIS RUN MADE (kogaki#1153). There are now two
# such directories, so the cleanup is a list rather than a literal: a trap
# naming both variables would delete a caller-supplied directory the moment
# the OTHER one was defaulted, which is the read this block already forbids.
SUITE_OWNED_TMPDIRS=()
trap 'if ((${#SUITE_OWNED_TMPDIRS[@]})); then rm -rf "${SUITE_OWNED_TMPDIRS[@]}"; fi' EXIT

# THE CI SHAPE ITSELF (kogaki#1182): applied here, before the open-gate
# directory, the gate-declaration sidecar and the npm precondition, so every
# one of them -- and every member that follows -- runs inside it rather than
# under whatever PATH and gateway the caller's own shell happened to have.
# The declaration lives in tools/ci-shape-env.sh, sourced rather than
# inlined, because .github/workflows/checks.yml cites that same file by name
# (see its header comment) and a citation needs one thing to point at.
if (( CI_SHAPE )); then
  # shellcheck source=tools/ci-shape-env.sh
  source "$(dirname "$SUITE_SELF")/ci-shape-env.sh"
  ci_shape_apply >/dev/null
  SUITE_OWNED_TMPDIRS+=("${CI_SHAPE_DIR}")
  echo "ci-shape: PATH restricted to ${CI_SHAPE_DIR} (${#CI_SHAPE_BINARIES[@]} declared binaries; kogaki#1182); TSUREZURE_GATEWAY_JS -> ${TSUREZURE_GATEWAY_JS}; CHECKS_FORCE=1"
fi

if [[ -z "${KOGAKI_OPEN_GATES:-}" ]]; then
  KOGAKI_OPEN_GATES="$(mktemp -d "${TMPDIR:-/tmp}/kogaki-open-gates-suite.XXXXXX")"
  export KOGAKI_OPEN_GATES
  SUITE_OWNED_TMPDIRS+=("${KOGAKI_OPEN_GATES}")
  echo "open-gates: this run writes its gate pointers to ${KOGAKI_OPEN_GATES} (kogaki#1028)"
else
  export KOGAKI_OPEN_GATES
  echo "open-gates: using the caller's KOGAKI_OPEN_GATES=${KOGAKI_OPEN_GATES}"
fi

# THE SUITE GETS ITS OWN GATE-DECLARATION SIDECAR DIRECTORY (kogaki#1153).
#
# The same act that mints the open-gate pointer above now also writes
# `~/.claude/gate-declarations/<session_id>.json`, which
# `.claude/hooks/lint-gate-declaration.py` reads as its PRIMARY carrier. A
# suite run inside a live session would therefore write a `mechanical`
# declaration the session never made, and the next question would pass a gate
# whose whole subject is that the session declares. Supplied here for the same
# reason and on the same terms as the pointer directory: the guard refuses when
# it is unset, the runner is the one place that can answer for the whole suite,
# and A CALLER'S OWN SETTING IS NEVER OVERRIDDEN.
if [[ -z "${GATE_DECLARATION_SIDECAR_DIR:-}" ]]; then
  GATE_DECLARATION_SIDECAR_DIR="$(mktemp -d "${TMPDIR:-/tmp}/kogaki-gate-declarations-suite.XXXXXX")"
  export GATE_DECLARATION_SIDECAR_DIR
  SUITE_OWNED_TMPDIRS+=("${GATE_DECLARATION_SIDECAR_DIR}")
  echo "gate-declarations: this run writes its sidecars to ${GATE_DECLARATION_SIDECAR_DIR} (kogaki#1153)"
else
  export GATE_DECLARATION_SIDECAR_DIR
  echo "gate-declarations: using the caller's GATE_DECLARATION_SIDECAR_DIR=${GATE_DECLARATION_SIDECAR_DIR}"
fi

# THE SUITE ESTABLISHES ITS OWN npm PRECONDITION (kogaki#1162, PR #1167 round 1
# finding 1).
#
# kogaki#1162 made `textlint`, its technical-writing preset and
# `textlint-rule-prh` real dependencies of this repository, and added `npm ci`
# to `.github/workflows/checks.yml` so CI has them. That left the repository's
# OWN definition of "run the suite" — this file — with a precondition nothing
# it runs makes true. `node_modules/` is gitignored, so a fresh clone and every
# `git worktree add` (which does not populate ignored paths) started red on
# `ja-lint` AND on `review-draft-runtime`, whose fixtures import the Lint. Two
# members failing on an absent install is not a signal about the diff.
#
# ONE DEFINITION OF "RUN THE SUITE" means one definition of its preconditions
# too. CI supplies this through a workflow step because a workflow is the only
# place it can; here the runner supplies it, and the two now agree.
#
# IT REPORTS AND NEVER GATES, and the distinction is load-bearing rather than
# stylistic. `ja-lint`'s fail-by-name on an absent install is kogaki#1162
# acceptance item 1 — a REQUIRED behaviour, exercised by that member — so this
# block must never become the thing that guarantees the packages are there. It
# tries, says what happened, and leaves the verdict to the member: an offline
# machine, an npm that is not installed, or a failing install each print their
# reason here and then reach `ja-lint`, which fails by name exactly as item 1
# asks. A silent install would make that acceptance item unobservable.
#
# THE READ IS THE PACKAGES, NEVER THE DIRECTORY. `node_modules/` existing says
# nothing about whether the three packages are in it — a partial or interrupted
# install leaves the directory behind — so the condition is the three resolved
# package roots, which is also exactly what `checks/check-ja-lint.sh` asserts.
if [[ -f package.json ]]; then
  npm_deps_present=1
  for p in textlint textlint-rule-preset-ja-technical-writing textlint-rule-prh; do
    [[ -d "node_modules/$p" ]] || npm_deps_present=0
  done
  if (( npm_deps_present )); then
    echo "npm: the three declared packages are present — no install run"
  elif ! command -v npm >/dev/null 2>&1; then
    echo "npm: NOT INSTALLED on this machine — the declared packages cannot be installed here; ja-lint will fail by name (kogaki#1162 acceptance item 1)"
  else
    echo "npm: installing the declared packages from package-lock.json (npm ci) — the suite's own precondition, supplied here as checks.yml supplies it in CI"
    if npm ci --no-audit --no-fund >/dev/null 2>&1; then
      echo "npm: npm ci completed"
    else
      echo "npm: npm ci FAILED (offline, or a lockfile the registry cannot satisfy) — reported, never gated here; ja-lint will fail by name (kogaki#1162 acceptance item 1)"
    fi
  fi
fi

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
import concurrent.futures, json, os, pathlib, subprocess, sys, tempfile, time

WORKFLOW = "checks.yml"

# The kit's ratified degrade exit (policy/kit/, kogaki#1141). Named here
# rather than spelled inline at the grading site, so the one number this
# file borrows from the kit's contract has one site.
KIT_DEGRADE_EXIT = 11

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


def verdict_key(sha):
    """The store filename stem for this run's shape.

    THE SHAPE IS PART OF THE KEY (kogaki#1182 item 3, `--ci-shape`). A
    full-tool run and a `--ci-shape` run at the same head answer different
    questions -- one about this machine's own tools and gateway, one about
    the restricted set `.github/workflows/checks.yml` actually provides -- so
    a verdict recorded by one must never be read as covering the other. The
    plain `{sha}.json` name is unchanged for a full-tool run so every verdict
    ever recorded before this issue keeps resolving.
    """
    return f"{sha}-ci-shape" if os.environ.get("CI_SHAPE") == "1" else sha


def local_verdict(sha):
    path = store_dir() / f"{verdict_key(sha)}.json"
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
    """A completed, successful `checks` workflow run that CHECKED OUT this
    exact commit.

    PUSH EVENTS ONLY, and that restriction is the whole soundness of this
    lookup (PR #797 round 1). A workflow run's `head_sha` is the PR HEAD for a
    `pull_request` run, so `gh run list --commit <pr head>` matches it — but
    that run checked out `refs/pull/N/merge`, the merge of the PR head into
    the base, which is a DIFFERENT TREE whenever the base has moved. Trusting
    it would let a local run at the PR head skip the suite on evidence from a
    tree that included commits the PR head does not have, breaking the premise
    the whole key rests on: that the SHA describes the tree being checked.
    On a `push` run the checkout IS the keyed commit, so the key and the tree
    agree by construction.

    The cost is stated rather than discovered: a PR head can never reuse a CI
    verdict, only a local one. That is the sound half of what #769 measured —
    the duplication it targets is the review lane and repeated local runs
    sharing the local store, and #769's own body already records that CI-side
    reuse is bounded at the ~1% of runs that are same-SHA reruns, which live
    on the push path where this lookup still hits.

    `gh` absent, unauthenticated or offline degrades to None — a full run —
    and says nothing, because a lookup that cannot be made is not evidence
    either way.
    """
    try:
        out = subprocess.run(
            ["gh", "run", "list", "--workflow", WORKFLOW, "--commit", sha,
             "--event", "push", "--status", "success", "--limit", "1",
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
# Members that could not answer because their seam was absent — the kit's
# ratified exit 11. Reported, never counted as failures; see the grading
# block below for why the two are not the same thing.
degraded = []
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
    #
    # THE THIRD GRADE IS `degrade`, AND IT IS NOT A THIRD OUTCOME OF THE
    # CHECK (kogaki#1141). A kit-vendored member whose seam is MACHINE-LOCAL
    # cannot answer at all where that seam is absent, and the kit's ratified
    # shape for saying so is exit 11 with a `policy_source unavailable:` line
    # — declared in `policy/kit/` and used by every seam-touching member it
    # ships. Graded as `fail` it says the member found what it guards
    # against, which is false; graded as `pass` it says the guarded property
    # holds, which is also false and is the silent-green arm those members
    # decline by name. So the log carries the distinction the two existing
    # tokens cannot: the check DID NOT RUN, and the suite does not fail for
    # it.
    #
    # WHAT THIS IS NOT: it is not a general "non-zero exits the runner
    # tolerates" list, and 11 is not this file's number to widen. The code
    # belongs to the kit's degrade contract, so a consumer suite that reads
    # it here and a kit member that writes it there are one agreement with
    # one site on each side. A member of this repository's OWN that exits 11
    # for its own reasons is graded `degrade` too, and that is the cost of
    # keeping one number rather than two.
    #
    # AND IT IS VISIBLE RATHER THAN ABSORBED: the `degraded:` line below
    # names every member that took this path, so a suite that answered
    # nothing is distinguishable from one that answered everything, and a
    # reader is never told `ok:` over a member that did not execute.
    if result["returncode"] == 0:
        outcome = "pass"
    elif result["returncode"] == KIT_DEGRADE_EXIT:
        outcome = "degrade"
    else:
        outcome = "fail"
    print(f"catch: {entry['id']} outcome={outcome} "
          f"ms={result['elapsed_ms']}",
          flush=True)
    if outcome == "fail":
        failed.append(entry["id"])
        # THE SUPERVISOR READS THIS EXACT LINE, right after its `catch:` line
        # (kogaki#1188): one `FAIL <member path> (exit N)` per failing
        # member, so a reader of the log — human or the supervisor parsing
        # it — finds the member and its exit code beside the catch that
        # named it, rather than only in the summary line below.
        print(f"FAIL {member_path(entry)} (exit {result['returncode']})",
              flush=True)
    elif outcome == "degrade":
        degraded.append(entry["id"])

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

# BEFORE the failure verdict, so a run that both failed and degraded says both
# — a degrade hidden behind a FAIL is how the second one gets rediscovered.
if degraded:
    print(f"degraded: {len(degraded)} of {len(entries)} registered check(s) "
          f"could not answer (seam absent, exit {KIT_DEGRADE_EXIT}): "
          + ", ".join(degraded)
          + " -- not a failure and not a pass: the check did not run")

if failed:
    compare_base = os.environ.get("COMPARE_BASE") or None
    if compare_base:
        # --compare-base <ref> (kogaki#1188): a failing member may be a
        # PRE-EXISTING failure — already red at the comparison base, and
        # therefore not this change's to fix — or a failure this change
        # introduces. The distinction is made by RUNNING THE SAME FAILING
        # MEMBERS AGAIN at the merge-base commit, in a throwaway detached
        # worktree, rather than by inspecting git history: the tree at the
        # base is what the member actually sees, and that is the only
        # honest way to ask what it would have reported there.
        merge_base = git("merge-base", compare_base, "HEAD").stdout.strip()
        by_id = {e["id"]: e for e in entries}
        pre_existing, new_failures = [], []
        if not merge_base:
            print(f"run-suite: cannot resolve a merge-base with "
                  f"{compare_base}; treating every failure as new", flush=True)
            new_failures = list(failed)
        else:
            print(f"run-suite: comparing against base {compare_base} "
                  f"(merge base {merge_base})", flush=True)
            with tempfile.TemporaryDirectory() as wt_parent:
                wt_dir = pathlib.Path(wt_parent) / "compare-base"
                added = git("worktree", "add", "--detach", str(wt_dir),
                            merge_base)
                if added.returncode != 0:
                    print(f"run-suite: could not create a comparison "
                          f"worktree at {merge_base} "
                          f"({added.stderr.strip()}); treating every "
                          f"failure as new", flush=True)
                    new_failures = list(failed)
                else:
                    try:
                        # THE HEAD'S node_modules, SYMLINKED IN — a fresh
                        # worktree does not get one (git does not populate
                        # ignored paths), and installing it again would
                        # make the comparison measure npm's reachability
                        # rather than the member's own verdict at the base.
                        head_node_modules = pathlib.Path("node_modules")
                        if head_node_modules.is_dir():
                            os.symlink(head_node_modules.resolve(),
                                       wt_dir / "node_modules")
                        for check_id in failed:
                            base_result = subprocess.run(
                                ["bash", str(member_path(by_id[check_id]))],
                                cwd=wt_dir, stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT)
                            if base_result.returncode == 0:
                                new_failures.append(check_id)
                            else:
                                pre_existing.append(check_id)
                    finally:
                        removed = git("worktree", "remove", "--force",
                                      str(wt_dir))
                        if removed.returncode != 0:
                            git("worktree", "prune")
        if pre_existing:
            print(f"run-suite: pre-existing failure(s) also red at base "
                  f"{compare_base}: " + ", ".join(sorted(pre_existing)))
        if new_failures:
            print("run-suite: new failure(s) vs base " + compare_base
                  + ": " + ", ".join(member_path(by_id[c]).as_posix()
                                      for c in sorted(new_failures)))
            print(f"FAIL: {len(new_failures)} of {len(entries)} registered "
                  f"check(s) fail on this change (vs base {compare_base}): "
                  + ", ".join(sorted(new_failures)))
            sys.exit(1)
        print(f"ok: {len(failed)} of {len(entries)} registered check(s) "
              f"fail, all pre-existing at base {compare_base} — no new "
              f"failure(s); no verdict recorded (not a full pass at HEAD)")
        sys.exit(0)
    print(f"FAIL: {len(failed)} of {len(entries)} registered check(s) failed: "
          + ", ".join(failed))
    sys.exit(1)

# A DEGRADED RUN RECORDS NO VERDICT, and this is the one place the third
# grade is not merely cosmetic (kogaki#1141). The once-per-head store exists
# so a later run at the same SHA may SKIP execution; a run where some member
# never executed has not established what that record would claim, and
# storing it would make the degrade permanent for that head instead of
# transient. So the verdict is written on a FULL pass — every member green —
# and a degraded run leaves the next one to execute again, which is exactly
# what a machine that does have the seam should do.
if sha and not degraded:
    # Written only on a full pass, only for a clean head, only outside the
    # tree (kogaki#769). A write failure is reported and is not a suite
    # failure: the verdict is true whether or not it was stored.
    try:
        d = store_dir()
        d.mkdir(parents=True, exist_ok=True)
        key = verdict_key(sha)
        (d / f"{key}.json").write_text(json.dumps({
            "head": sha, "outcome": "pass", "checks": len(entries),
            "recorded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }, indent=2) + "\n")
        print(f"recorded: full-pass verdict for head {sha} at {d / f'{key}.json'}")
    except OSError as e:
        print(f"note: verdict not recorded ({e}); the next run executes again")
if degraded:
    print(f"ok: {len(entries) - len(degraded)} of {len(entries)} registered check(s) pass; {len(degraded)} could not run")
else:
    print(f"ok: {len(entries)} registered check(s) pass")
PY
