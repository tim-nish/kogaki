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
#   model      TIERED · $KOGAKI_REVIEW_MODEL     — judgment work; a model
#                                                  choice for a spawned agent
#                                                  is operator policy. Since
#                                                  kogaki#81 the default is
#                                                  resolved from the DIFF (the
#                                                  tier table below); the env
#                                                  var is an explicit PIN that
#                                                  overrides the tier
#   fix model  sonnet · $KOGAKI_FIX_MODEL        — transcribing findings
#                                                  already made, not making
#                                                  them
#   max turns  TIERED · $KOGAKI_REVIEW_MAX_TURNS — a cap is architecture, not
#                                                  prompt hygiene; tiered with
#                                                  the model, pinned the same
#                                                  way
#   log dir    ~/.kogaki/reviews · $KOGAKI_REVIEW_LOG_DIR
#   grants     per role, below   · $KOGAKI_REVIEW_TOOLS / $KOGAKI_FIX_TOOLS
#   worktree   $TMPDIR (outside the repo) · $KOGAKI_SPAWN_WORKTREE_ROOT
#
# EVERY SPAWNED SESSION GETS A FRESH WORKTREE, OUTSIDE THE REPOSITORY
# (kogaki#61). Before this, `subprocess.run` passed no `cwd`, so every spawned
# session inherited whatever tree the sweep happened to run in — and this tool
# spawns two sessions per round CONCURRENTLY with the authoring session whose
# push fired the hook, one of which edits, commits and pushes. The specimen is
# an incident, not a hypothesis (owner-reported, 2026-08-05): two live sessions
# shared one working tree, one moved HEAD under the other mid-commit, and a
# kogaki#52 commit landed on the kogaki#56 branch and was pushed there. It was
# recovered without data loss, which is what "survivable" means and not what
# "impossible" means.
#
# The rule applied here is already ratified — /ship-cycle's execution-isolation
# clause: ONE ISOLATED WORKTREE PER ITEM IN FLIGHT, CREATED OUTSIDE THE
# REPOSITORY, OR SEQUENTIAL; THERE IS NO THIRD MODE. This file spawns, so it
# takes the first branch.
#
# THE ISOLATION IS SITED IN `spawn()`, NOT AT ITS CALL SITES. Both sessions
# reach the process through one helper, so siting it there covers spawn kind
# N+1 by construction; a per-call-site rule would be the enumeration-coverage
# shape one level down, which the served surface rules against — per-repo
# installation "makes coverage an ENUMERATION OF REPOS, so repo N+1 is
# uncovered by default and each new consumer silently re-opens the hole"
# (consulted: product-lab@ed47fbd3818b9a66954a558d6c88e86574407ece
# topics/claude-code-ops.md:54). This file has already shipped the fix-at-one-
# of-two-call-sites defect twice (the dead check grant, the park-postmortem
# dry-run guard); one helper is the answer to it.
#
# OUTSIDE IS LOAD-BEARING, and asserted rather than trusted: a worktree under
# the repo root is still inside the tree the authoring session's own tooling
# walks, so the created path is compared against the repository root and a
# path inside it REFUSES rather than degrades. The location itself is the
# system temp root — a sibling directory, a temp path and an operator-declared
# home were all admissible and no served position discriminates between them,
# so one is chosen, overridable, and NAMED IN THE ROUTE LOG (`=== worktree:`)
# beside the command line, which is what makes a leaked worktree findable from
# the record rather than by searching the filesystem.
#
# WHICH REF EACH WORKTREE HOLDS FOLLOWS THE ROLE, and the role is already
# ratified: the reviewer never pushes (§4 clause 2), so it gets a DETACHED
# worktree at the PR's head sha — structurally unable to advance a branch. The
# fixer must commit onto the PR's branch and push it, so it gets that BRANCH
# (`headRefName`, one more field on the `gh` read this file already makes —
# never a second API call), added with --force so a branch the authoring
# session also has checked out does not block the isolation.
#
# REMOVAL IS ON EVERY EXIT PATH — success, non-zero exit, exception — and a
# removal that FAILS is reported and reflected in the exit code, never
# swallowed. A silently leaked worktree is the failure mode that discipline
# exists to refuse, and it is the same one this file already applies to a
# failed spawn rather than printing success over it.
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
#
# THE REVIEWER IS TIERED TO WHAT IT IS REVIEWING (kogaki#81, kogaki#70 sink 4).
# The model and the cap used to be one pin for every subject, so a one-line fix
# inherited a ceiling built for a security rewrite. PR #67 was the RIGHT class
# for opus — it rewrote this pipeline's own security path — and that is the
# point: the defect was never the ceiling, it was that nothing distinguished.
# The mechanism is already shipped and already used (the fixer runs sonnet
# under $KOGAKI_FIX_MODEL), so this extends a pattern rather than adding one.
#
#   THE TIER TABLE LIVES HERE, beside the model pin, the turn cap and the
#   grant lists — decided, not deferred. A separate registry file would be a
#   FOURTH registry beside checks/, gates/ and deps/, and
#   specs/spec-external-deps/SPEC.md §2 requires a fourth to name a field the
#   existing carriers cannot hold. A tier is a spawn parameter and this file
#   already carries three of those, so there is no such field and no such
#   argument. Each half has an env override and is readable without running
#   anything, which is the property every other declaration here holds.
#
#   careful  spec/**, specs/**, checks/**, policy/**, .claude/hooks/**
#            -> opus,   60 turns   ($KOGAKI_REVIEW_TIER_CAREFUL_PATHS)
#   ordinary tools/**, docs/**, .claude/skills/**, .claude/*.json, *.md
#            -> sonnet, 24 turns   ($KOGAKI_REVIEW_TIER_ORDINARY_PATHS)
#   no match -> opus,   60 turns   — the FAIL-SAFE side, announced as such
#
# RESOLVED FROM THE DIFF'S PATHS, NEVER FROM THE BRANCH NAME. A PR on
# `direct/71-*` that edits `checks/registry.json` is cheap by branch and
# security-relevant by content; resolving on the branch would quietly downgrade
# exactly the reviews that most need the higher tier. The resolver is given
# paths and nothing else, so the branch cannot reach it by construction.
#
# THE NON-MEMBER CASE FALLS TO OPUS, and the asymmetry is the whole argument:
# a needlessly expensive review costs about $3, while a too-cheap review of an
# unclassified diff PASSES THE GATE SILENTLY — the failure the presence check
# cannot see. The served surface did not discriminate across two framings
# (kogaki#70 records both queries), so the decision rests on that asymmetry.
#
# AND THE FALLBACK IS ANNOUNCED ON BOTH PATHS — `--spawn` as well as
# `--dry-run`. The hook takes the `--spawn` path, so a fallback announced only
# in the preview fires INVISIBLY on the only path that runs in anger; an
# unobservable non-member fallback is the defect kogaki#65 was filed over
# ("both failures present as NOTHING HAPPENING"). Where the tier is reached by
# the fallback rather than by a declared class, the line says so in those words.
#
# THE REPORT IS COMPOSED ONCE AND POSTED ONCE (kogaki#81, kogaki#70 sink 5).
# PR #67's round 2 made FOUR consecutive `gh pr comment` attempts with the same
# body — blind retries, each a turn, each risking a duplicate report comment,
# and a second segment for one head changes what `decide()` counts as rounds.
# The reviewer is therefore told the posting contract in its prompt: compose in
# full, post in ONE act through `--body-file`, verify ONCE, and never re-post.
# The file half is expressed as `--body-file -` fed by a single heredoc because
# the reviewer holds no `Write` grant and this file does not widen the grant
# list (that is kogaki#74's held half) — one process, one comment either way,
# which is the property the four attempts violated.
#
# EVERY RUN REPORTS ITS COST. The report ends with
# `review-cost: <turns> turns · <min> · $<cost> · model <m>`, appended by the
# sweep to the report comment after the session ends. All four fields come from
# the `result` record in the stream-json this file ALREADY captures, so this is
# a rendering of held data rather than new instrumentation — and it is the
# sweep that renders it because a session cannot know its own final cost from
# inside the turn that posts. Tier tuning then has its data at the PR instead
# of owing another investigation.
#
# A REPORT DECLARES ITS SCOPE AND ITS COMPLETENESS (kogaki#70 clause 5,
# kogaki#74 clause 6). Two declarations, ONE GRAMMAR OVER ONE SEGMENTER,
# specified together and implemented in one pass — two sequential passes over
# this parser is how the use-vs-mention defect (kogaki#41) got in the first
# time. The report's shape is now:
#
#   review-lane report: <head sha>
#   review-scope: full | delta          — absent is read as `full`
#   finding: ...                        — zero or more
#   report-complete: <N> findings       — absent is read as complete
#
# A ROUND IS A REVIEW THAT WAS PERFORMED (kogaki#91). Measured on PR #67: a
# reviewer took the real 12-char prefix `5586353629bb` and INVENTED THE TAIL,
# posting `5586353629bb0995463037856b76dc59721ce3a0` — a sha that does not
# exist. The presence check refused it, the reviewer re-posted against the true
# head `5586353629bbd35af93f1032349af113774871ba`, and two segments landed for
# one performed review. `segments()` then said 4 rounds where 3 had happened,
# and everything derived from the count inherited the error: the
# two-rounds-then-park bound (§4 clause 3), round-2 delta scoping (§4 clause
# 5), and cost attribution per round.
#
# So `rounds_used()` counts only segments whose sha RESOLVES TO A COMMIT. The
# report is not stale, it is UNFOUNDED — a result reported over a substrate
# that was never established — and the distinction is the whole fix: a stale
# report reviewed something, and a fabricated one reviewed nothing.
#
# Three properties, each with a fixture:
#   · cannot-determine COUNTS the round. An unreadable object store must not
#     be able to manufacture free rounds, which is the failure direction that
#     would matter here.
#   · a resolvable stale sha is STILL a round. This discounts fabrication,
#     never history.
#   · the discount is ANNOUNCED on every path, including `done` — the first
#     version put the notice beside the arithmetic, where `done` returns above
#     it, so the specimen that motivated the issue was the one case that stayed
#     silent. The notice matters more than the count it explains: it says a
#     fabricated sha is sitting on the PR.
#
# The generation half lives in the reviewer's own contract
# (`.claude/skills/review-lane/SKILL.md`): the sha is READ AS A VALUE from
# `gh pr view --json headRefOid` and never assembled from a prefix, a shorter
# sha is always safe where an invented one never is, and the reviewer verifies
# with `git cat-file -e` before posting. This half is the mechanical gate that
# does not depend on a session following prose:
#
#   "a prohibition is violated at the tool boundary and wants a mechanical gate
#   there — stated one layer up in prose it is enforced by whichever
#   consideration happens to be strongest when the moment arrives"
#   (consulted: product-lab@f918c515 topics/archive/knowledge-architecture.md:172)
#
# SCOPE IS SURFACED, NEVER GATED. Clause 5 is deliberately carrier-less with a
# named reopen trigger: whether a declared `delta` was the HONEST one is
# judgment, and nothing here can compute it. What this file does is read the
# declaration and PRINT it, so a narrower assurance is legible where the
# driver's reader is looking rather than inferred from a round number.
#
# COMPLETENESS IS GATED, and both halves are mechanical — token presence and
# count equality, computable facts over a declared record, which is why they
# sit at the merge layer beside clause 1. The specimen is a merge that should
# not have happened: on PR #71 the reviewer split its report, the first part
# landed, the re-check fired, auto-merge completed, and the COMPLETE report
# carrying a new open blocking finding arrived 2m57s later on an already-merged
# PR. Nothing distinguished a complete report from the first fragment of one.
#
# BOTH DEFAULTS FAIL TOWARD THE HISTORY, which is not the same as failing open:
# every report already in this repository was posted whole and reviewed fully,
# so a default that retroactively narrowed or voided them would empty the gate
# rather than tighten it. The tokens bind reports written after they ship.
#
# THE DECLARATIONS ARE ADJACENT LINES, NOT A WIDENED REPORT LINE — chosen by
# running this file's own fixture pass against both forms (story 1.17's named
# closing act), never by argument. The evidence is recorded at the regexes.
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
              --json number,headRefOid,headRefName,author,isCrossRepository 2>/dev/null)"; then
    echo "FAIL could not establish the substrate: gh pr view $TARGET_PR failed." >&2
    exit 1
  fi
  prs="[$one]"
