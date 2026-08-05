#!/usr/bin/env bash
# The mechanical review trigger (specs/SPEC.md §4 PR-gate clause, kogaki#34
# item 2; story 1.13, licensed by kogaki#37).
#
# WHY A SWEEP AND NOT A GITHUB ACTION. The transport was chosen against three
# facts about this environment rather than from the menu, and all three rule
# the Actions option out:
#
#   1. The repository holds no Actions secret, so no CI-hosted agent can
#      authenticate today.
#   2. The gateway's location is MACHINE-LOCAL CONFIGURATION and "never a
#      committed path" (kogaki#9) — it resolves through --gateway,
#      $TSUREZURE_GATEWAY_JS, or the machine's own MCP registration. A CI
#      runner has none of those and cannot be given one without committing a
#      path the founding decision forbids.
#   3. §4 now makes an UNSCOPED TIER-1 SURVEY the review's fixed opening move.
#      A reviewer that cannot reach the seam fails that clause on EVERY run,
#      so an Actions-hosted lane would be structurally degraded rather than
#      occasionally so.
#
# So the trigger runs where the seam is. A spawned session satisfies the
# isolation requirement BY CONSTRUCTION — a fresh reviewer holds none of the
# author's context — which is what makes a mechanical trigger the right
# carrier rather than merely a convenient one.
#
# WHAT FIRES THIS TOOL — AN EVENT, NEVER A TIMER (kogaki#47). The periodic
# timer this file originally recommended is REJECTED: a timer forces the
# user to wait for the next tick, and "a mechanism is not correct merely
# because it behaves according to its own internal rules — if the user
# experience is bad, it is a mechanism built on an incorrect design"
# (consulted: product-lab@ed47fbd3 topics/archive/articles.md:29); a trigger
# binds to "an act that ALREADY HAPPENS … never as a periodic reader"
# (topics/knowledge-architecture.md:9). The acts that change the review
# substrate are `gh pr create` and `git push`, and the project-scoped hook
# (.claude/hooks/review-trigger.py, wired in .claude/settings.json) fires
# this tool in SINGLE-TARGET mode (--pr N / --branch B), detached, at those
# acts. The full sweep remains as MANUAL RECONCILIATION only — for PRs
# created outside a hooked session — and the presence check stays the loud
# backstop either way: an unreviewed PR cannot merge.
#
# The three environment facts above rule out ACTIONS-HOSTED review; they
# never ruled out event-driven local invocation, and reading them as if
# they did was the defect kogaki#48 generalized (a decline spent past its
# boundary).
#
# WHAT A SPAWNED SESSION IS GIVEN, DECLARED HERE RATHER THAN ABSORBED
# (kogaki#52). A spawn inherits whatever the operator's interactive session
# happens to be configured with unless it is told otherwise, and that is
# ambient state standing in for policy: the model was inherited (Fable, which
# the owner has ruled must never run spawned agents), the route was invisible
# because only the final output was captured, and nothing bounded the run.
# Three declarations, each with an override, and the defaults are recorded
# here so the policy is readable without running anything:
#
#   model      opus  · $KOGAKI_REVIEW_MODEL      — judgment work; a model
#                                                  choice for a spawned agent
#                                                  is operator policy
#   max turns  60    · $KOGAKI_REVIEW_MAX_TURNS  — a cap is architecture, not
#                                                  prompt hygiene
#   log dir    ~/.kogaki/reviews · $KOGAKI_REVIEW_LOG_DIR
#
# The cap is the half with a served position behind it: "an agent system that
# lets one instruction spawn unbounded parallel work is missing a budget
# mechanism; caps are architecture (config + gates), not prompt hygiene"
# (consulted: product-lab@ed47fbd3 LESSONS.md:135). It lives in the spawn
# invocation for that reason — a limit written into the reviewer's prompt is
# the thing that line refuses.
#
# THE ROUTE IS CAPTURED, NOT ONLY THE VERDICT. Each spawn streams to its own
# per-round file (`pr-<n>-round-<r>.log`), so a reviewer that goes sideways
# mid-run — scope drift, a tool loop, token burn — is inspectable while it is
# happening rather than inferred afterwards from a report that reads wrong. A
# capped or crashed run leaves the PR REPORT-LESS on purpose: the presence
# gate then fails loudly, which is the designed backstop doing its job, and is
# why this file never fabricates a partial report.
#
# SPAWNING IS OPT-IN. --dry-run is the default: the sweep reports what it
# would do and mutates nothing. Spawning a session is an outward act, so it
# needs an explicit --spawn rather than a flag someone forgets is on.
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="dry-run"
LIMIT=50
TARGET_PR=""
TARGET_BRANCH=""
while [ $# -gt 0 ]; do
  case "$1" in
    --spawn) MODE="spawn" ;;
    --dry-run) MODE="dry-run" ;;
    --pr) TARGET_PR="${2:?--pr needs a number}"; shift ;;
    --branch) TARGET_BRANCH="${2:?--branch needs a name}"; shift ;;
    --help|-h)
      # Print the whole header block — every comment line after the shebang,
      # stopping at the first line of code. Previously a literal '2,48p',
      # which silently truncated the moment the header grew: adding the
      # spawned-session policy above would have documented it everywhere
      # except in `--help`, where an operator actually looks for it.
      awk 'NR>1 && /^#/ { sub(/^# ?/, ""); print; next } NR>1 { exit }' "$0"
      echo
      echo "usage: tools/review-sweep.sh [--dry-run|--spawn] [--pr N | --branch NAME]"
      echo
      echo "Fired by the project hook at gh pr create / git push (kogaki#47);"
      echo "run it bare for a manual reconciliation pass over all open PRs."
      exit 0 ;;
    *) echo "unknown argument: $1 (try --help)" >&2; exit 2 ;;
  esac
  shift
