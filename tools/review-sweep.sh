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
#   fix model  sonnet · $KOGAKI_FIX_MODEL        — transcribing findings
#                                                  already made, not making
#                                                  them
#   max turns  60    · $KOGAKI_REVIEW_MAX_TURNS  — a cap is architecture, not
#                                                  prompt hygiene
#   log dir    ~/.kogaki/reviews · $KOGAKI_REVIEW_LOG_DIR
#   grants     per role, below   · $KOGAKI_REVIEW_TOOLS / $KOGAKI_FIX_TOOLS
#
# GRANTS ARE THE FOURTH DECLARATION (kogaki#65), and they are the one whose
# absence made every other declaration moot: a headless session has nobody to
# answer a permission request, so an ungranted tool is not a prompt but a
# stall. Both held-run reviewers ran to completion having done nothing, each
# blocked at its first tool.
#
# The grant list is an ENUMERATION, so tool N+1 is uncovered by default — and
# the served surface is explicit that this is only safe when the non-member
# case is observable rather than silent: "that same enumerability is why an
# unlisted repo fails silently in both directions ... Both failures present as
# NOTHING HAPPENING" (consulted: product-lab@ed47fbd3
# topics/knowledge-architecture.md:44). The artifact verification below is
# therefore not an independent improvement but THIS list's non-member
# fallback: a denied tool becomes a PR comment naming it. Ship the grants
# without that and the stall simply moves to the first unlisted tool, wearing
# the same silence.
#
# `mcp__tsurezure__*` is enumerated rather than wildcarded because wildcard
# support at that prefix is unverified; enumerating is the conservative form
# and each addition to the served surface owes an edit here, which the
# fallback above is what makes survivable.
#
# EVERY PATTERN HERE WAS EXERCISED, NOT INFERRED — and it took two rounds to get
# right, both failures worth recording because they are opposite errors.
#
# Round 1 shipped a DEAD grant. `Bash(bash checks/:*)` looks obviously correct
# and is DENIED: a trailing path fragment is not a prefix the matcher accepts,
# so the reviewer could not run a single check; and because the receipt report
# has exactly two admissible sources — the check itself, or `gh run view` — and
# the second was ungranted too, BOTH paths were closed and dimension 2 was
# forced to cannot-determine.
#
# Round 2's repair was WORSE, and is the more instructive failure.
# `Bash(bash:*)` is not a narrower grant, it is a GENERAL SHELL: `bash -c
# "<anything>"` matches it, so the list bounded nothing at all — including the
# `git push` a reviewer is forbidden. The reviewer reproduced it by running
# python3 through `bash -c`. Round 1's finding was that an enumeration had an
# uncovered member; the repair DISSOLVED the enumeration rather than completing
# it, which trades a coverage gap for an unbounded grant and is a strictly worse
# object.
#
# So the per-check patterns are DERIVED FROM THE REGISTRY rather than typed
# here. That is what answers the N+1 objection without dissolving anything: the
# check registry is already the enumeration governing which checks exist
# (`specs/SPEC.md` §4 — "the suite runs only registered checks"), so a newly
# registered check is granted BY CONSTRUCTION and an unregistered file is
# ungranted for the same reason it is unrunnable. One enumeration, one owner,
# no second list to drift.
#
# Verified headless, one command per pattern shape:
#   Bash(bash checks/:*)                   DENIED   (round 1's dead grant)
#   Bash(bash checks/check-x.sh:*)         ALLOWED  (the per-check form used)
#   Bash(bash checks/check-x.sh)           DENIED   (the wildcard is required)
#   Bash(git log:*) / Bash(gh run:*)       ALLOWED
#
# The cap is the half with a served position behind it: "an agent system that
# lets one instruction spawn unbounded parallel work is missing a budget
# mechanism; caps are architecture (config + gates), not prompt hygiene"
# (consulted: product-lab@ed47fbd3 LESSONS.md:135). It lives in the spawn
# invocation for that reason — a limit written into the reviewer's prompt is
# the thing that line refuses.
#
# THE SWEEP IS ALSO THE RALLY DRIVER (kogaki#53). The chain used to be: PR
# created → reviewer spawned → report lands → author-owes → *waits for someone
# to notice*. Everything either side of that arrow was event-driven and the fix
# act alone was not. This tool already holds the `author-owes` verdict at the
# moment it arises, so it spawns the FIX there and stops: the fix session's own
# `git push` fires the same hook, which starts round 2 through the same state
# machine. No new trigger machinery, and ship-cycle is untouched.
#
# TWO SESSIONS PER ROUND, NEVER ONE. The reviewer never fixes and the fixer
# never reviews — the control-arm split is preserved BY CONSTRUCTION rather
# than by asking one session to wear two hats, which is what makes the
# bootstrap-era owner waivers (PRs #44/#46/#49, reviewer-fixes) unnecessary
# rather than normal. The fixer is told in its prompt never to post a
# `review-lane report:` comment: it runs as the owner, so after kogaki#56's
# trusted-author filter its report WOULD count, and that is exactly why the
# prohibition is explicit rather than assumed.
#
# THE CAP BINDS THE DRIVER, NOT ONLY THE REVIEWER. With the rounds spent and
# findings still open, no fix is spawned at all: the next state is `park` by
# construction, so a fix landing then could never be reviewed, and spawning it
# would produce unreviewed work and call it progress. §4 clause 3 keeps `park`
# an owner decision.
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
RECENT=0
while [ $# -gt 0 ]; do
  case "$1" in
    --spawn) MODE="spawn" ;;
    --dry-run) MODE="dry-run" ;;
    # --recent is an ALIAS for the bare form, and says so (kogaki#68). It adds
    # no behaviour: the bare invocation already lists every open PR and returns
    # spawn-round-N through decide() for any whose current head carries no
    # report, which is exactly what the reconciliation pass is described as
    # doing. The flag exists for DISCOVERABILITY — an operator looking for a
    # reconciliation pass searches for a name, not for the absence of flags —
    # and naming it is deliberately NOT claiming new coverage.
    --recent) MODE="spawn"; RECENT=1 ;;
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
      echo "usage: tools/review-sweep.sh [--dry-run|--spawn|--recent] [--pr N | --branch NAME]"
      echo
      echo "Fired by the project hook at gh pr create / git push (kogaki#47);"
      echo "run it bare for a manual reconciliation pass over all open PRs."
      echo
      echo "--recent is an ALIAS for that bare form with --spawn. It is a NAME"
      echo "for behaviour that already existed, not new coverage (kogaki#68)."
      echo
      echo "THE RECONCILIATION PASS HAS NO AUTOMATIC CALLER, and that is the"
      echo "open half of kogaki#68 rather than an omission here. The hook fires"
      echo "this tool single-target only (--pr / --branch), so a PR whose"
      echo "creation event was missed is caught by the presence gate at merge"
      echo "time and not before. The caller kogaki#65 named is \"the lane calls"
      echo "at close\" — that lane is /ship-cycle, which lives in claude-toolkit"
      echo "and is escalated there; a caller here would have to be a periodic"
      echo "reader, which the trigger ruling refuses."
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
FIX_MODEL="${KOGAKI_FIX_MODEL:-sonnet}"
REVIEW_LOG_DIR="${KOGAKI_REVIEW_LOG_DIR:-$HOME/.kogaki/reviews}"