elif [ -n "$TARGET_BRANCH" ]; then
  if ! prs="$(gh pr list --state open --head "$TARGET_BRANCH" \
              --json number,headRefOid,headRefName,author,isCrossRepository 2>/dev/null)"; then
    echo "FAIL could not establish the substrate: the gh lookup failed." >&2
    exit 1
  fi
  if [ "$prs" = "[]" ]; then
    echo "no open PR for branch $TARGET_BRANCH — a push before PR creation is normal; nothing to do"
    exit 0
  fi
elif ! prs="$(gh pr list --state open --limit "$LIMIT" \
            --json number,headRefOid,headRefName,author,isCrossRepository 2>/dev/null)"; then
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

# --- the tier table (kogaki#81) -------------------------------------------
# Declared here beside the model pin, the turn cap and the grant lists, for the
# reason the header gives: a tier is a spawn parameter and this file is where
# every spawn parameter is carried. The CAREFUL tier's model and cap are
# REVIEW_MODEL/REVIEW_MAX_TURNS above — one place to read, one place to change,
# and the same two variables the fallback uses, so the fail-safe side cannot
# drift away from the tier it is supposed to be.
#
# `KOGAKI_REVIEW_MODEL` / `KOGAKI_REVIEW_MAX_TURNS` remain OPERATOR PINS: set
# either and it wins over the resolved tier, and the run's line says `pinned`
# rather than naming a class it did not use. A pin that silently lost to a
# table would be the ambient-state defect kogaki#52 closed, re-opened one level
# up.
REVIEW_MODEL_PINNED="${KOGAKI_REVIEW_MODEL+1}"
REVIEW_MAX_TURNS_PINNED="${KOGAKI_REVIEW_MAX_TURNS+1}"
TIER_CAREFUL_PATHS="${KOGAKI_REVIEW_TIER_CAREFUL_PATHS:-\
spec/**,specs/**,checks/**,policy/**,.claude/hooks/**}"
TIER_ORDINARY_PATHS="${KOGAKI_REVIEW_TIER_ORDINARY_PATHS:-\
tools/**,docs/**,.claude/skills/**,.claude/*.json,*.md}"
TIER_ORDINARY_MODEL="${KOGAKI_REVIEW_TIER_ORDINARY_MODEL:-sonnet}"
TIER_ORDINARY_MAX_TURNS="${KOGAKI_REVIEW_TIER_ORDINARY_MAX_TURNS:-24}"
REVIEW_LOG_DIR="${KOGAKI_REVIEW_LOG_DIR:-$HOME/.kogaki/reviews}"
# Where "outside the repository" is (kogaki#61). The system temp root, which
# is outside every repository by construction; an operator who wants a
# different home declares it here rather than in a call site. It is resolved
# in the shell beside every other spawned-session knob for the same reason
# they are: one place to read, one place to change.
SPAWN_WORKTREE_ROOT="${KOGAKI_SPAWN_WORKTREE_ROOT:-${TMPDIR:-/tmp}}"

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
SWEEP_LOG_DIR="$REVIEW_LOG_DIR" SWEEP_WORKTREE_ROOT="$SPAWN_WORKTREE_ROOT" \
SWEEP_TIER_CAREFUL_PATHS="$TIER_CAREFUL_PATHS" \
SWEEP_TIER_ORDINARY_PATHS="$TIER_ORDINARY_PATHS" \
SWEEP_TIER_ORDINARY_MODEL="$TIER_ORDINARY_MODEL" \
SWEEP_TIER_ORDINARY_MAX_TURNS="$TIER_ORDINARY_MAX_TURNS" \
SWEEP_MODEL_PINNED="$REVIEW_MODEL_PINNED" \
SWEEP_MAX_TURNS_PINNED="$REVIEW_MAX_TURNS_PINNED" \
python3 <<'PYEOF'
import fnmatch, json, os, re, shutil, subprocess, sys, tempfile

REPORT = re.compile(r'^\s*review-lane report:\s*([0-9a-f]{7,40})\s*$', re.M)
FINDING = re.compile(
    r'^\s*finding:\s*(blocking|should|nit)\s+(open|resolved)\b'
    r'(?P<just>\s*\[(?:policy|harm):[^\]]+\])?', re.M)
# §4 clauses 5 and 6 (kogaki#70, kogaki#74) — ONE GRAMMAR OVER ONE SEGMENTER,
# on SEPARATE ADJACENT LINES rather than widened onto the report line. That
# form was CHOSEN BY EXERCISE, not by argument, which is the closing act story
# 1.17's own question named: the fixture pass below was run against a report
# carrying the scope declaration in each candidate form, and the two answers
# were not close.
#
#   ON the report line (`review-lane report: <sha> delta`) — every reader
#   whose REPORT regex has not been widened in lockstep sees NO REPORT AT ALL.
#   Run that way, `segments()` returned `[]` for a declared report and the
#   disclosure fixture failed on the first case; the state machine fell to
#   spawn-round-1 and the merge gate would read every declared report as
#   absent. The regex lives in TWO files (here and
#   checks/check-review-report.sh) plus two `.search` trust uses, so the form
#   is only safe while four copies stay synchronized — and its failure is
#   SILENT-SHAPED, a green-looking `absent`.
#
#   ADJACENT (this form) — the report token stays BYTE-IDENTICAL, so no reader
#   can be desynchronized by construction. The same fixture pass ran green with
#   the REPORT regex untouched.
#
# That is also the use-vs-mention class kogaki#41 fixed once: the fixed token
# is the thing every consumer agrees on, and widening it is how consumers stop
# agreeing. Each line is anchored WHOLE (`^...$`), so a finding's prose
# mentioning `report-complete:` is a mention and never a declaration.
SCOPE = re.compile(r'^\s*review-scope:\s*(full|delta)\s*$', re.M)
COMPLETE = re.compile(r'^\s*report-complete:\s*(\d+)\s+findings?\s*$', re.M)
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
# The isolation knob (kogaki#61) and the boundary it is checked against. The
# shell `cd`s to the repository root before this heredoc runs, so cwd IS the
# root — resolved once, through realpath, because the comparison that makes
# "outside" load-bearing is a path comparison and a symlinked root would make
# it lie.
WORKTREE_ROOT = os.environ["SWEEP_WORKTREE_ROOT"]
REPO_ROOT = os.path.realpath(os.getcwd())

# The tier table (kogaki#81), resolved in the shell above and passed in on the
# same ground every other knob is: two places that both know a default are two
# places that can disagree about it.
TIER_CAREFUL_PATHS = [p for p in
                      os.environ["SWEEP_TIER_CAREFUL_PATHS"].split(",") if p]
TIER_ORDINARY_PATHS = [p for p in
                       os.environ["SWEEP_TIER_ORDINARY_PATHS"].split(",") if p]
TIER_ORDINARY_MODEL = os.environ["SWEEP_TIER_ORDINARY_MODEL"]
TIER_ORDINARY_MAX_TURNS = os.environ["SWEEP_TIER_ORDINARY_MAX_TURNS"]
MODEL_PINNED = bool(os.environ.get("SWEEP_MODEL_PINNED"))
MAX_TURNS_PINNED = bool(os.environ.get("SWEEP_MAX_TURNS_PINNED"))

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


