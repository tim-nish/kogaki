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
# WHAT A SWEEP GIVES UP, AND WHY IT IS SAFE ANYWAY. A sweep can lose a race
# with a fast merge; PR-open invocation cannot. The race is closed elsewhere:
# story 1.12's presence check is a REQUIRED status check, so a PR with no
# report for its current head cannot merge. A late sweep is therefore late,
# never skipped — the failure mode is a delay, not an unreviewed merge.
#
# AND INSTALLATION IS MACHINE-LOCAL, WHICH MAKES IT ADVICE — said plainly,
# because "a rule whose only carrier is a document someone must read is
# advice" and believing otherwise is the defect. Nothing here installs a
# timer; see the README section this file's --help points at. What rescues it
# from being advice-with-no-consequence is the same presence check: if the
# sweep is never installed, PRs simply stop merging, which is loud rather
# than silent. That is the observable absence an obligation is owed.
#
# SPAWNING IS OPT-IN. --dry-run is the default: the sweep reports what it
# would do and mutates nothing. Spawning a session is an outward act, so it
# needs an explicit --spawn rather than a flag someone forgets is on.
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="dry-run"
LIMIT=50
for arg in "$@"; do
  case "$arg" in
    --spawn) MODE="spawn" ;;
    --dry-run) MODE="dry-run" ;;
    --help|-h)
      sed -n '2,42p' "$0" | sed 's/^# \{0,1\}//'
      echo
      echo "usage: tools/review-sweep.sh [--dry-run|--spawn]"
      echo
      echo "install (machine-local, never committed — see kogaki#9's rule):"
      echo "  a periodic timer on a machine whose gateway is registered, e.g."
      echo "  */15 * * * * cd <repo> && tools/review-sweep.sh --spawn"
      exit 0 ;;
    *) echo "unknown argument: $arg (try --help)" >&2; exit 2 ;;
  esac
done

if ! command -v gh >/dev/null 2>&1; then
  echo "FAIL could not establish the substrate: gh is not available." >&2
  echo "  Reported as a failure rather than as nothing-to-do: a sweep that" >&2
  echo "  exits quietly when its instrument is missing is indistinguishable" >&2
  echo "  from a sweep that ran and found no work." >&2
  exit 1
fi

if ! prs="$(gh pr list --state open --limit "$LIMIT" \
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

SWEEP_PRS="$prs" SWEEP_MODE="$MODE" SWEEP_OWNER="$OWNER" SWEEP_LIMIT="$LIMIT" \
python3 <<'PYEOF'
import json, os, re, subprocess, sys

REPORT = re.compile(r'^\s*review-lane report:\s*([0-9a-f]{7,40})\s*$', re.M)
FINDING = re.compile(
    r'^\s*finding:\s*(blocking|should|nit)\s+(open|resolved)\b', re.M)
MAX_ROUNDS = 2   # §4 clause 3: two rounds, then a parked owner decision.


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
            print(f"  #{n}: spawning review round {rnd} for {head[:7]}")
            # A failed spawn is a FAILURE, reported and reflected in the exit
            # code — a sweep that prints "spawning" over a dead binary is the
            # exact fail-open its own substrate check refuses, one level down
            # (PR #46 review, round 1). check=False + inspection rather than
            # check=True: one PR's failed spawn must not abort the sweep of
            # the rest.
            result = subprocess.run(["claude", "-p", f"/review-lane {n}"],
                                    check=False)
            if result.returncode != 0:
                print(f"  #{n}: FAIL spawn exited {result.returncode} — no "
                      "review was produced; this is not 'spawned', and the "
                      "sweep will exit nonzero.")
                spawn_failures += 1
                counts['spawn-failed'] = counts.get('spawn-failed', 0) + 1
        else:
            print(f"  #{n}: would spawn review round {rnd} for {head[:7]} "
                  "(--dry-run; pass --spawn to act)")

print(f"swept {len(prs)} open PR(s): "
      + ", ".join(f"{k} {v}" for k, v in sorted(counts.items())))
if mode != 'spawn':
    print("dry run — nothing was spawned. Spawning is an outward act and is "
          "opt-in rather than a flag someone forgets is on.")
if spawn_failures:
    sys.exit(1)
PYEOF