done

if ! command -v gh >/dev/null 2>&1; then
  echo "FAIL could not establish the substrate: gh is not available." >&2
  echo "  Reported as a failure rather than as nothing-to-do: a sweep that" >&2
  echo "  exits quietly when its instrument is missing is indistinguishable" >&2
  echo "  from a sweep that ran and found no work." >&2
  exit 1
fi

# Single-target mode (the hook's path): one PR by number, or resolved from
# a head branch. A branch with no open PR yet is normal (a push precedes
# creation) and is a stated no-op, never a failure.
if [ -n "$TARGET_PR" ]; then
  if ! one="$(gh pr view "$TARGET_PR" \
              --json number,headRefOid,author,isCrossRepository 2>/dev/null)"; then
    echo "FAIL could not establish the substrate: gh pr view $TARGET_PR failed." >&2
    exit 1
  fi
  prs="[$one]"
elif [ -n "$TARGET_BRANCH" ]; then
  if ! prs="$(gh pr list --state open --head "$TARGET_BRANCH" \
              --json number,headRefOid,author,isCrossRepository 2>/dev/null)"; then
    echo "FAIL could not establish the substrate: the gh lookup failed." >&2
    exit 1
  fi
  if [ "$prs" = "[]" ]; then
    echo "no open PR for branch $TARGET_BRANCH — a push before PR creation is normal; nothing to do"
    exit 0
  fi
elif ! prs="$(gh pr list --state open --limit "$LIMIT" \
            --json number,headRefOid,author,isCrossRepository 2>/dev/null)"; then
  echo "FAIL could not establish the substrate: the gh lookup failed." >&2
  exit 1
fi

# The repository owner is resolved at run time, never hardcoded: the
# eligibility rule is owned by the merge-eligibility contract (repository
# owner, plus pipeline.json's optional merge_author_allowlist), and a copied
# login is a conformance copy with no declared precedence — on any other
# repo it silently classifies every PR external (PR #46 review, round 1).
if ! OWNER="$(gh repo view --json owner -q .owner.login 2>/dev/null)" \
   || [ -z "$OWNER" ]; then
  echo "FAIL could not establish the substrate: the repository owner could" >&2
  echo "  not be resolved, and eligibility is computed against it." >&2
  exit 1
fi

# Spawned-session policy (kogaki#52). Declared, with an override each, and the
# defaults are the ones the header records — one place to read, one place to
# change.
REVIEW_MODEL="${KOGAKI_REVIEW_MODEL:-opus}"
REVIEW_MAX_TURNS="${KOGAKI_REVIEW_MAX_TURNS:-60}"
REVIEW_LOG_DIR="${KOGAKI_REVIEW_LOG_DIR:-$HOME/.kogaki/reviews}"

SWEEP_PRS="$prs" SWEEP_MODE="$MODE" SWEEP_OWNER="$OWNER" SWEEP_LIMIT="$LIMIT" \
SWEEP_MODEL="$REVIEW_MODEL" SWEEP_MAX_TURNS="$REVIEW_MAX_TURNS" \
SWEEP_LOG_DIR="$REVIEW_LOG_DIR" \
python3 <<'PYEOF'
import json, os, re, subprocess, sys

REPORT = re.compile(r'^\s*review-lane report:\s*([0-9a-f]{7,40})\s*$', re.M)
FINDING = re.compile(
    r'^\s*finding:\s*(blocking|should|nit)\s+(open|resolved)\b', re.M)