# The posting contract, appended to the REVIEWER's prompt only (kogaki#81).
# The fixer never posts a report, so it never gets this and must not: a
# contract about how to post one is an instruction to post one.
POSTING = (
    "\n\nPOSTING CONTRACT — ONE COMPOSITION, ONE POST, ONE VERIFICATION. "
    "Compose the whole report before you post anything, then post it in a "
    "SINGLE act with `--body-file` — `gh pr comment <n> --body-file -` fed by "
    "one heredoc (you hold no Write grant, so `-` is the file). Then verify "
    "ONCE, with `gh pr view <n> --json comments`, that it landed. If it did "
    "not land, STOP and exit without posting again, and do not re-post a "
    "report you have already posted. On PR #67 a reviewer made FOUR "
    "consecutive `gh pr comment` attempts with the same body: each retry "
    "spends a turn and risks a DUPLICATE `review-lane report:` comment, and a "
    "second segment for one head changes what the sweep counts as rounds."
    "\n\nTHE REPORT DECLARES ITS SCOPE AND ITS COMPLETENESS (specs/SPEC.md §4 "
    "clauses 5 and 6). Beside the `review-lane report: <sha>` line, on its own "
    "adjacent line, write `review-scope: full` or `review-scope: delta`; end "
    "the report with `report-complete: <N> findings`, where N is EXACTLY the "
    "number of `finding:` lines you wrote. A report whose count does not match "
    "is read as a FRAGMENT and counts as nothing — it turns nothing green and "
    "the head stays unreviewed, so write the terminal line last and write it "
    "once. A round-2 review is `delta` by default and `full` whenever the fix "
    "touched files outside the ones round 1's findings named."
)


# --- the tier table's resolver (kogaki#81) --------------------------------
# Given the DIFF'S PATHS and nothing else. The branch name cannot reach this
# function, which is criterion 3 by construction rather than by discipline: a
# PR on `direct/71-*` that edits `checks/registry.json` resolves careful
# because of what it edits.

def path_in_class(path, patterns):
    """The first pattern in `patterns` that covers `path`, or None.

    `dir/**` means the subtree under `dir/`. Every other pattern is matched
    AT ITS OWN DEPTH — `*.md` is the repository's top-level notes, not every
    markdown file in the tree — because fnmatch's `*` crosses separators and a
    table whose cheap class silently swallowed `specs/SPEC.md` would be the
    downgrade this story exists to refuse.
    """
    for pat in patterns:
        if pat.endswith("/**"):
            if path == pat[:-3] or path.startswith(pat[:-2]):
                return pat
        elif (pat.count("/") == path.count("/")
              and fnmatch.fnmatchcase(path, pat)):
            return pat
    return None


def resolve_tier(paths, careful_paths=None, ordinary_paths=None):
    """Resolve (model, max_turns, class, fallback, why) from diff paths.

    `class` is the declared class that produced the tier, or None when the
    fallback did. `fallback` is True in exactly that case, and the caller is
    required to SAY SO on both the spawn and the dry-run path: an unobservable
    non-member fallback is the defect kogaki#65 was filed over.

    The fail-safe side is the careful tier. A needlessly expensive review costs
    about $3; a too-cheap review of an unclassified diff passes the gate
    silently, which is the failure the presence check cannot see.
    """
    # The tables default to the configured ones and are passed explicitly by
    # the fixture below, so an operator who overrides the table does not turn
    # this tool red over cases written against the shipped one.
    cp = TIER_CAREFUL_PATHS if careful_paths is None else careful_paths
    op = TIER_ORDINARY_PATHS if ordinary_paths is None else ordinary_paths
    careful = (MODEL, MAX_TURNS)
    if paths is None:
        return (*careful, None, True,
                "the diff paths could not be read, so no class could be matched")
    if not paths:
        return (*careful, None, True, "the diff listed no paths")
    hits = [(p, path_in_class(p, cp)) for p in paths]
    careful_hit = next(((p, pat) for p, pat in hits if pat), None)
    if careful_hit:
        # ANY careful path carries the whole diff. A mixed diff is reviewed at
        # the tier its most careful file asks for, never averaged down.
        return (*careful, "careful", False,
                f"{careful_hit[0]} matches {careful_hit[1]}")
    unmatched = [p for p in paths if not path_in_class(p, op)]
    if unmatched:
        return (*careful, None, True,
                f"{unmatched[0]} matches no declared class"
                + (f" (and {len(unmatched) - 1} more)" if len(unmatched) > 1 else ""))
    return (TIER_ORDINARY_MODEL, TIER_ORDINARY_MAX_TURNS, "ordinary", False,
            f"every path is ordinary code (e.g. {paths[0]})")


def review_policy(paths, **tables):
    """The resolved tier with the operator's PINS applied, and its own label.

    A pin wins over the table and the label says `pinned` rather than naming a
    class the run did not use — a pin that silently lost to a table would
    re-open, one level up, the ambient-state defect kogaki#52 closed.
    """
    model, turns, klass, fallback, why = resolve_tier(paths, **tables)
    if MODEL_PINNED:
        model = MODEL
    if MAX_TURNS_PINNED:
        turns = MAX_TURNS
    if fallback:
        label = (f"tier {model}/{turns} turns by FALLBACK — NO DECLARED CLASS "
                 f"MATCHED ({why}); the fail-safe side")
    else:
        label = f"tier {model}/{turns} turns, class {klass} ({why})"
    pins = [n for n, p in (("model", MODEL_PINNED),
                           ("max-turns", MAX_TURNS_PINNED)) if p]
    if pins:
        label += f" [{'/'.join(pins)} PINNED by env, overriding the tier]"
    return model, turns, label


def diff_paths(pr):
    """The PR's changed paths, or None when they could not be read.

    None is cannot-determine and resolves to the careful tier, never to the
    cheap one: an unreadable diff is exactly the case where nothing is known
    about what is being reviewed.
    """
    try:
        r = subprocess.run(["gh", "pr", "diff", str(pr), "--name-only"],
                           stdin=subprocess.DEVNULL, capture_output=True,
                           text=True, check=True)
    except (subprocess.CalledProcessError, OSError):
        return None
    return [l.strip() for l in r.stdout.splitlines() if l.strip()]


# --- the run's cost, rendered from held data (kogaki#81) ------------------
# All four fields come from the `result` record the stream-json log already
# carries. No new instrumentation, and the sweep renders it rather than the
# session because a session cannot know its own final cost from inside the
# turn that posts.

COST_TOKEN = "review-cost:"


def result_record(log_path):
    """The `result` record from a route log, or None.

    Scanned from the END: the record is the stream's last object, and a log
    that was appended to across rounds must yield the run that just finished
    rather than the first one it happens to find.
    """
    try:
        with open(log_path, encoding="utf-8", errors="replace") as f:
            lines = f.read().splitlines()
    except OSError:
        return None
    for line in reversed(lines):
        line = line.strip()
        if not line.startswith("{") or '"type":"result"' not in line.replace(" ", ""):
            continue
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            continue
        if rec.get("type") == "result":
            return rec
    return None


def cost_line(rec, model=None):
    """`review-cost: <turns> turns · <min> · $<cost> · model <m>`, or None.

    None when the record is missing or carries none of the four fields — a
    fabricated zero would be worse than an absent line, because tier tuning is
    supposed to read this.
    """
    if not rec:
        return None
    turns = rec.get("num_turns")
    ms = rec.get("duration_ms")
    cost = rec.get("total_cost_usd")
    models = sorted((rec.get("modelUsage") or {}).keys()) or ([model] if model else [])
    if turns is None and ms is None and cost is None and not models:
        return None
    return (f"{COST_TOKEN} "
            f"{'?' if turns is None else turns} turns · "
            f"{'? min' if ms is None else f'{ms / 60000:.1f} min'} · "
            f"{'$?' if cost is None else f'${cost:.2f}'} · "
            f"model {'+'.join(models) if models else '?'}")


def needs_cost_line(body):
    """Does this report body still owe a cost line? Idempotent by construction.

    A re-run of the sweep over an already-annotated report must not append a
    second one — the append is a mutation of a comment that is already public.
    """
    return not any(l.strip().startswith(COST_TOKEN)
                   for l in (body or "").splitlines())


def append_cost_line(comment_url, body, line):
    """Append the cost line to an existing report comment. True if it landed.

    The report is the reviewer's artifact and this is the sweep's footer on it,
    so it is an EDIT rather than a second comment: a separate comment for the
    cost would be another body under the same head for a reader to reconcile.
    """
    m = re.search(r"github\.com/([^/]+)/([^/]+)/pull/\d+#issuecomment-(\d+)",
                  comment_url or "")
    if not m:
        return False
    owner_, repo_, cid = m.groups()
    payload = json.dumps({"body": body.rstrip() + "\n\n" + line})
    try:
        subprocess.run(["gh", "api", "--method", "PATCH",
                        f"repos/{owner_}/{repo_}/issues/comments/{cid}",
                        "--input", "-"],
                       input=payload, text=True, capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, OSError):
        return False


def report_cost(pr, head, allowed, log_path, model):
    """Put the run's cost at the end of the report it belongs to.

    Reports what it did on every branch: a cost line that silently failed to
    land is a tuning input nobody knows is missing.
    """
    line = cost_line(result_record(log_path), model)
    if line is None:
        print(f"  #{pr}: no cost line — the route log carries no `result` "
              "record, so nothing was rendered rather than a fabricated zero")
        return
    try:
        raw = subprocess.run(
            ["gh", "pr", "view", str(pr), "--json", "comments"],
            stdin=subprocess.DEVNULL, capture_output=True, text=True,
            check=True).stdout
        comments = json.loads(raw).get("comments", [])
    except (subprocess.CalledProcessError, json.JSONDecodeError, OSError):
        print(f"  #{pr}: could not read comments to attach `{line}` — the run's "
              "cost survives only in the route log")
        return
    for c in reversed(comments):
        if ((c.get("author") or {}).get("login") or "") not in allowed:
            continue
        body = c.get("body") or ""
        segs = segments(body)
        if not any(head.startswith(s['sha']) or s['sha'].startswith(head)
                   for s in segs):
            continue
        if not needs_cost_line(body):
            return                      # already annotated; never a second one
        if append_cost_line(c.get("url") or "", body, line):
            print(f"  #{pr}: {line}")
        else:
            print(f"  #{pr}: could not append `{line}` to the report — the "
                  "cost survives only in the route log")
        return
    print(f"  #{pr}: no report comment for {head[:7]} to carry `{line}`")