# The reviewer reads the PR, runs the registered checks, consults the served
# seam, and posts its report. `gh pr comment` is granted HERE and withheld
# from the fixer below — that asymmetry is the presence gate's, not a
# preference. Never --dangerously-skip-permissions: this repository is public
# and the user-level merge deny must stay meaningful.
# One grant per REGISTERED check, derived rather than typed — see the header.
# A registry that cannot be read yields no check grants at all, which fails
# toward the narrow side: the reviewer reports cannot-determine (loudly, via
# the denial comment) instead of silently receiving a wider grant than intended.
CHECK_TOOLS="$(python3 - <<'GRANTS' 2>/dev/null || true
import json
try:
    reg = json.load(open("checks/registry.json"))
except Exception:
    raise SystemExit(0)
print(",".join(f"Bash(bash checks/{c['file']}:*)" for c in reg.get("checks", [])))
GRANTS
)"

REVIEW_TOOLS="${KOGAKI_REVIEW_TOOLS:-\
Bash(gh pr view:*),Bash(gh pr diff:*),Bash(gh pr checks:*),Bash(gh pr list:*),\
Bash(gh issue view:*),Bash(gh issue comment:*),Bash(gh pr comment:*),Bash(gh run:*),\
${CHECK_TOOLS:+$CHECK_TOOLS,}\
Bash(git log:*),Bash(git diff:*),Bash(git show:*),Read,Grep,Glob,\
mcp__tsurezure__policy_lookup,mcp__tsurezure__gloss_index,\
mcp__tsurezure__glossary_entry,mcp__tsurezure__topic_thread,\
mcp__tsurezure__element_survey,mcp__tsurezure__surface_names,\
mcp__tsurezure__lessons_index}"