MAX_ROUNDS = 2   # §4 clause 3: two rounds, then a parked owner decision.

# Spawned-session policy, resolved in the shell above and passed in rather than
# re-defaulted here — two places that both know a default is two places that
# can disagree about it (kogaki#52).
MODEL = os.environ["SWEEP_MODEL"]
MAX_TURNS = os.environ["SWEEP_MAX_TURNS"]
LOG_DIR = os.environ["SWEEP_LOG_DIR"]


def spawn_log_path(pr, rnd):
    """One file per PR per round: the route, not only the verdict."""
    return os.path.join(LOG_DIR, f"pr-{pr}-round-{rnd}.log")


def spawn(prompt, log_path):
    """Run a spawned session with the declared policy, streaming to its log.

    Returns the exit code. Every knob the session runs under is named at the
    call rather than inherited: the model (never the operator's interactive
    default), a turn cap, and a route capture. `--verbose --output-format
    stream-json` is what makes the log a ROUTE — the per-turn record — instead
    of the final message, which is all the trigger log ever held.

    The log is opened before the process starts and the command line is written
    into it first, so a spawn that dies immediately still leaves a file saying
    what was attempted. A log that only appears on success cannot explain a
    failure, which is the one occasion anybody opens it.
    """
    os.makedirs(LOG_DIR, exist_ok=True)
    cmd = ["claude", "-p", prompt,
           "--model", MODEL,
           "--max-turns", str(MAX_TURNS),
           "--verbose", "--output-format", "stream-json"]
    with open(log_path, "a", encoding="utf-8") as log:
        log.write(f"=== spawn: {' '.join(cmd)}\n")
        log.flush()
        return subprocess.run(cmd, stdout=log, stderr=subprocess.STDOUT,
                              check=False).returncode


def segments(bodies):
    """Same segmentation the presence check uses: a report line opens a
    segment holding the findings under it. Duplicated deliberately rather
    than imported — this is a standalone tool, and a shared module would make
    the check depend on a file the CI runner has no reason to execute."""
    segs, cur = [], None
    for line in (bodies or '').splitlines():
        r = REPORT.match(line)
        if r:
            cur = {'sha': r.group(1), 'findings': []}
            segs.append(cur)
            continue
        f = FINDING.match(line)
        if f and cur is not None:
            cur['findings'].append((f.group(1), f.group(2)))
    return segs


def decide(bodies, head):
    """The sweep's whole state machine, as a pure function.

    Returns one of:
      spawn-round-N  — no report for this head and rounds remain
      park           — no report for this head and the rounds are spent
      author-owes    — a report for this head carries open blocking findings;
                       the ball is with the author, so spawning again would
                       re-review code nobody has changed
      done           — a report for this head with nothing blocking open
    """
    segs = segments(bodies)
    current = [s for s in segs
               if head and (head.startswith(s['sha']) or s['sha'].startswith(head))]
    if current:
        blocking = [1 for s in current for sev, st in s['findings']
                    if sev == 'blocking' and st == 'open']
        return 'author-owes' if blocking else 'done'
    rounds_done = len(segs)
    if rounds_done >= MAX_ROUNDS:
        return 'park'
    return f'spawn-round-{rounds_done + 1}'


# --- fixture pass: the state machine, exercised without a network ---------
H = 'abc1234def'
FIX = [
    ("no report at all -> round 1", "", H, 'spawn-round-1'),
    ("one stale report -> round 2",
     "review-lane report: 9999999\nfinding: blocking open  x", H,
     'spawn-round-2'),
    ("two stale reports -> park, never a third round",
     "review-lane report: 9999999\nreview-lane report: 8888888", H, 'park'),
    ("current report, nothing blocking -> done",
     f"review-lane report: {H}\nfinding: should open  x", H, 'done'),
    ("current report with open blocking -> the author owes, not a respawn",
     f"review-lane report: {H}\nfinding: blocking open  x", H, 'author-owes'),
    ("current report whose blocking is resolved -> done",
     f"review-lane report: {H}\nfinding: blocking resolved  x", H, 'done'),
    ("a stale segment's open blocking does not bind the current head",
     f"review-lane report: 9999999\nfinding: blocking open  old\n"
     f"review-lane report: {H}\nfinding: nit open  y", H, 'done'),
]
bad = [f"{n}: got {decide(b, h)!r}, want {w!r}"
       for n, b, h, w in FIX if decide(b, h) != w]
if bad:
    print("FAIL fixture pass — the sweep's state machine does not discriminate:")
    for b in bad:
        print(f"  {b}")
    sys.exit(1)