def spawn_log_path(pr, rnd):
    """One file per PR per round: the route, not only the verdict."""
    return os.path.join(LOG_DIR, f"pr-{pr}-round-{rnd}.log")


def fix_log_path(pr, rnd):
    """The fixer's route, kept beside the reviewer's and never merged with it.

    Two spawned sessions per round, so two files: reading a rally afterwards
    means telling who did what, and one interleaved log cannot answer that.
    """
    return os.path.join(LOG_DIR, f"pr-{pr}-fix-{rnd}.log")


def rounds_used(bodies, resolves=None):
    """How many review rounds this PR has already spent.

    A segment whose cited sha resolves to no commit is NOT a round (kogaki#91)
    — see `performed()`. This is the ONE place the count is computed, and
    `decide()` calls it rather than re-deriving: the round count has two
    consumers (the state machine's park bound and the driver's cap), and a
    discount applied at one of two call sites is the shape this file keeps
    finding.
    """
    return sum(1 for s in segments(bodies) if performed(s, resolves))


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


# --- execution isolation: one fresh worktree per spawn (kogaki#61) ---------
# Sited here rather than at the call sites, so spawn kind N+1 is covered by
# construction. See the header for the incident and the ratified rule.

ISOLATION_FAILED = 75   # a spawn that never ran because it could not be isolated

# Worktrees this run created and could NOT remove. Reported at the end and
# reflected in the exit code: a leak that only a filesystem search would find
# is the failure mode criterion 3 exists to refuse.
WORKTREE_LEAKS = []


class IsolationError(RuntimeError):
    """The worktree could not be established — never downgraded to a shared tree."""


def outside_repo(path):
    """Is `path` outside the repository? The load-bearing half of the rule.

    A worktree UNDER the repo root is still inside the tree the authoring
    session's own tooling walks, so it buys nothing and is refused. Compared
    on realpaths with a separator-bounded prefix, so a sibling directory whose
    name merely starts with the root's (`/w/kogaki-tmp` beside `/w/kogaki`) is
    outside, which a bare `startswith` would get wrong.
    """
    real = os.path.realpath(path)
    return real != REPO_ROOT and not real.startswith(REPO_ROOT + os.sep)


def _git(*args):
    """Run git and RETURN its failure rather than raising it.

    An unavailable or unexecutable git raises OSError from subprocess, and
    this helper is called from a `finally` — an exception there would replace
    the outcome the caller is already carrying, so a spawned session's real
    exit code would be lost to a cleanup problem. Every git failure is
    therefore one kind of thing: a result with a non-zero code and a reason.
    Found by exercising the exception path (kogaki#61), not by inspection.
    """
    try:
        return subprocess.run(["git", *args], stdin=subprocess.DEVNULL,
                              capture_output=True, text=True, check=False)
    except OSError as e:
        return subprocess.CompletedProcess(args, 127, "", f"git unavailable: {e}")


def make_worktree(tag, ref, detach):
    """Create a fresh worktree outside the repository; return (base, tree).

    `base` is the private temp directory the tree lives in — removed with it,
    so a run leaves nothing behind. Raises IsolationError rather than
    returning a shared tree: failing closed here costs one review, while
    failing open reopens the hole the incident came through.
    """
    if not ref:
        raise IsolationError(
            "no ref to check out — the PR read did not carry one, and a "
            "worktree at an unnamed ref would be a session working on "
            "whatever the repository happened to be at")
    try:
        os.makedirs(WORKTREE_ROOT, exist_ok=True)
        base = tempfile.mkdtemp(prefix=f"kogaki-{tag}-", dir=WORKTREE_ROOT)
    except OSError as e:
        raise IsolationError(f"could not create a worktree root under "
                             f"{WORKTREE_ROOT}: {e}")
    if not outside_repo(base):
        shutil.rmtree(base, ignore_errors=True)
        raise IsolationError(
            f"{base} is INSIDE the repository ({REPO_ROOT}) — a worktree there "
            "is still in the tree the authoring session walks. Point "
            "$KOGAKI_SPAWN_WORKTREE_ROOT outside the repository.")
    tree = os.path.join(base, "tree")
    # The reviewer gets --detach at the head sha: it never pushes (§4 clause
    # 2), so it is given a HEAD that cannot advance a branch. The fixer gets
    # the PR's branch with --force, because a branch the authoring session
    # also has checked out must not block the isolation — the trees are
    # separate either way, which is the property the incident wanted.
    args = (["worktree", "add", "--detach", tree, ref] if detach
            else ["worktree", "add", "--force", tree, ref])
    r = _git(*args)
    if r.returncode != 0:
        shutil.rmtree(base, ignore_errors=True)
        raise IsolationError(f"git {' '.join(args)} exited {r.returncode}: "
                             f"{(r.stderr or r.stdout or '').strip()}")
    return base, tree


def remove_worktree(base, tree, log=None):
    """Remove the worktree. A failure is REPORTED, never swallowed.

    Called from a `finally`, so it runs on every exit path — success, a
    non-zero exit, and an exception alike. It never raises: a removal problem
    must not replace the outcome the caller is carrying, it must be added to
    it, which is what WORKTREE_LEAKS is for.
    """
    why = None
    r = _git("worktree", "remove", "--force", tree)
    if r.returncode != 0:
        why = (f"git worktree remove exited {r.returncode}: "
               f"{(r.stderr or r.stdout or '').strip()}")
    else:
        try:
            shutil.rmtree(base)
        except OSError as e:
            why = f"the tree was removed but its temp root survived: {e}"
    line = (f"=== worktree removed: {tree}\n" if why is None
            else f"=== worktree LEAKED: {tree} — {why}\n")
    if log is not None:
        try:
            log.write(line)
            log.flush()
        except OSError:
            pass
    if why is not None:
        WORKTREE_LEAKS.append((tree, why))
        print(f"  FAIL worktree not removed: {tree} — {why}")
    return why is None


