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

# --ci-shape (kogaki#1182), --compare-base (kogaki#1188) and the repeatable
# --only <id> (kogaki#1353): THE ONLY THREE FLAGS THIS RUNNER TAKES, checked
# here rather than left for the python heredoc to notice, because the shape
# must be built and exported before anything below -- the open-gate
# directory, the members themselves -- runs under it. All three stripped
# from "$@" so none is mistaken downstream for a member argument that does
# not exist. THEY COMPOSE: a caller may pass any of them in any order and
# any combination.
CI_SHAPE=0
COMPARE_BASE=""
ONLY_IDS=()
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
  elif [[ "$arg" == --compare-base=* ]]; then
    COMPARE_BASE="${arg#--compare-base=}"
  elif [[ "$arg" == "--only" ]]; then
    (( i + 1 < ${#ARGS[@]} )) || { echo "run-registered-checks.sh: --only needs an <id>" >&2; exit 2; }
    i=$(( i + 1 ))
    ONLY_IDS+=("${ARGS[$i]}")
  elif [[ "$arg" == --only=* ]]; then
    ONLY_IDS+=("${arg#--only=}")
  elif [[ "$arg" == -* ]]; then
    # AN UNRECOGNISED FLAG IS REFUSED, NEVER SILENTLY DROPPED (PR #1192 round
    # 1 finding 3). `--compare-base=<ref>` used to fall through to here and
    # into REMAINING_ARGS, which nothing downstream reads, so a typo'd `=`
    # spelling ran the suite with no comparison and no complaint. The header
    # above calls these "the only three flags this runner takes" -- this is
    # what makes that true rather than aspirational.
    echo "run-registered-checks.sh: unrecognised flag: $arg" >&2
    exit 2
  else
    REMAINING_ARGS+=("$arg")
  fi
  i=$(( i + 1 ))
done
export COMPARE_BASE
# Guarded for the same empty-array reason as SUITE_OWNED_TMPDIRS and
# REMAINING_ARGS below: an empty ONLY_IDS must not abort the ordinary
# no-`--only` invocation under `set -u`. Joined on newlines rather than a
# delimiter an id could plausibly contain, and popped from the environment
# by the python body before any member runs, so no member subprocess -- and
# no nested run-registered-checks.sh a member starts, the way
# checks/check-ci-shape.sh and checks/check-runner-only.sh do -- ever reads
# the outer run's own `--only` as its own.
if ((${#ONLY_IDS[@]})); then
  ONLY_IDS_JOINED="$(printf '%s\n' "${ONLY_IDS[@]}")"
else
  ONLY_IDS_JOINED=""
fi
export ONLY_IDS_JOINED
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
# directory and the gate-declaration sidecar, so every one of them -- and
# every member that follows -- runs inside it rather than
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
#
# THE RUNNER'S PROGRAM IS tools/run-registered-checks.py (kogaki#1794); this
# file parses the flags, sets up the temporary directories and execs it.
#
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
# The `suite:` line the program prints is the discriminator — it names the mode and
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
# AND IT IS VISIBLE RATHER THAN ABSORBED: the `degraded:` line the program prints
# names every member that took this path, so a suite that answered
# nothing is distinguishable from one that answered everything, and a
# reader is never told `ok:` over a member that did not execute.
exec python3 "$(dirname "$SUITE_SELF")/run-registered-checks.py" "$@"