# The fixer edits, commits and pushes. It gets NO `gh pr comment`: it is
# barred from posting reports, and since kogaki#56 counted reports by trusted
# author, a comment from it would be counted rather than merely wrong.
# The round-1 repair reached REVIEW_TOOLS only and left the SAME dead pattern
# here (PR #67 review, round 2) — so the fixer edited, committed and pushed
# while unable to run a single check, which is the worse half of the two: the
# reviewer merely could not verify, the fixer could not verify its own writes.
# A fix applied at one of two call sites is the shape this file keeps finding.
FIX_TOOLS="${KOGAKI_FIX_TOOLS:-\
Bash(gh pr view:*),Bash(gh pr diff:*),Bash(git add:*),Bash(git commit:*),\
Bash(git push:*),Bash(git status:*),Bash(git diff:*),Bash(git log:*),\
${CHECK_TOOLS:+$CHECK_TOOLS,}\
Read,Grep,Glob,Edit,Write}"

SWEEP_PRS="$prs" SWEEP_MODE="$MODE" SWEEP_OWNER="$OWNER" SWEEP_LIMIT="$LIMIT" \
SWEEP_MODEL="$REVIEW_MODEL" SWEEP_MAX_TURNS="$REVIEW_MAX_TURNS" \
SWEEP_FIX_MODEL="$FIX_MODEL" \
SWEEP_REVIEW_TOOLS="$REVIEW_TOOLS" SWEEP_FIX_TOOLS="$FIX_TOOLS" \
SWEEP_LOG_DIR="$REVIEW_LOG_DIR" \
python3 <<'PYEOF'
import json, os, re, subprocess, sys

REPORT = re.compile(r'^\s*review-lane report:\s*([0-9a-f]{7,40})\s*$', re.M)
FINDING = re.compile(
    r'^\s*finding:\s*(blocking|should|nit)\s+(open|resolved)\b'
    r'(?P<just>\s*\[(?:policy|harm):[^\]]+\])?', re.M)
MAX_ROUNDS = 2   # §4 clause 3: two rounds, then a parked owner decision.

# Spawned-session policy, resolved in the shell above and passed in rather than
# re-defaulted here — two places that both know a default is two places that
# can disagree about it (kogaki#52).
MODEL = os.environ["SWEEP_MODEL"]
MAX_TURNS = os.environ["SWEEP_MAX_TURNS"]
LOG_DIR = os.environ["SWEEP_LOG_DIR"]
# The fixer's model is its OWN knob (kogaki#53). The override MECHANISM is
# shared with the reviewer's; the variable is not, because one variable cannot
# carry two different defaults, and review is judgment work while a fix is
# transcription of findings already made.
FIX_MODEL = os.environ["SWEEP_FIX_MODEL"]
REVIEW_TOOLS = os.environ["SWEEP_REVIEW_TOOLS"]
FIX_TOOLS = os.environ["SWEEP_FIX_TOOLS"]