print(f"fixture pass: {len(FIX)}/{len(FIX)} state-machine cases "
      "(round 1 / round 2 / park / done / author-owes / stale-segment)")

mode = os.environ["SWEEP_MODE"]
owner = os.environ["SWEEP_OWNER"]
limit = int(os.environ["SWEEP_LIMIT"])
prs = json.loads(os.environ["SWEEP_PRS"])
if not prs:
    print("no open pull requests — nothing to sweep")
    sys.exit(0)

# Eligibility honors pipeline.json's optional allowlist beside the owner —
# the same two sources the merge-eligibility contract names, in the same
# precedence, so this file copies the rule's SOURCES rather than its value.
allowed = {owner}
try:
    with open(".claude/pipeline.json") as f:
        allowed.update(json.load(f).get("merge_author_allowlist", []))
except (FileNotFoundError, json.JSONDecodeError):
    pass

if len(prs) == limit:
    print(f"NOTE: the listing returned exactly {limit} PRs — the page may be "
          "full and later PRs unswept. A bounded sweep names what it may "
          "have dropped (PR #46 review, round 1).")

counts = {}
spawn_failures = 0
for pr in prs:
    n, head = pr["number"], pr["headRefOid"]
    # An external PR is never spawned against: the frontier is COMPOSED rather
    # than filtered, and this lane's whole authority over one is to report it.
    if pr["isCrossRepository"] or pr["author"]["login"] not in allowed:
        print(f"  #{n}: external — reported, never acted on")
        counts['external'] = counts.get('external', 0) + 1
        continue
    try:
        bodies = subprocess.run(
            ["gh", "pr", "view", str(n), "--json", "comments",
             "-q", ".comments[].body"],
            capture_output=True, text=True, check=True).stdout
    except subprocess.CalledProcessError:
        print(f"  #{n}: FAIL could not read comments — not treated as 'no report'")
        counts['unestablished'] = counts.get('unestablished', 0) + 1
        continue
    state = decide(bodies, head)
    counts[state.split('-round-')[0]] = counts.get(state.split('-round-')[0], 0) + 1
    if state == 'done':
        print(f"  #{n}: reviewed at {head[:7]}, nothing blocking open")
    elif state == 'author-owes':
        print(f"  #{n}: open blocking findings at {head[:7]} — the author owes "
              "a fix; not re-reviewing unchanged code")
    elif state == 'park':
        print(f"  #{n}: PARKED — {MAX_ROUNDS} rounds spent and {head[:7]} is "
              "still unreviewed. §4 clause 3: this is an owner decision, "
              "never a third round.")
    else:
        rnd = state.rsplit('-', 1)[1]
        if mode == 'spawn':
            log_path = spawn_log_path(n, rnd)
            print(f"  #{n}: spawning review round {rnd} for {head[:7]} "
                  f"[model {MODEL}, max-turns {MAX_TURNS}] -> {log_path}")
            # A failed spawn is a FAILURE, reported and reflected in the exit
            # code — a sweep that prints "spawning" over a dead binary is the
            # exact fail-open its own substrate check refuses, one level down
            # (PR #46 review, round 1). check=False + inspection rather than
            # check=True: one PR's failed spawn must not abort the sweep of
            # the rest.
            result = spawn(f"/review-lane {n}", log_path)
            if result != 0:
                print(f"  #{n}: FAIL spawn exited {result} — no review was "
                      "produced; this is not 'spawned', and the sweep will "
                      f"exit nonzero. Route: {log_path}")
                print(f"  #{n}: if the turn cap ({MAX_TURNS}) was reached, the "
                      "PR is deliberately left report-less — the presence gate "
                      "is the loud backstop, and a partial report is never "
                      "fabricated to make this quiet.")
                spawn_failures += 1
                counts['spawn-failed'] = counts.get('spawn-failed', 0) + 1
        else:
            # The dry run names the policy it WOULD spawn under. A preview that
            # withheld the model and the cap would leave the operator checking
            # the one thing a dry run exists to show them by reading the source.
            print(f"  #{n}: would spawn review round {rnd} for {head[:7]} "
                  f"[model {MODEL}, max-turns {MAX_TURNS}] -> "
                  f"{spawn_log_path(n, rnd)} (--dry-run; pass --spawn to act)")

print(f"swept {len(prs)} open PR(s): "
      + ", ".join(f"{k} {v}" for k, v in sorted(counts.items())))
if mode != 'spawn':
    print("dry run — nothing was spawned. Spawning is an outward act and is "
          "opt-in rather than a flag someone forgets is on.")
if spawn_failures:
    sys.exit(1)
PYEOF