def spawn(prompt, log_path, model=None, tools=None, ref=None, detach=True,
          tag="review", max_turns=None):
    """Run a spawned session with the declared policy, streaming to its log.

    Returns the exit code. Every knob the session runs under is named at the
    call rather than inherited: the model (never the operator's interactive
    default), a turn cap, a route capture, and — since kogaki#61 — the WORKING
    DIRECTORY, a fresh worktree outside the repository that no other session
    holds. `--verbose --output-format stream-json` is what makes the log a
    ROUTE — the per-turn record — instead of the final message, which is all
    the trigger log ever held.

    The log is opened before the process starts and the command line is written
    into it first, so a spawn that dies immediately still leaves a file saying
    what was attempted. A log that only appears on success cannot explain a
    failure, which is the one occasion anybody opens it. The worktree path is
    written next, beside it, so a leaked worktree is findable from the record.
    """
    os.makedirs(LOG_DIR, exist_ok=True)
    cmd = ["claude", "-p", prompt + HEADLESS,
           "--model", model or MODEL,
           "--max-turns", str(max_turns or MAX_TURNS),
           "--allowedTools", tools or REVIEW_TOOLS,
           "--verbose", "--output-format", "stream-json"]
    with open(log_path, "a", encoding="utf-8") as log:
        log.write(f"=== spawn: {' '.join(cmd)}\n")
        log.flush()
        try:
            base, tree = make_worktree(tag, ref, detach)
        except IsolationError as e:
            log.write(f"=== worktree FAILED: {e}\n")
            log.flush()
            print(f"  FAIL isolation could not be established, so nothing was "
                  f"spawned: {e}")
            return ISOLATION_FAILED
        log.write(f"=== worktree: {tree} "
                  f"[{'detached at' if detach else 'branch'} {ref}]\n")
        log.flush()
        try:
            # stdin=DEVNULL closes the contamination class (kogaki#65 defect
            # 2). The held run's reviewers reported, verbatim, that their
            # arguments carried "a full paste of the review-sweep driver
            # source" — this file's own python heredoc, reaching the child
            # through an inherited descriptor. Closing stdin eliminates it
            # regardless of WHICH descriptor carried it, which is why it is
            # the fix rather than tracking down the specific fd: a per-source
            # suppression would leave source N+1 live.
            return subprocess.run(cmd, stdin=subprocess.DEVNULL,
                                  stdout=log, stderr=subprocess.STDOUT,
                                  cwd=tree, check=False).returncode
        finally:
            # EVERY exit path, not only success: a non-zero exit and an
            # exception both reach here.
            remove_worktree(base, tree, log)


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
    # A FRAGMENT IS NOT AN ARTIFACT (§4 clause 6). This function asks the same
    # question the merge gate asks, at the moment the sweep can still say
    # something useful about it — so it must answer it the same way, or the
    # sweep would count a spawn as successful over a report the gate then
    # refuses. A reviewer whose report arrived in pieces gets the stall comment,
    # which is exactly the disclosure PR #71 did not have.
    return any(counted(s) for s in head_segments(segments(bodies), head))


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
    the check depend on a file the CI runner has no reason to execute.

    Each segment also carries its two DECLARATIONS (§4 clauses 5 and 6), read
    in the same single pass over the same grammar:

      scope     'full' | 'delta', or None when the report declared none —
                READ AS `full` by scope_of(), the compatibility direction
                clause 5 states. The reports already in this repository's
                history are all full reviews, and a default that silently
                narrowed them would rewrite history at the gate.
      complete  the N of a terminal `report-complete: <N> findings`, or None
                when the report carries no such line — READ AS COMPLETE by
                counted(), on the same compatibility ground.

    The FIRST declaration of each kind in a segment wins. A second one is a
    malformed report, not a correction, and a later line must never be able to
    revise an earlier claim about the same segment. Findings emitted AFTER a
    `report-complete:` line still count as findings, so a report that keeps
    writing past its own terminal token fails count equality — which is the
    fragment case behaving as it should rather than a special rule for it."""
    segs, cur = [], None
    for line in (bodies or '').splitlines():
        r = REPORT.match(line)
        if r:
            cur = {'sha': r.group(1), 'findings': [],
                   'scope': None, 'complete': None}
            segs.append(cur)
            continue
        if cur is None:
            continue        # a declaration before any report belongs to none
        s = SCOPE.match(line)
        if s:
            if cur['scope'] is None:
                cur['scope'] = s.group(1)
            continue
        c = COMPLETE.match(line)
        if c:
            if cur['complete'] is None:
                cur['complete'] = int(c.group(1))
            continue
        f = FINDING.match(line)
        if f:
            cur['findings'].append((f.group(1), f.group(2), bool(f.group('just'))))
    return segs


_RESOLVE_CACHE = {}


def sha_resolves(sha):
    """Does this sha name a commit in THIS repository? True / False / None.

    None is cannot-determine (git unavailable, the object store unreadable) and
    every caller treats it as True — the fail-safe side here is to keep
    counting, because discounting a round on an unreadable answer would let an
    unresolvable environment manufacture extra rounds instead of removing fake
    ones.

    Memoized: `decide()` is called repeatedly across the fixture pass and once
    per PR, and the answer for a given sha cannot change within a run.
    """
    if sha in _RESOLVE_CACHE:
        return _RESOLVE_CACHE[sha]
    try:
        r = subprocess.run(["git", "cat-file", "-e", f"{sha}^{{commit}}"],
                           stdin=subprocess.DEVNULL, capture_output=True,
                           text=True)
        out = r.returncode == 0
    except OSError:
        out = None
    _RESOLVE_CACHE[sha] = out
    return out


def performed(seg, resolves=None):
    """Was this segment a round that actually HAPPENED? (kogaki#91)

    A segment cites a sha. If that sha does not name a commit, the round it
    claims was never performed against anything — the report is UNFOUNDED
    rather than merely wrong, and counting it inflates every number derived
    from the round count: the two-rounds-then-park bound (§4 clause 3), round-2
    delta scoping (§4 clause 5), and cost attribution per round.

    Measured on PR #67: a reviewer took the real prefix `5586353629bb` and
    invented the tail, posted the report, was refused by the presence check,
    and re-posted against the true head. Both segments were counted, so
    `segments()` said 4 rounds where 3 were performed. Nothing was deleted and
    the re-post disclosed the fabrication, so the specimen is fully on record.

    Deliberately NOT folded into `counted()`. Completeness (§4 clause 6) asks
    whether an artifact ARRIVED WHOLE; this asks whether the thing it reports
    on EXISTS. Two different questions with two different fail-safe sides —
    a fragment must not turn anything green, while an unresolvable sha must not
    be able to invent a round — and one predicate answering both would have to
    pick one of them.

    `resolves` is injected so the fixture pass can state the repository's
    answers rather than depend on this repository's object store, which is the
    only way a case about a sha that does NOT exist can be written at all.
    """
    r = (resolves or sha_resolves)(seg['sha'])
    return r is not False


def counted(seg):
    """Does this segment COUNT? §4 clause 6 — a fragment counts as nothing.

    Both halves are mechanical: the token's presence and count equality. A
    segment declaring `report-complete: 5 findings` while carrying 2 is the
    first part of a split report, and the PR #71 specimen is a merge that
    should not have happened — the fragment landed, the re-check fired,
    auto-merge completed, and the complete report carrying a new open blocking
    finding arrived on an already-merged PR.

    An ABSENT token counts as complete (criterion 1c): the token binds reports
    written after it ships, and voiding this repository's history retroactively
    would empty the gate rather than tighten it.
    """
    return seg['complete'] is None or seg['complete'] == len(seg['findings'])


def scope_of(seg):
    """This segment's declared scope, or `full` when it declared none."""
    return seg['scope'] or 'full'


def head_segments(segs, head):
    """The segments naming THIS head — abbreviated shas match either way."""
    return [s for s in segs
            if head and (head.startswith(s['sha']) or s['sha'].startswith(head))]


def head_scope(bodies, head):
    """(scope, declared) for this head's counted report, or (None, False).

    Surfaced rather than gated: clause 5 is deliberately carrier-less and adds
    no computable obligation to the merge layer. What the driver owes is that
    the declaration is OBSERVABLE where the driver's reader is looking — the
    same lesson kogaki#76 taught about the downgrade NOTE, which was emitted on
    one of two paths.
    """
    for s in head_segments(segments(bodies), head):
        if counted(s):
            return scope_of(s), s['scope'] is not None
    return None, False


def decide(bodies, head, resolves=None):
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

    A FRAGMENT COUNTS AS NOTHING (§4 clause 6). A segment whose declared
    `report-complete: <N>` does not equal its own finding lines cannot produce
    `done` or `author-owes`: the head is not reviewed, so the state is the one
    it would have been without any report — another round, or a park. The
    fragment still SPENT a round, and is counted as one, because the cost was
    paid whether or not the artifact arrived whole.

    Its findings still gate, though, on the conservative side: clause 6 says a
    fragment turns nothing GREEN, and dropping a fragment's `blocking open`
    would be using incompleteness to make a PR pass. So completeness decides
    whether a report EXISTS for this head; the finding set is read over every
    segment naming it.
    """
    segs = segments(bodies)
    # ANNOUNCED BEFORE ANY RETURN, on EVERY path (kogaki#91). The first version
    # of this put the notice beside the round arithmetic, where `done` and
    # `author-owes` return above it — so on the exact specimen that motivated
    # the issue (a fabricated sha beside a good report, which decides `done`)
    # the discount was silent. That is the kogaki#76 shape for the third time
    # in this file: the outcome was right and the disclosure was missing, on
    # one of two paths. The fixture below caught it, which is why it asserts
    # the NOTE rather than only the verdict.
    #
    # And the notice is worth more than the arithmetic it explains: it says a
    # FABRICATED SHA IS SITTING ON THE PR. The round count merely stops being
    # wrong; this is what sends somebody to look.
    for s in segs:
        if not performed(s, resolves):
            print(f"NOTE: a report cites `{s['sha']}`, which resolves to NO "
                  "COMMIT — the round it claims was never performed against "
                  "anything and is NOT counted (kogaki#91). A sha was probably "
                  "reconstructed from a short prefix; the report is unfounded, "
                  "not merely stale")
    current = head_segments(segs, head)
    if any(counted(s) for s in current):
        # Only a JUSTIFIED blocking gates (kogaki#72): an unjustified one
        # fails toward merge as a should — same rule as the presence check.
        blocking = [1 for s in current for sev, st, just in s['findings']
                    if sev == 'blocking' and st == 'open' and just]
        # THE DOWNGRADE IS REPORTED ON THIS PATH TOO (kogaki#76). The presence
        # check emits its NOTE from its own loop; this function is the DRIVER's
        # view of the same finding set, and it was silent — so a blocking the
        # driver decided not to act on left no trace where the driver's reader
        # is looking. Same fact, two readers, and only one was told.
        downgraded = [1 for s in current for sev, st, just in s['findings']
                      if sev == 'blocking' and st == 'open' and not just]
        if downgraded:
            print(f"NOTE: {len(downgraded)} unjustified blocking finding(s) "
                  "downgraded to should, non-gating (kogaki#72) — the driver "
                  "does not treat them as author-owes")
        return 'author-owes' if blocking else 'done'
    # THE FRAGMENT IS ANNOUNCED, never silently absent (§4 clause 6). A report
    # that reached the PR and was not counted is a different fact from no
    # report at all, and the operator reading "spawning round 2" deserves to
    # know which one happened — the kogaki#76 shape again: the outcome was
    # correct and the disclosure was missing.
    for s in current:
        if not counted(s):
            print(f"NOTE: a report for {s['sha'][:7]} declares "
                  f"`report-complete: {s['complete']} findings` but carries "
                  f"{len(s['findings'])} — a FRAGMENT counts as nothing "
                  "(§4 clause 6, kogaki#74); this head is not reviewed")
    # A ROUND IS A REVIEW THAT WAS PERFORMED (kogaki#91). A segment citing a
    # sha that does not resolve reports on nothing, and counting it spends a
    # round the author never received — on PR #67 that made the count 4 where 3
    # were performed, and the two-rounds-then-park bound was the thing paying.
    # Announced rather than silently discounted: a report that reached the PR
    # and was not counted is a different fact from no report at all, and this
    # one also says a fabricated sha is on the record where somebody should
    # look at it.
    rounds_done = rounds_used(bodies, resolves)
    if rounds_done >= MAX_ROUNDS:
        return 'park'
    return f'spawn-round-{rounds_done + 1}'


# --- the downgrade is REPORTED, not merely non-gating (kogaki#76) ----------
# THIS FIXTURE IS THE POINT OF THE ISSUE, not a companion to it. A suite
# described as discriminating in both directions did not catch the NOTE being
# emitted on one of two paths, because every existing case asserted the
# OUTCOME (no fix spawned) and none asserted the DISCLOSURE. That is the third
# instance of one shape in this repository — PR #67 round 1 made the same
# correction to denied_tools(), and kogaki#69's resolver fixture made it again
# — so it is asserted here rather than assumed.
import io as _io, contextlib as _ctx
_dfail = 0
def _note_emitted(bodies, head):
    buf = _io.StringIO()
    with _ctx.redirect_stdout(buf):
        decide(bodies, head)
    return "downgraded to should" in buf.getvalue()
for _label, _bodies, _want in [
    ("an unjustified blocking REPORTS its downgrade",
     f"review-lane report: {'abc1234def'}\nfinding: blocking open  x", True),
    ("a justified blocking reports NO downgrade",
     f"review-lane report: {'abc1234def'}\nfinding: blocking open [harm: x]  x", False),
    ("a plain should reports no downgrade",
     f"review-lane report: {'abc1234def'}\nfinding: should open  x", False),
]:
    if _note_emitted(_bodies, 'abc1234def') != _want:
        print(f"FAIL downgrade-disclosure fixture [{_label}]: "
              f"emitted={not _want}, want={_want}")
        _dfail = 1
if _dfail:
    print("FAIL: the downgrade NOTE is not reported where the driver decides")
    sys.exit(1)
print("disclosure pass: 3/3 downgrade-NOTE cases (unjustified reports, "
      "justified and should do not)")

# --- OUTSIDE is load-bearing, so it is exercised (kogaki#61) --------------
# The isolation's whole value is that the spawned session's tree is not the
# authoring session's, and a worktree under the repo root would satisfy the
# word "worktree" while buying none of it. The rule is therefore a predicate
# with its own cases rather than a startswith written once and trusted — the
# sibling-prefix case (`/w/kogaki-tmp` beside `/w/kogaki`) is the one a bare
# prefix test gets wrong, and it fails toward refusing a legitimate root.
_ofail = 0
for _label, _path, _want in [
    ("the repository root itself is not outside", REPO_ROOT, False),
    ("a path under the repository is not outside",
     os.path.join(REPO_ROOT, "tmp", "wt"), False),
    ("a sibling whose name shares the root's prefix IS outside",
     REPO_ROOT + "-worktrees/wt", True),
    ("the system temp root is outside", os.path.join(tempfile.gettempdir(),
                                                     "kogaki-review-x"), True),
]:
    if outside_repo(_path) != _want:
        print(f"FAIL isolation fixture [{_label}]: "
              f"outside_repo({_path!r})={not _want}, want={_want}")
        _ofail = 1
if _ofail:
    print("FAIL: the outside-the-repository rule does not discriminate, and a "
          "worktree inside the repo is not isolation")
    sys.exit(1)
print("isolation pass: 4/4 outside-the-repository cases (root / under-root "
      "refused, sibling-prefix / temp root accepted)")

# --- the tier resolves from the DIFF, and says how (kogaki#81) ------------
# Three properties are asserted, not one: the tier itself, that the BRANCH
# cannot influence it (the resolver takes paths only, so a `direct/` PR editing
# `checks/` still resolves careful), and that the FALLBACK ANNOUNCES ITSELF —
# criterion 4's whole point is that a silent non-member fallback is the
# kogaki#65 shape, and the existing suite's habit of asserting the outcome
# while never asserting the disclosure is what kogaki#76 was filed over.
#
# The cases are written against the SHIPPED table and pass it explicitly, so an
# operator who overrides the table gets their override rather than a red tool —
# and the two are compared below, so an override is disclosed rather than
# silently leaving the fixture exercising a table nobody is running under.
_tfail = 0
_TC = ["spec/**", "specs/**", "checks/**", "policy/**", ".claude/hooks/**"]
_TO = ["tools/**", "docs/**", ".claude/skills/**", ".claude/*.json", "*.md"]
_TT = {"careful_paths": _TC, "ordinary_paths": _TO}
for _label, _paths, _want_class, _want_fallback, _want_cheap in [
    ("a checks/ path resolves careful", ["checks/registry.json"],
     "careful", False, False),
    ("BRANCH-BLIND: a `direct/71-*` PR editing checks/ is still careful "
     "(the resolver never sees a branch)", ["checks/registry.json"],
     "careful", False, False),
    ("spec/ and policy/ and the hooks are careful",
     ["spec/SPEC.md", "policy/source.yaml", ".claude/hooks/review-trigger.py"],
     "careful", False, False),
    ("ordinary code resolves ordinary",
     ["tools/review-sweep.sh", "docs/stories/1.19.md", "README.md"],
     "ordinary", False, True),
    ("a MIXED diff takes its most careful file, never an average",
     ["tools/review-sweep.sh", "specs/SPEC.md"], "careful", False, False),
    ("`*.md` is top level only — specs/SPEC.md is NOT ordinary",
     ["specs/SPEC.md"], "careful", False, False),
    ("an unclassified path falls back, and never to the cheap tier",
     ["deps/spec-external-deps.json"], None, True, False),
    ("ordinary + one unclassified path falls back for the whole diff",
     ["tools/review-sweep.sh", "gates/g.json"], None, True, False),
    ("an unreadable diff is cannot-determine, which falls back",
     None, None, True, False),
    ("an empty diff falls back rather than resolving cheap", [], None, True, False),
]:
    _m, _t, _k, _fb, _why = resolve_tier(_paths, **_TT)
    _cheap = (_m == TIER_ORDINARY_MODEL and str(_t) == str(TIER_ORDINARY_MAX_TURNS))
    if (_k, _fb, _cheap) != (_want_class, _want_fallback, _want_cheap):
        print(f"FAIL tier fixture [{_label}]: class={_k!r} fallback={_fb} "
              f"cheap={_cheap}, want class={_want_class!r} "
              f"fallback={_want_fallback} cheap={_want_cheap}")
        _tfail = 1
    # The disclosure half: a fallback must SAY it fell back, on the line the
    # operator reads, and a resolved class must name itself.
    _line = review_policy(_paths, **_TT)[2]
    if _want_fallback and "NO DECLARED CLASS MATCHED" not in _line:
        print(f"FAIL tier fixture [{_label}]: the fallback did not announce "
              f"itself: {_line!r}")
        _tfail = 1
    if not _want_fallback and f"class {_want_class}" not in _line:
        print(f"FAIL tier fixture [{_label}]: the line does not name the class "
              f"that produced the tier: {_line!r}")
        _tfail = 1
if _tfail:
    print("FAIL: the tier does not resolve from the diff, or resolves silently "
          "— an unobservable fallback is the kogaki#65 defect")
    sys.exit(1)
print("tier pass: 10/10 diff-class cases (careful / ordinary / mixed-takes-"
      "careful / branch-blind / unclassified, unreadable and empty fall back "
      "to the careful side, and every fallback announces itself)")
if (TIER_CAREFUL_PATHS, TIER_ORDINARY_PATHS) != (_TC, _TO):
    print("NOTE: the tier table is OVERRIDDEN by env — the cases above "
          "exercised the shipped table, and this run resolves against "
          f"careful={','.join(TIER_CAREFUL_PATHS)} "
          f"ordinary={','.join(TIER_ORDINARY_PATHS)}")

# --- the run's cost is RENDERED from held data (kogaki#81) ----------------
# The four fields come from a `result` record this file already captures, so
# the risk is not instrumentation but rendering: a missing field must never
# become a fabricated zero, and a re-run must never append a second line to a
# comment that is already public.
_cfail = 0
_REC = {"type": "result", "num_turns": 35, "duration_ms": 317344,
        "total_cost_usd": 1.7587225, "modelUsage": {"claude-opus-5": {}}}
for _label, _got, _want in [
    ("all four fields render", cost_line(_REC),
     "review-cost: 35 turns · 5.3 min · $1.76 · model claude-opus-5"),
    ("no record renders nothing", cost_line(None), None),
    ("an empty record renders nothing rather than zeros", cost_line({}), None),
    ("a missing field is `?`, never a fabricated zero",
     cost_line({"num_turns": 4}, "sonnet"),
     "review-cost: 4 turns · ? min · $? · model sonnet"),
    ("the spawn's model stands in when the record names none",
     cost_line({"total_cost_usd": 0.5}, "sonnet"),
     "review-cost: ? turns · ? min · $0.50 · model sonnet"),
]:
    if _got != _want:
        print(f"FAIL cost fixture [{_label}]: {_got!r}, want {_want!r}")
        _cfail = 1
for _label, _body, _want in [
    ("a report with no cost line owes one", "review-lane report: abc1234", True),
    ("a report already carrying one owes nothing",
     "review-lane report: abc1234\n\nreview-cost: 4 turns · 1.0 min · $0.10 "
     "· model sonnet", False),
]:
    if needs_cost_line(_body) != _want:
        print(f"FAIL cost fixture [{_label}]: needs={not _want}, want={_want}")
        _cfail = 1
if _cfail:
    print("FAIL: the run's cost is not rendered from the record it is held in")
    sys.exit(1)
print("cost pass: 7/7 rendering cases (four fields · absent record · missing "
      "field is `?` not 0 · the append is idempotent)")

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
# The existing cases' `9999999` / `8888888` are STALE heads — a real earlier
# head of the same PR — so they are handed a resolver that says every sha
# resolves (kogaki#91). Without it these cases would silently change meaning:
# the synthetic shas resolve to nothing in this repository's object store, so
# they would start exercising the PHANTOM path while their labels still said
# `stale`, and the park case would stop testing the cap it was written for.
def _ALL(_sha):
    return True


bad = [f"{n}: got {decide(b, h, _ALL)!r}, want {w!r}"
       for n, b, h, w in FIX if decide(b, h, _ALL) != w]

# --- the driver's own decision (kogaki#53) --------------------------------
# `decide` says WHAT the state is; this says whether a FIX is spawned for it.
# The cap is the clause worth exercising: with the rounds spent, an
# author-owes must NOT spawn a fix, because the fix could never be reviewed.
# Untested, that branch is where a runaway rally would live.


def drives_fix(bodies, head, resolves=None):
    return (decide(bodies, head, resolves) == 'author-owes'
            and rounds_used(bodies, resolves) < MAX_ROUNDS)


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
bad += [f"{n}: drives_fix -> {drives_fix(b, h, _ALL)}, want {w}"
        for n, b, h, w in DRIVE if drives_fix(b, h, _ALL) != w]

# --- a fabricated sha is not a round (kogaki#91) --------------------------
# THE PR #67 SPECIMEN, replayed. A reviewer took the real 12-char prefix
# `5586353629bb` and invented the tail; the presence check refused it and the
# reviewer re-posted against the true head. Two segments landed for one
# performed review, and every consumer of the round count read 4 where 3 had
# happened.
#
# The resolver is INJECTED rather than read from this repository's object
# store, because the case the fixture exists to state — a sha that does NOT
# exist — cannot be written against a real store at all: any literal chosen
# today could become a real object tomorrow, and the case would silently
# invert. `_ONLY(*live)` says exactly which shas the repository has.
_FAKE = "5586353629bb0995463037856b76dc59721ce3a0"   # posted 15:09:48, no such commit
_TRUE = "5586353629bbd35af93f1032349af113774871ba"   # the real head, 15:12:00


def _ONLY(*live):
    return lambda sha: any(s.startswith(sha) or sha.startswith(s) for s in live)


_pfail = 0
for _label, _bodies, _head, _res, _want_state, _want_rounds in [
    ("the PR #67 specimen: a fabricated sha beside the true head is ONE round",
     f"review-lane report: {_FAKE}\nfinding: nit open  x\n"
     f"review-lane report: {_TRUE}\nfinding: nit open  y",
     _TRUE, _ONLY(_TRUE), 'done', 1),
    ("a fabricated sha ALONE leaves the head unreviewed at round 1, "
     "not round 2",
     f"review-lane report: {_FAKE}\nfinding: nit open  x",
     _TRUE, _ONLY(_TRUE), 'spawn-round-1', 0),
    ("TWO phantoms cannot park a PR that has had no review",
     f"review-lane report: {_FAKE}\nreview-lane report: 1234567abc",
     _TRUE, _ONLY(_TRUE), 'spawn-round-1', 0),
    ("a STALE sha that RESOLVES is still a round — this discounts fabrication, "
     "never history",
     f"review-lane report: 9999999\nreview-lane report: {_TRUE}",
     _TRUE, _ALL, 'done', 2),
    ("cannot-determine counts the round: an unreadable store must not be able "
     "to invent free rounds",
     f"review-lane report: 9999999\nreview-lane report: 8888888",
     _TRUE, lambda _s: None, 'park', 2),
    ("a phantom's open blocking does not summon a fix for this head",
     f"review-lane report: {_FAKE}\nfinding: blocking open [harm: x]  x",
     _TRUE, _ONLY(_TRUE), 'spawn-round-1', 0),
]:
    _buf = _io.StringIO()
    with _ctx.redirect_stdout(_buf):
        _got = decide(_bodies, _head, _res)
        _rounds = rounds_used(_bodies, _res)
    if (_got, _rounds) != (_want_state, _want_rounds):
        print(f"FAIL phantom fixture [{_label}]: state={_got!r} rounds={_rounds}, "
              f"want state={_want_state!r} rounds={_want_rounds}")
        _pfail = 1
    # THE DISCOUNT IS ANNOUNCED, never silent. A round removed from the count
    # with no trace is the kogaki#76 shape: the outcome is right and the
    # operator cannot tell it happened — and here the untold fact is that a
    # FABRICATED SHA IS SITTING ON THE PR, which is the thing somebody should
    # go and look at.
    _said = "resolves to NO COMMIT" in _buf.getvalue()
    _expected_note = _rounds < len(segments(_bodies))
    if _said != _expected_note:
        print(f"FAIL phantom fixture [{_label}]: the discount was "
              f"{'announced without happening' if _said else 'SILENT'}")
        _pfail = 1
if _pfail:
    print("FAIL: a fabricated sha still counts as a round, or is discounted "
          "silently — kogaki#91")
    sys.exit(1)
print("phantom pass: 6/6 unresolvable-sha cases (the PR #67 specimen counts "
      "1 round not 2; phantoms cannot park; a resolvable stale sha still "
      "counts; cannot-determine counts; every discount is announced)")
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

# --- the declarations: one grammar, one segmenter (kogaki#70, kogaki#74) ---
# THE FORM WAS CHOSEN BY RUNNING THIS PASS, which is story 1.17's own named
# closing act rather than a promise to be careful. Both candidate forms were
# put through these cases before either was written into the file:
#
#   the scope ON the report line, REPORT not widened -> segments() returns []
#      for a declared report; the disclosure fixture fails on case 1 and the
#      state machine falls to spawn-round-1. A declared report reads as ABSENT.
#   the scope ON the report line, REPORT widened     -> green here, but the
#      token's regex then lives in four synchronized copies across two files,
#      and any copy left behind reproduces the failure above SILENTLY.
#   the scope on an ADJACENT line, REPORT untouched  -> green, with the token
#      byte-identical. No consumer can be desynchronized by construction.
#
# So the cases below assert the property that decided it: THE DECLARATIONS DO
# NOT DISTURB SEGMENTATION. Every state-machine case above is re-run with both
# declarations present, and must reach the same verdict it reaches without them.
_sfail = 0
_SEG = [
    ("a scope line does not break the report token",
     f"review-lane report: {'abc1234def'}\nreview-scope: delta\n"
     "finding: should open  x", 1, 'delta', True),
    ("an absent scope is read as `full` (criterion 2, the history's direction)",
     f"review-lane report: {'abc1234def'}\nfinding: should open  x",
     1, 'full', True),
    ("an absent report-complete is read as complete (criterion 1c)",
     f"review-lane report: {'abc1234def'}\nfinding: should open  x",
     1, 'full', True),
    ("a matching count counts",
     f"review-lane report: {'abc1234def'}\nreview-scope: full\n"
     "finding: should open  x\nfinding: nit open  y\n"
     "report-complete: 2 findings", 2, 'full', True),
    ("a FRAGMENT counts as nothing — declares 5, carries 1",
     f"review-lane report: {'abc1234def'}\nfinding: should open  x\n"
     "report-complete: 5 findings", 1, 'full', False),
    ("a report declaring MORE findings than it carries is also a fragment",
     f"review-lane report: {'abc1234def'}\nreport-complete: 1 findings",
     0, 'full', False),
    ("zero findings, declared zero, counts — an empty record is a record",
     f"review-lane report: {'abc1234def'}\nreport-complete: 0 findings",
     0, 'full', True),
    ("findings written PAST the terminal token break count equality",
     f"review-lane report: {'abc1234def'}\nfinding: should open  x\n"
     "report-complete: 1 findings\nfinding: nit open  y", 2, 'full', False),
    ("MENTIONING the tokens in prose declares nothing (use vs mention, "
     "kogaki#41)",
     f"review-lane report: {'abc1234def'}\nI set review-scope: delta here, "
     "and report-complete: 9 findings is the token.\nfinding: should open  x",
     1, 'full', True),
    ("the FIRST declaration wins; a later line cannot revise it",
     f"review-lane report: {'abc1234def'}\nreview-scope: delta\n"
     "review-scope: full\nfinding: should open  x\n"
     "report-complete: 1 findings\nreport-complete: 99 findings",
     1, 'delta', True),
    ("declarations before any report belong to no segment",
     f"review-scope: delta\nreport-complete: 7 findings\n"
     f"review-lane report: {'abc1234def'}\nfinding: should open  x",
     1, 'full', True),
]
for _label, _bodies, _nf, _scope, _counted in _SEG:
    _segs = segments(_bodies)
    if len(_segs) != 1:
        print(f"FAIL declaration fixture [{_label}]: segmentation produced "
              f"{len(_segs)} segment(s), want 1 — the declarations must not "
              "disturb the report token")
        _sfail = 1
        continue
    _s = _segs[0]
    _got = (len(_s['findings']), scope_of(_s), counted(_s))
    if _got != (_nf, _scope, _counted):
        print(f"FAIL declaration fixture [{_label}]: "
              f"(findings, scope, counted)={_got}, "
              f"want {(_nf, _scope, _counted)}")
        _sfail = 1
if _sfail:
    print("FAIL: the scope and completeness declarations are not read as one "
          "grammar over the existing segmenter")
    sys.exit(1)
print(f"declaration pass: {len(_SEG)}/{len(_SEG)} grammar cases (scope "
      "declared / absent-is-full / complete absent-is-complete / count "
      "equality / fragment / past-the-terminal-token / use-vs-mention / "
      "first-declaration-wins / pre-report lines bind to nothing)")

# The declarations must not change any verdict the state machine already
# reaches — asserted by re-running every case above with both lines present.
_gfail = 0
def _declare(bodies):
    """Add a scope line and a matching terminal count to every segment."""
    out, buf = [], []

    def flush():
        if buf:
            n = sum(1 for l in buf if FINDING.match(l))
            out.extend([buf[0], "review-scope: full", *buf[1:],
                        f"report-complete: {n} findings"])
    for line in bodies.splitlines():
        if REPORT.match(line):
            flush()
            buf[:] = [line]
        elif buf:
            buf.append(line)
        else:
            out.append(line)
    flush()
    return "\n".join(out)


# `_ALL` for the same reason the cases above take it: these are the SAME
# bodies, whose synthetic shas stand for real earlier heads (kogaki#91).
for _n, _b, _h, _w in FIX:
    if decide(_declare(_b), _h, _ALL) != _w:
        print(f"FAIL declared-state fixture [{_n}]: "
              f"got {decide(_declare(_b), _h, _ALL)!r}, want {_w!r}")
        _gfail = 1
for _n, _b, _h, _w in DRIVE:
    if drives_fix(_declare(_b), _h, _ALL) != _w:
        print(f"FAIL declared-drive fixture [{_n}]: "
              f"got {drives_fix(_declare(_b), _h, _ALL)}, want {_w}")
        _gfail = 1
# And a FRAGMENT for the current head is NOT a reviewed head: the state falls
# through to the round it would have been without any report.
for _n, _b, _h, _w in [
    ("a fragment for this head does not produce `done`",
     f"review-lane report: {H}\nfinding: should open  x\n"
     "report-complete: 4 findings", H, 'spawn-round-2'),
    ("a fragment does not produce `author-owes` either",
     f"review-lane report: {H}\nfinding: blocking open [harm: x]  x\n"
     "report-complete: 4 findings", H, 'spawn-round-2'),
    ("a fragment still SPENT its round — two of them park",
     f"review-lane report: 9999999\nreview-lane report: {H}\n"
     "finding: should open  x\nreport-complete: 4 findings", H, 'park'),
    ("a COMPLETE report beside a fragment for the same head still counts",
     f"review-lane report: {H}\nreport-complete: 4 findings\n"
     f"review-lane report: {H}\nfinding: should open  x\n"
     "report-complete: 1 findings", H, 'done'),
]:
    _got = decide(_b, _h, _ALL)
    if _got != _w:
        print(f"FAIL fragment fixture [{_n}]: got {_got!r}, want {_w!r}")
        _gfail = 1
for _n, _b, _h, _w in [
    ("a counted report's declared scope is read", f"review-lane report: {H}\n"
     "review-scope: delta\nreport-complete: 0 findings", H, ('delta', True)),
    ("an undeclared scope reads `full`, marked as the default",
     f"review-lane report: {H}", H, ('full', False)),
    ("a fragment's scope is not read — it is not a report",
     f"review-lane report: {H}\nreview-scope: delta\n"
     "report-complete: 3 findings", H, (None, False)),
]:
    if head_scope(_b, _h) != _w:
        print(f"FAIL scope-surface fixture [{_n}]: got {head_scope(_b, _h)}, "
              f"want {_w}")
        _gfail = 1
if _gfail:
    print("FAIL: the declarations changed a verdict the state machine already "
          "reached, or a fragment was counted as a review")
    sys.exit(1)
print(f"declared-state pass: {len(FIX) + len(DRIVE)}/{len(FIX) + len(DRIVE)} "
      "cases re-run with both declarations present (same verdicts), plus 4 "
      "fragment cases (no done / no author-owes / the round was still spent / "
      "a complete report beside a fragment counts) and 3 scope-surface cases")

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
    # The head BRANCH, read from the same `gh` call the head sha comes from
    # rather than resolved by a second API call (kogaki#61). The fixer's
    # worktree checks it out; the reviewer's is detached at the sha.
    head_ref = pr.get("headRefName") or ""
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
    # WHAT THE REPORT ATTESTS TO IS PART OF THE LINE (§4 clause 5). The gate
    # reads presence and open-blocking identically whatever the round, so a
    # delta review is invisible unless the declaration is said out loud — and
    # this is the operator's view of the same fact the report carries. `by
    # default` marks a scope nobody declared, which is not the same claim as a
    # reviewer who wrote `full`.
    _scope, _declared = head_scope(bodies, head)
    if _scope:
        counts[f'scope-{_scope}'] = counts.get(f'scope-{_scope}', 0) + 1
        print(f"  #{n}: report scope {_scope}"
              + ("" if _declared else " (declared by nobody — read as `full`, "
                                     "the compatibility default)"))
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
            # DRY RUN POSTS NOTHING (kogaki#76). This tool's own contract
            # is that --dry-run "reports and mutates nothing", and it prints
            # that sentence at the end of every dry run — while both
            # park-postmortem posts ran unconditioned on the mode. A PR comment
            # is an outward act, which is the exact ground SPAWNING IS OPT-IN
            # already states one function away; leaving the post ungated made
            # the tool violate a contract it announces about itself.
            _stub = (f"park-postmortem: {MAX_ROUNDS} rounds spent, "
                     f"justified blocking findings still open at {head[:7]} "
                     "— class: unresolved-blocking. A park is a pipeline "
                     "defect measured against the 1-in-100 budget "
                     "(kogaki#72); owner decision owed.")
            if mode == 'spawn':
                r = subprocess.run(["gh", "pr", "comment", str(n), "--body", _stub],
                                   check=False)
                if r.returncode != 0:
                    print(f"  #{n}: FAIL park-postmortem post exited {r.returncode} "
                          "— the park stands but its stub did not reach the PR; "
                          "posting it by hand is owed (PR #73 review, round 1).")
                    spawn_failures += 1
            else:
                print(f"  #{n}: would post park-postmortem (--dry-run): {_stub}")
            counts['park'] = counts.get('park', 0) + 1
        elif mode == 'spawn':
            # Numbered by the round whose findings it answers, not by the round
            # its push will start: `pr-N-round-1.log` and `pr-N-fix-1.log` are
            # then the two halves of one exchange, which is how a rally is read
            # afterwards. Numbering it by the round it causes would pair each
            # fix with the review it has not provoked yet.
            log_path = fix_log_path(n, used)
            print(f"  #{n}: spawning FIX for round {used}'s findings "
                  f"[model {FIX_MODEL}, max-turns {MAX_TURNS}, worktree under "
                  f"{WORKTREE_ROOT} on branch {head_ref or '(unknown)'}] "
                  f"-> {log_path}")
            result = spawn(FIX_PROMPT.format(n=n), log_path, model=FIX_MODEL,
                           tools=FIX_TOOLS, ref=head_ref, detach=False,
                           tag=f"fix-{n}")
            if result != 0:
                print(f"  #{n}: FAIL fix spawn exited {result} — the findings "
                      "are still open and no push happened, so no round was "
                      f"started. Route: {log_path}")
                spawn_failures += 1
                counts['fix-failed'] = counts.get('fix-failed', 0) + 1
            else:
                counts['fix-spawned'] = counts.get('fix-spawned', 0) + 1
        else:
            # The preview names the WORKTREE it would create on the same
            # ground it already names the model and the cap (kogaki#61): a
            # dry run exists so the operator does not have to read the source
            # to learn what the spawn will run under, and where the session
            # will work is exactly that.
            print(f"  #{n}: would spawn FIX for round {used}'s findings "
                  f"[model {FIX_MODEL}, max-turns {MAX_TURNS}, "
                  f"{len(FIX_TOOLS.split(','))} granted tools, worktree "
                  f"{os.path.join(WORKTREE_ROOT, f'kogaki-fix-{n}-XXXX', 'tree')} "
                  f"on branch {head_ref or '(unknown)'}] -> "
                  f"{fix_log_path(n, used)} (--dry-run; pass --spawn to act)")
    elif state == 'park':
        print(f"  #{n}: PARKED — {MAX_ROUNDS} rounds spent and {head[:7]} is "
              "still unreviewed. §4 clause 3: this is an owner decision, "
              "never a third round.")
        # Same dry-run guard as the branch above (kogaki#76) — both posts were
        # unconditioned, so a dry run mutated two PR surfaces, not one.
        _stub = (f"park-postmortem: {MAX_ROUNDS} rounds spent and {head[:7]} "
                 "is still unreviewed — class: unreviewed-head (a push "
                 "landed after the final round). A park is a pipeline "
                 "defect measured against the 1-in-100 budget (kogaki#72); "
                 "owner decision owed.")
        if mode == 'spawn':
            r = subprocess.run(["gh", "pr", "comment", str(n), "--body", _stub],
                               check=False)
            if r.returncode != 0:
                print(f"  #{n}: FAIL park-postmortem post exited {r.returncode} "
                      "— the park stands but its stub did not reach the PR; "
                      "posting it by hand is owed (PR #73 review, round 1).")
                spawn_failures += 1
        else:
            print(f"  #{n}: would post park-postmortem (--dry-run): {_stub}")
    else:
        rnd = state.rsplit('-', 1)[1]
        # The tier is resolved from the DIFF, on both paths, and the line names
        # the class that produced it — or says the fallback did (kogaki#81).
        # Named on `--spawn` too because the hook takes that path: a fallback
        # announced only in the preview fires invisibly where it matters.
        r_model, r_turns, tier_label = review_policy(diff_paths(n))
        if mode == 'spawn':
            log_path = spawn_log_path(n, rnd)
            print(f"  #{n}: {tier_label}")
            print(f"  #{n}: spawning review round {rnd} for {head[:7]} "
                  f"[model {r_model}, max-turns {r_turns}, worktree under "
                  f"{WORKTREE_ROOT} detached at {head[:7]}] -> {log_path}")
            # A failed spawn is a FAILURE, reported and reflected in the exit
            # code — a sweep that prints "spawning" over a dead binary is the
            # exact fail-open its own substrate check refuses, one level down
            # (PR #46 review, round 1). check=False + inspection rather than
            # check=True: one PR's failed spawn must not abort the sweep of
            # the rest.
            result = spawn(f"/review-lane {n}" + POSTING, log_path,
                           model=r_model, tools=REVIEW_TOOLS,
                           ref=head, detach=True, tag=f"review-{n}",
                           max_turns=r_turns)
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
                print(f"  #{n}: if the turn cap ({r_turns}) was reached, the "
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
                # The run's cost goes at the end of the report it belongs to
                # (kogaki#81), on the degraded path too: a degraded review's
                # cost is exactly the number tier tuning must not lose.
                report_cost(n, head, allowed, log_path, r_model)
        else:
            # The dry run names the policy it WOULD spawn under. A preview that
            # withheld the model and the cap would leave the operator checking
            # the one thing a dry run exists to show them by reading the source.
            print(f"  #{n}: {tier_label}")
            print(f"  #{n}: would spawn review round {rnd} for {head[:7]} "
                  f"[model {r_model}, max-turns {r_turns}, "
                  f"{len(REVIEW_TOOLS.split(','))} granted tools, worktree "
                  f"{os.path.join(WORKTREE_ROOT, f'kogaki-review-{n}-XXXX', 'tree')} "
                  f"detached at {head[:7]}] -> "
                  f"{spawn_log_path(n, rnd)} (--dry-run; pass --spawn to act)")

print(f"swept {len(prs)} open PR(s): "
      + ", ".join(f"{k} {v}" for k, v in sorted(counts.items())))
if mode != 'spawn':
    print("dry run — nothing was spawned. Spawning is an outward act and is "
          "opt-in rather than a flag someone forgets is on.")
# A LEAKED WORKTREE IS REPORTED AND REFLECTED IN THE EXIT CODE (kogaki#61).
# Named again at the end rather than only where it happened: the per-spawn
# line scrolls past inside a sweep of fifty PRs, and a leak the operator has
# to clean up by hand is exactly the thing a summary owes them. It is kept
# separate from spawn_failures because a leak is not a failed review — the
# session it belonged to may have succeeded, and its PR must not be told a
# story about a spawn that worked.
if WORKTREE_LEAKS:
    print(f"FAIL {len(WORKTREE_LEAKS)} worktree(s) could not be removed and "
          "are LEAKED — clean up by hand (`git worktree remove --force`, then "
          "`git worktree prune`):")
    for _tree, _why in WORKTREE_LEAKS:
        print(f"  {_tree} — {_why}")
if spawn_failures or WORKTREE_LEAKS:
    sys.exit(1)
PYEOF