# The headless contract, appended to every spawn prompt (kogaki#65 defect 2).
# Both held-run reviewers ENDED THEIR TURN AWAITING A REPLY — the served
# surface names exactly that as the property worth binding on: "What would
# bind is a property of the ACT — a turn ended awaiting a reply"
# (consulted: product-lab@ed47fbd3 topics/claude-code-ops.md:56). A spawned
# session cannot know it is unattended unless it is told, so it is told.
HEADLESS = (
    "\n\nYou are running UNATTENDED, spawned by a tool. No human will read "
    "your questions or answer them. Never ask a clarifying question: decide "
    "from what you can read, act, and post your artifact. If you genuinely "
    "cannot proceed, exit without posting rather than asking — the sweep "
    "detects a missing artifact and reports it."
)


def spawn_log_path(pr, rnd):
    """One file per PR per round: the route, not only the verdict."""
    return os.path.join(LOG_DIR, f"pr-{pr}-round-{rnd}.log")


def fix_log_path(pr, rnd):
    """The fixer's route, kept beside the reviewer's and never merged with it.

    Two spawned sessions per round, so two files: reading a rally afterwards
    means telling who did what, and one interleaved log cannot answer that.
    """
    return os.path.join(LOG_DIR, f"pr-{pr}-fix-{rnd}.log")


def rounds_used(bodies):
    """How many review rounds this PR has already spent."""
    return len(segments(bodies))


FIX_PROMPT = (
    "Resolve the open blocking findings on pull request #{n} in this "
    "repository.\n\n"
    "Read the review-lane report comments on the PR, address every finding "
    "declared `blocking` and still `open`, then commit and push to the PR's "
    "branch. Pushing is the whole of your job — it fires the review trigger, "
    "which starts the next review round.\n\n"
    "Boundaries you must not cross:\n"
    "- Do NOT post a `review-lane report:` comment. You are the fixer, not "
    "the reviewer; a report from you would spoof the presence gate.\n"
    "- Do NOT merge the pull request, and do NOT close its issue.\n"
    "- Do NOT resolve findings by weakening or deleting the check that "
    "raised them.\n"
    "- Address only the blocking findings. `should` and `nit` are the "
    "author's judgment to weigh, not yours to sweep up."
)


def spawn(prompt, log_path, model=None, tools=None):
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
    cmd = ["claude", "-p", prompt + HEADLESS,
           "--model", model or MODEL,
           "--max-turns", str(MAX_TURNS),
           "--allowedTools", tools or REVIEW_TOOLS,
           "--verbose", "--output-format", "stream-json"]
    with open(log_path, "a", encoding="utf-8") as log:
        log.write(f"=== spawn: {' '.join(cmd)}\n")
        log.flush()
        # stdin=DEVNULL closes the contamination class (kogaki#65 defect 2).
        # The held run's reviewers reported, verbatim, that their arguments
        # carried "a full paste of the review-sweep driver source" — this
        # file's own python heredoc, reaching the child through an inherited
        # descriptor. Closing stdin eliminates it regardless of WHICH
        # descriptor carried it, which is why it is the fix rather than
        # tracking down the specific fd: a per-source suppression would leave
        # source N+1 live.
        return subprocess.run(cmd, stdin=subprocess.DEVNULL,
                              stdout=log, stderr=subprocess.STDOUT,
                              check=False).returncode


def denied_tools(log_path):
    """The tools a spawned session was refused, read from its own route log.

    Primary capture, parsed rather than remembered: `permission_denials`
    entries carry the tool name and its input. Returns a de-duplicated,
    ordered list of short labels — a comment naming forty variations of one
    denial is a comment nobody finishes reading.
    """
    try:
        with open(log_path, encoding="utf-8", errors="replace") as f:
            raw = f.read()
    except OSError:
        return []
    labels = []
    for blob in re.findall(r'"permission_denials":\s*\[(.*?)\]\s*[,}]', raw, re.S):
        # Each denial is scanned from its own `tool_name` up to the NEXT one,
        # so a `command` is attributed to the entry it belongs to. The first
        # form of this — a lazy `.*?` followed by an OPTIONAL command group —
        # could never populate the command: an optional group after a lazy
        # quantifier matches empty at the first position tried, so every label
        # collapsed to the bare tool name and the stall comment said `Bash`
        # where the operator needed `Bash(gh pr view ...)` (PR #67 review).
        for entry in re.findall(
                r'"tool_name":\s*"([^"]*)"((?:(?!"tool_name").)*)', blob, re.S):
            name, rest = entry
            cmd = re.search(r'"command":\s*"([^"]*)"', rest)
            if cmd:
                # First three words: enough to name the act, short enough that
                # a comment listing several denials stays readable.
                label = f"{name}({' '.join(cmd.group(1).split()[:3])})"
            else:
                label = name
            if label and label not in labels:
                labels.append(label)
    return labels


def report_present(pr, head, allowed):
    """Did a trusted author leave a report for THIS head? The artifact test.

    Exit 0 is not a report (kogaki#65 defect 3). Both held-run spawns
    "succeeded" and produced nothing, and the failure surfaced only at the
    presence gate with its reason buried in a log nobody watches. The sweep
    now asks the same question the gate asks, at the moment it can still say
    something useful about it.
    """
    try:
        raw = subprocess.run(
            ["gh", "pr", "view", str(pr), "--json", "comments"],
            capture_output=True, text=True, check=True).stdout
        bodies = "\n".join(
            (c.get("body") or "") for c in json.loads(raw).get("comments", [])
            if ((c.get("author") or {}).get("login") or "") in allowed)
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        return None          # cannot-determine, never "absent"
    return any(head.startswith(s['sha']) or s['sha'].startswith(head)
               for s in segments(bodies))


def post_stall_comment(pr, head, log_path, reason, denials):
    """Say on the PR why no review arrived (kogaki#65 defects 1 and 3).

    DELIBERATELY NOT in `review-lane report:` form — it must never satisfy
    the presence token it is explaining the absence of. This is the
    non-member fallback for the grant enumeration above: a tool outside
    REVIEW_TOOLS is refused, and this is what makes the refusal legible
    instead of silent.
    """
    lines = [f"**review-lane spawn produced no report** for `{head[:7]}` — {reason}.",
             "",
             "This is not a review and deliberately does not carry the "
             "presence token; the gate stays red, correctly.", ""]
    if denials:
        lines.append("Tools the spawned session was denied:")
        lines += [f"- `{d}`" for d in denials]
        lines.append("")
        lines.append("Each is a grant the sweep must declare "
                     "(`KOGAKI_REVIEW_TOOLS`, kogaki#65).")
    else:
        lines.append("No permission denials were recorded, so the cause is "
                     "elsewhere — the turn cap, or a session that ended "
                     "without posting.")
    lines += ["", f"Route log: `{log_path}`"]
    try:
        subprocess.run(["gh", "pr", "comment", str(pr), "--body", "\n".join(lines)],
                       stdin=subprocess.DEVNULL, capture_output=True, check=True)
        return True
    except subprocess.CalledProcessError:
        return False


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
            cur['findings'].append((f.group(1), f.group(2), bool(f.group('just'))))
    return segs


def decide(bodies, head):
    """The sweep's whole state machine, as a pure function.

    Returns one of:
      spawn-round-N  — no report for this head and rounds remain
      park           — no report for this head and the rounds are spent
      author-owes    — a report for this head carries open blocking findings.
                       The ball is with the author, and since kogaki#53 the
                       driver spawns the FIX here rather than waiting for a
                       session to notice. What it still never does is spawn a
                       REVIEW here — that would re-read code nobody has
                       changed since the report that judged it
      done           — a report for this head with nothing blocking open
    """
    segs = segments(bodies)
    current = [s for s in segs
               if head and (head.startswith(s['sha']) or s['sha'].startswith(head))]
    if current:
        # Only a JUSTIFIED blocking gates (kogaki#72): an unjustified one
        # fails toward merge as a should — same rule as the presence check.
        blocking = [1 for s in current for sev, st, just in s['findings']
                    if sev == 'blocking' and st == 'open' and just]
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
     f"review-lane report: {H}\nfinding: blocking open [harm: x]  x", H, 'author-owes'),
    ("an UNJUSTIFIED blocking does not hold the PR (kogaki#72) -> done",
     f"review-lane report: {H}\nfinding: blocking open  x", H, 'done'),
    ("current report whose blocking is resolved -> done",
     f"review-lane report: {H}\nfinding: blocking resolved  x", H, 'done'),
    ("a stale segment's open blocking does not bind the current head",
     f"review-lane report: 9999999\nfinding: blocking open  old\n"
     f"review-lane report: {H}\nfinding: nit open  y", H, 'done'),
]
bad = [f"{n}: got {decide(b, h)!r}, want {w!r}"
       for n, b, h, w in FIX if decide(b, h) != w]

# --- the driver's own decision (kogaki#53) --------------------------------
# `decide` says WHAT the state is; this says whether a FIX is spawned for it.
# The cap is the clause worth exercising: with the rounds spent, an
# author-owes must NOT spawn a fix, because the fix could never be reviewed.
# Untested, that branch is where a runaway rally would live.


def drives_fix(bodies, head):
    return decide(bodies, head) == 'author-owes' and rounds_used(bodies) < MAX_ROUNDS


DRIVE = [
    ("round 1 justified blocking -> spawn the fix",
     f"review-lane report: {H}\nfinding: blocking open [harm: x]  x", H, True),
    ("unjustified blocking -> NO fix (kogaki#72: it does not gate)",
     f"review-lane report: {H}\nfinding: blocking open  x", H, False),
    ("nothing blocking -> no fix",
     f"review-lane report: {H}\nfinding: should open  x", H, False),
    ("no report at all -> no fix (that is a review round, not a fix)",
     "", H, False),
    ("rounds spent AND blocking still open -> no fix, the cap binds the driver",
     f"review-lane report: 9999999\nreview-lane report: {H}\n"
     f"finding: blocking open [harm: x]  x", H, False),
    ("a stale segment's blocking does not summon a fix for this head",
     f"review-lane report: 9999999\nfinding: blocking open  old\n"
     f"review-lane report: {H}\nfinding: nit open  y", H, False),
]
bad += [f"{n}: drives_fix -> {drives_fix(b, h)}, want {w}"
        for n, b, h, w in DRIVE if drives_fix(b, h) != w]
if bad:
    print("FAIL fixture pass — the sweep's state machine does not discriminate:")
    for b in bad:
        print(f"  {b}")
    sys.exit(1)
print(f"fixture pass: {len(FIX)}/{len(FIX)} state-machine cases "
      "(round 1 / round 2 / park / done / author-owes / stale-segment)")
print(f"driver pass: {len(DRIVE)}/{len(DRIVE)} fix-spawn cases "
      "(spawn on blocking / no fix without blocking / no fix without a report "
      "/ CAP BINDS with rounds spent / stale blocking summons nothing)")

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
        raw = subprocess.run(
            ["gh", "pr", "view", str(n), "--json", "comments"],
            capture_output=True, text=True, check=True).stdout
        # Trusted authors only (kogaki#56): an author-blind parse would let a
        # fork-PR commenter spoof a report into the state machine, or hold a
        # PR at author-owes with a foreign `blocking open`. Same `allowed`
        # set the eligibility test above already computes.
        bodies = "\n".join(
            (c.get("body") or "") for c in json.loads(raw).get("comments", [])
            if ((c.get("author") or {}).get("login") or "") in allowed)
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        print(f"  #{n}: FAIL could not read comments — not treated as 'no report'")
        counts['unestablished'] = counts.get('unestablished', 0) + 1
        continue
    state = decide(bodies, head)
    counts[state.split('-round-')[0]] = counts.get(state.split('-round-')[0], 0) + 1
    if state == 'done':
        print(f"  #{n}: reviewed at {head[:7]}, nothing blocking open")
    elif state == 'author-owes':
        # THE RALLY DRIVES ITSELF FROM HERE (kogaki#53). Everything either side
        # of this point was already event-driven; the fix act alone waited for
        # a session to happen to notice. The sweep holds the verdict at the
        # moment it arises, so the fix is spawned here — and then STOPS: the
        # fix session's own `git push` fires the existing hook, which starts
        # round 2 through the same state machine. No new trigger machinery.
        used = rounds_used(bodies)
        print(f"  #{n}: open blocking findings at {head[:7]} — the author owes "
              f"a fix; not re-reviewing unchanged code ({used}/{MAX_ROUNDS} "
              "rounds used)")
        if used >= MAX_ROUNDS:
            # The driver never spawns past the cap. A fix landing now could not
            # be reviewed — the next state is `park` by construction — so
            # spawning one would produce unreviewed work and call it progress.
            print(f"  #{n}: PARKED — {MAX_ROUNDS} rounds spent with findings "
                  "still open. §4 clause 3: this is an owner decision, and the "
                  "driver does not spawn a fix it cannot get reviewed.")
            # Every park is a measured pipeline defect (kogaki#72): the
            # postmortem stub rides the PR where the park is announced.
            r = subprocess.run(["gh", "pr", "comment", str(n), "--body",
                            f"park-postmortem: {MAX_ROUNDS} rounds spent, "
                            f"justified blocking findings still open at {head[:7]} "
                            "— class: unresolved-blocking. A park is a pipeline "
                            "defect measured against the 1-in-100 budget "
                            "(kogaki#72); owner decision owed."], check=False)
            if r.returncode != 0:
                print(f"  #{n}: FAIL park-postmortem post exited {r.returncode} "
                      "— the park stands but its stub did not reach the PR; "
                      "posting it by hand is owed (PR #73 review, round 1).")
                spawn_failures += 1
            counts['park'] = counts.get('park', 0) + 1
        elif mode == 'spawn':
            # Numbered by the round whose findings it answers, not by the round
            # its push will start: `pr-N-round-1.log` and `pr-N-fix-1.log` are
            # then the two halves of one exchange, which is how a rally is read
            # afterwards. Numbering it by the round it causes would pair each
            # fix with the review it has not provoked yet.
            log_path = fix_log_path(n, used)
            print(f"  #{n}: spawning FIX for round {used}'s findings "
                  f"[model {FIX_MODEL}, max-turns {MAX_TURNS}] -> {log_path}")
            result = spawn(FIX_PROMPT.format(n=n), log_path, model=FIX_MODEL,
                           tools=FIX_TOOLS)
            if result != 0:
                print(f"  #{n}: FAIL fix spawn exited {result} — the findings "
                      "are still open and no push happened, so no round was "
                      f"started. Route: {log_path}")
                spawn_failures += 1
                counts['fix-failed'] = counts.get('fix-failed', 0) + 1
            else:
                counts['fix-spawned'] = counts.get('fix-spawned', 0) + 1
        else:
            print(f"  #{n}: would spawn FIX for round {used}'s findings "
                  f"[model {FIX_MODEL}, max-turns {MAX_TURNS}, "
                  f"{len(FIX_TOOLS.split(','))} granted tools] -> "
                  f"{fix_log_path(n, used)} (--dry-run; pass --spawn to act)")
    elif state == 'park':
        print(f"  #{n}: PARKED — {MAX_ROUNDS} rounds spent and {head[:7]} is "
              "still unreviewed. §4 clause 3: this is an owner decision, "
              "never a third round.")
        r = subprocess.run(["gh", "pr", "comment", str(n), "--body",
                        f"park-postmortem: {MAX_ROUNDS} rounds spent and {head[:7]} "
                        "is still unreviewed — class: unreviewed-head (a push "
                        "landed after the final round). A park is a pipeline "
                        "defect measured against the 1-in-100 budget (kogaki#72); "
                        "owner decision owed."], check=False)
        if r.returncode != 0:
            print(f"  #{n}: FAIL park-postmortem post exited {r.returncode} "
                  "— the park stands but its stub did not reach the PR; "
                  "posting it by hand is owed (PR #73 review, round 1).")
            spawn_failures += 1
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
            result = spawn(f"/review-lane {n}", log_path, tools=REVIEW_TOOLS)
            # THE EXIT CODE IS NOT THE VERDICT (kogaki#65 defect 3). A spawn
            # that exits 0 having posted nothing is a FAILURE, and the held
            # run is the specimen: both sessions "ran to completion", the
            # sweep counted them spawned, and the truth surfaced two layers
            # later at the presence gate. Ask the artifact question here.
            landed = report_present(n, head, allowed)
            if result != 0 or landed is False:
                reason = (f"the session exited {result}" if result != 0
                          else "the session exited 0 without posting a report")
                denials = denied_tools(log_path)
                print(f"  #{n}: FAIL {reason} — no review-lane report for "
                      f"{head[:7]}. Route: {log_path}")
                if denials:
                    print(f"  #{n}: denied tools: {', '.join(denials)}")
                if post_stall_comment(n, head, log_path, reason, denials):
                    print(f"  #{n}: posted the reason to the PR (not in report "
                          "form — it must never satisfy the presence token)")
                else:
                    print(f"  #{n}: could NOT post the reason to the PR; it "
                          "survives only in the route log")
                print(f"  #{n}: if the turn cap ({MAX_TURNS}) was reached, the "
                      "PR is deliberately left report-less — the presence gate "
                      "is the loud backstop, and a partial report is never "
                      "fabricated to make this quiet.")
                spawn_failures += 1
                counts['spawn-failed'] = counts.get('spawn-failed', 0) + 1
            elif landed is None:
                # Cannot-determine is not success. Saying so keeps the third
                # state distinct from the two it sits between.
                print(f"  #{n}: spawned, but the report could not be verified "
                      "(comment read failed) — not counted as reviewed")
                counts['unverified'] = counts.get('unverified', 0) + 1
            else:
                # A REPORT IS NOT PROOF THE REVIEW WAS UNDEGRADED (PR #67
                # review, round 1). The first form of this fallback fired only
                # on TOTAL artifact absence, so a session denied a tool that
                # worked around it and reported anyway left a GREEN GATE OVER A
                # SILENT HOLE — the exact shape the grant enumeration's
                # non-member fallback exists to prevent, surviving on the
                # partial-denial path because the trigger condition was
                # narrower than the failure class it was declared to cover.
                # The denial list is primary capture; report it whenever it is
                # non-empty, whatever else the session achieved.
                denials = denied_tools(log_path)
                if denials:
                    print(f"  #{n}: report landed, but the session was denied: "
                          f"{', '.join(denials)}")
                    post_stall_comment(
                        n, head, log_path,
                        "the report landed, but the session was denied tools "
                        "and the review may be degraded", denials)
                    counts['report-degraded'] = counts.get('report-degraded', 0) + 1
                else:
                    counts['report-landed'] = counts.get('report-landed', 0) + 1
        else:
            # The dry run names the policy it WOULD spawn under. A preview that
            # withheld the model and the cap would leave the operator checking
            # the one thing a dry run exists to show them by reading the source.
            print(f"  #{n}: would spawn review round {rnd} for {head[:7]} "
                  f"[model {MODEL}, max-turns {MAX_TURNS}, "
                  f"{len(REVIEW_TOOLS.split(','))} granted tools] -> "
                  f"{spawn_log_path(n, rnd)} (--dry-run; pass --spawn to act)")

print(f"swept {len(prs)} open PR(s): "
      + ", ".join(f"{k} {v}" for k, v in sorted(counts.items())))
if mode != 'spawn':
    print("dry run — nothing was spawned. Spawning is an outward act and is "
          "opt-in rather than a flag someone forgets is on.")
if spawn_failures:
    sys.exit(1)
PYEOF
