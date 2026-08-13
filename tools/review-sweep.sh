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
# THE SECOND EXERCISE (kogaki#74, 2026-08-06) — and it moved ONE member.
# The issue arrived carrying a list of denial labels harvested from five rounds
# of route logs, with the expectation that each becomes a grant. Exercised the
# same way the first table was, one command per shape against a fixed grant
# list, the list did not survive contact:
#
#   gh pr view 91 --json number                       ALLOWED
#   gh pr diff 91 --name-only | head -5               ALLOWED  (a PIPE decomposes)
#   bash checks/check-review-report.sh 2>&1           ALLOWED  (a REDIRECT does not defeat it)
#   for n in 1 2; do git log -1 --format=%h; done     ALLOWED  (a LOOP is not unmatchable)
#   CONSULT_BASE_SHA=HEAD bash checks/check-...sh     DENIED
#   git -C <worktree> log -1 --format=%h              DENIED
#   gh api repos/<o>/<r>/commits/<sha> --jq .sha      DENIED
#   python3 -c "print(1)"                             DENIED
#
# Three of the harvested shapes were NOT denials of the shape at all. The route
# log's label is the command's FIRST THREE WORDS (see denied_tools below), so a
# pipe, a redirect and a loop all *print* as if the leading command were
# refused; they are not, and three of the eight proposed grants would have been
# entries for a denial that never happened. That is the accretion tell arriving
# through the front door — the list would have grown by three members with no
# defect behind any of them.
#
# Of the four real denials, exactly ONE is expressible-and-bounded, and it is
# the one the issue names first: `Write`. It is a TOOL, not a shell prefix, so
# granting it widens the surface by one named capability and by nothing else.
# It ships. The other three do not, and the reason is measured rather than
# argued:
#
#   ENV-PREFIXED — PROVEN UNMATCHABLE, not merely missing. With
#   `Bash(CONSULT_BASE_SHA=HEAD bash checks/check-review-report.sh:*)` granted,
#   `CONSULT_BASE_SHA=HEAD …` is ALLOWED and `CONSULT_BASE_SHA=74d4ccd …` is
#   DENIED. The assignment is part of the matched prefix, so the grant is
#   PER VALUE — and the value here is a sha. A literal-prefix allowlist would
#   need one entry per commit, which is the tell exactly: "a check suite
#   growing at roughly one member per incident"
#   (consulted: product-lab@f918c515 LESSONS.md:45).
#
#   `git -C <worktree>` — `Bash(git -C:*)` makes it ALLOWED and is refused
#   anyway: it grants git in ANY directory, including `git push`, which is the
#   §4 clause 2 prohibition the reviewer's --detach exists to enforce. This is
#   round 2's `Bash(bash:*)` mistake in a new costume — a coverage gap traded
#   for an unbounded grant.
#
#   `gh api` — `Bash(gh api:*)` makes it ALLOWED and is refused on the same
#   ground: `gh api -X DELETE …` matches it. `gh api` is a general HTTP client
#   the way `bash` is a general shell.
#
#   `python3` — refused without exercise for the reason already written above:
#   a general interpreter dissolves the enumeration rather than completing it.
#
# So the answer to three of the four is NOT a grant, and this is the whole
# point of the entry: where free composition is irreducible the served position
# is to SHRINK the surface rather than police it better, and here it is
# reducible — every one of the three has a granted alternative that needs no
# new grant at all, because the reviewer's own execution context already
# supplies what it was composing around:
#
#   env-prefixed check   -> run the check BARE. Both checks resolve their own
#                           base from `git merge-base origin/master HEAD` when
#                           $CONSULT_BASE_SHA is empty, and the worktree has
#                           `origin/master`. The prefix was never needed.
#   git -C <worktree>    -> run BARE git. `spawn()` passes `cwd=tree`, so the
#                           session's cwd IS the worktree it was reaching into.
#   gh api …/commits/sha -> `gh pr view <n> --json headRefOid`, already granted
#                           — and reading the head as a VALUE rather than
#                           reconstructing it is kogaki#91's half of the same
#                           surface.
#
# That is what COMPOSITION below carries into the reviewer's prompt. The
# grant table gained one member; the other three shapes were removed from the
# reviewer's repertoire instead of being admitted to the table.
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
# findings still open, no fix is spawned ON THIS BRANCH at all: a fix landing
# there could never be reviewed, and spawning it would produce unreviewed work
# and call it progress. That half is unchanged and is why `drives_fix()` still
# tests `rounds_used < MAX_ROUNDS`.
#
# WHAT CHANGED IS WHAT HAPPENS INSTEAD (kogaki#338, owner selection
# 2026-08-11). The old next state was `park` by construction — and `park` has
# no next act, so the lane STOPPED PRODUCING HEADS: the author held findings, a
# bound forbidding the fix in place, and nothing that could make a reviewable
# change. The bound was meant to end a rally, not to end the work.
#
# So at that state the fixes are BORN AS THE SUCCESSOR CHANGE. `decide()`
# returns `supersede` and the driver announces it on the PR, naming every
# finding the successor owes a disposition for.
#
# WHAT IS SHIPPED HERE IS THE STATE AND ITS NOTICE, NOT THE CREATION ACT.
# The owner selected the LANE's own driver as the actor that opens the
# successor PR and closes the blocked one; that act is a NAMED SLOT and is not
# built at this head — the branch performs no `gh pr create`, no `pr close` and
# spawns no fixer. Stated here rather than only in the PR record, because at
# this head the dead end is RENAMED and not yet removed, and a reader meeting
# only this file would otherwise read the act as done (PR #341 review round 1,
# should). The successor
# is a NEW OBJECT WITH ITS OWN BOUND — not the counter reset §4 clause 3
# forbids, because that prohibition is on re-opening rounds on a MUTABLE
# object and the discriminator is object identity, not intent.
#
# THE TRIGGER IS THE PARK-PRODUCING STATE AND NOTHING WIDER: rounds spent AND
# open blocking findings on the current head. A round-2 report whose findings
# are all non-gating still reaches `done` and still merges under clause 8's
# grammar — there is nothing for a successor to carry. Narrowest replacement
# that removes the dead end; no other transition moves.
#
# THE GRANT PATH IS UNCHANGED. The successor's first round is round 1 of a new
# PR and needs its own grant through the ordinary path, never inherited from
# the PR it supersedes.
#
# THE DIVISION THAT SENTENCE DESCRIBED HAS MOVED (2026-08-11, kogaki#357). It
# used to read "kogaki#306 stays its own carrier: it owns the REFUSAL surface";
# kogaki#306 held three slots and now holds one. The REFUSAL surface — what the
# grant path says when someone ASKS for a round beyond the bound — is folded
# into **kogaki#305**, where its code path is and where its precondition lives:
# #305's own finding is that the bound is absent from the grant-minting path, so
# there is no minting act for a refusal to attach to. The successor's DECLARED
# OBLIGATIONS and the FALSIFICATION CHECK are `specs/SPEC.md` §4 **clause 11**,
# carried at `checks/check-review-report.sh`. This file still owns what the lane
# does when nobody asks, which is the one thing none of those cover.
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
#   reflexive tools/review-sweep.sh, .claude/skills/review-lane/**
#            -> opus,   60 turns   ($KOGAKI_REVIEW_TIER_REFLEXIVE_PATHS)
#            MATCHED FIRST, above the careful/ordinary axis (kogaki#99).
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
# A ROUND IS A CYCLE, NOT A SEGMENT (kogaki#190). The rule above says which
# segments are eligible to be counted; it does not say what a round IS, and
# counting the eligible segments assumed one segment per round. Two reviewers
# landing on the SAME head produce two segments and spend the whole two-round
# cap without a single rally cycle completing — the author never got the thing
# a spent round buys them, which is a chance to move the head. Four cap
# incidents in one session came through that gap, and no stricter rule about
# which SEGMENTS count could have closed it, because the defect is the unit.
#
# So `rally_cycles()` groups performed segments BY HEAD: a head reviewed by
# three reviewers is one round.
#
# The same function closes the opposite error, which is the one #190 was filed
# about. A spawned session whose report could not be READ left no trace in the
# comment bodies at all, so it cost the operator a real review and cost the
# budget nothing — an unbounded number of them could repeat against a cap that
# never moved. That fact is now WRITTEN where the budget looks, under its own
# token (`review-round-unverified:`), and the two halves count differently on
# purpose: reports at one head collapse into one cycle, unverified marks do
# not, and a performed report SUBSUMES a mark at its own head so the PR #174
# specimen — the report had landed, the read failed at that instant — is
# charged exactly once.
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
              --json number,headRefOid,baseRefOid,headRefName,author,isCrossRepository 2>/dev/null)"; then
    echo "FAIL could not establish the substrate: gh pr view $TARGET_PR failed." >&2
    exit 1
  fi
  prs="[$one]"
elif [ -n "$TARGET_BRANCH" ]; then
  if ! prs="$(gh pr list --state open --head "$TARGET_BRANCH" \
              --json number,headRefOid,baseRefOid,headRefName,author,isCrossRepository 2>/dev/null)"; then
    echo "FAIL could not establish the substrate: the gh lookup failed." >&2
    exit 1
  fi
  if [ "$prs" = "[]" ]; then
    echo "no open PR for branch $TARGET_BRANCH — a push before PR creation is normal; nothing to do"
    exit 0
  fi
elif ! prs="$(gh pr list --state open --limit "$LIMIT" \
            --json number,headRefOid,baseRefOid,headRefName,author,isCrossRepository 2>/dev/null)"; then
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
# THE REFLEXIVE CLASS (kogaki#99) — a diff that touches the REVIEWING
# INSTRUMENT ITSELF. It is a THIRD CLASS above both, with its own trigger,
# resolved FIRST, and NOT two paths appended to the careful list: appending
# would have said "review-sweep.sh is careful for the same reason specs/ is",
# and it is not — it is careful because the diff is editing the thing doing the
# reviewing, and the run's line has to be able to say that. It carries the
# CAREFUL tier's model and cap (REVIEW_MODEL/REVIEW_MAX_TURNS), no third pair
# of knobs: nothing measured asks for a cap above 60, and inventing one would
# be a number with no evidence under it.
#
# Measured on PR #98: `tools/review-sweep.sh` and
# `.claude/skills/review-lane/SKILL.md` are both ORDINARY by path
# (`tools/**`, `.claude/skills/**`), so two consecutive reviewers of the
# reviewer ran at sonnet/24, both ended `error_max_turns` at 25 turns, ~$2
# spent, NO REPORT POSTED. The classifier was calling its own instrument cheap.
#
# THE MEMBER LIST IS DELIBERATELY NARROW — the two members the measured defect
# names, and no more. A deliberately narrow instrument owes a NAMED TRIGGER
# that widens or escalates it
# (consulted: product-lab@f918c515 topics/knowledge-architecture.md:51).
# `KOGAKI_REVIEW_TIER_REFLEXIVE_PATHS` has the same shape as the other two
# overrides, so widening the class is a declaration an operator makes rather
# than an edit to this file.
#
# THAT OVERRIDE IS THE WIDENING MECHANISM AND IS NOT THE TRIGGER, and the two
# are not the same thing. The served position's load-bearing half is
# structural: "the trigger cannot live inside the instrument … the escape
# trigger must be a DIFFERENT-UNIT observer" — per-item judgment cannot see
# recurrence by construction, and this table is per-item by construction. An
# operator setting the override has to ALREADY KNOW a third path deserves
# membership; nothing here observes that it keeps deserving one and fires. So:
#
#   instrument: none — for the widening trigger. Declared at authoring, per
#   the rule that a held item names an act that ALREADY HAPPENS and observes
#   the quantity its trigger fires on, or declares `instrument: none`.
#
# (consulted: product-lab@f918c515 topics/knowledge-architecture.md:9,
#  gloss/lessons/testing.md:131 — "Shipping with none of these is fine only if
#  you write down that you are doing so and what would make you revisit it.")
# Declared rather than fabricated: no act in this repo today counts reviews
# that stalled on a path outside the list, and inventing an observer that
# cannot be pointed at would be worse than none — its silence would read as
# the class being right. WHAT WOULD MAKE THIS REVISITED: a second measured
# stall, on a path this table does not name. The candidate carrier, named so a
# later sitting does not re-derive it: the spawn log under `REVIEW_LOG_DIR`
# already carries the `=== spawn:` line (hence the model and cap actually
# used) and the raw result stream (hence `error_max_turns` when it happens),
# so counting stalls by tier is an act that already happens plus one field —
# the resolved CLASS is the field the log does not carry today. That is a
# carrier PROPOSAL, not a decision, and building it is not licensed here.
#
# `checks/check-review-report.sh` is a KNOWN OPEN QUESTION and is NOT a member:
# it is already careful via `checks/**`, so membership carries no behavioural
# delta today — only a different reported class — and that is not decided here.
TIER_REFLEXIVE_PATHS="${KOGAKI_REVIEW_TIER_REFLEXIVE_PATHS:-\
tools/review-sweep.sh,.claude/skills/review-lane/**}"
REVIEW_LOG_DIR="${KOGAKI_REVIEW_LOG_DIR:-$HOME/.kogaki/reviews}"
# Where "outside the repository" is (kogaki#61). The system temp root, which
# is outside every repository by construction; an operator who wants a
# different home declares it here rather than in a call site. It is resolved
# in the shell beside every other spawned-session knob for the same reason
# they are: one place to read, one place to change.
SPAWN_WORKTREE_ROOT="${KOGAKI_SPAWN_WORKTREE_ROOT:-${TMPDIR:-/tmp}}"

# How long a round log with no terminal line still counts as IN FLIGHT
# (kogaki#204). Declared here rather than derived, because it is a JUDGMENT:
# too short and a slow reviewer gets a second session spawned on top of it,
# too long and a killed spawn blocks its round until someone notices. A
# judgment that lives only in code is one nobody can see they are relying on,
# which is why it sits beside every other spawned-session knob. The default is
# generous against the observed spread — the two rounds measured this month
# ran 3.3 and 5.5 minutes — because the failure it guards (a re-fired trigger
# spending the whole cap) costs more than a delayed retry.
SPAWN_INFLIGHT_TTL="${KOGAKI_SPAWN_INFLIGHT_TTL:-1800}"

# The reviewer reads the PR, runs the registered checks, consults the served
# seam, and posts its report. `gh pr comment` is granted HERE and withheld
# from the fixer below — that asymmetry is the presence gate's, not a
# preference. Never --dangerously-skip-permissions: this repository is public
# and the user-level merge deny must stay meaningful.
# One grant per REGISTERED check, derived rather than typed — see the header.
# A registry that cannot be read yields no check grants at all, which fails
# toward the narrow side: the reviewer reports cannot-determine (loudly, via
# the denial comment) instead of silently receiving a wider grant than intended.
#
# `Write` is the ONE member kogaki#74's exercise added (header, second
# exercise). It is what makes the #70 post-once rule implementable rather than
# aspirational: a large report composes to a file and posts in a single
# `gh pr comment --body-file`, where the heredoc form obliged the reviewer to
# hold the whole body in one shell argument. It is a TOOL rather than a shell
# prefix, so it is bounded by construction — it cannot become a general
# interpreter the way `Bash(bash:*)` or `Bash(gh api:*)` can.
CHECK_TOOLS="$(python3 - <<'GRANTS' 2>/dev/null || true
import json
try:
    reg = json.load(open("checks/registry.json"))
except Exception:
    raise SystemExit(0)
print(",".join(f"Bash(bash checks/{c['file']}:*)" for c in reg.get("checks", [])))
GRANTS
)"

# `Edit` IS GRANTED TO THE REVIEW ROLE (kogaki#310, owner selection
# 2026-08-09), and it is NOT a capability increase. The role already holds
# `Write`, and anything `Edit` does to a file `Write` does by overwriting it —
# so the asymmetry against FIX_TOOLS below granted the fixer no capability
# class the reviewer lacked. It only made the reviewer take a clumsier route,
# and when it did not, the round DIED: PR #313's round 1 exited 1 with no
# report, spending one owner grant and one of the two rounds §4 clause 3
# allows.
#
# NO `Bash(grep...)` MEMBER IS ADDED, and that is the more interesting half.
# kogaki#310 was filed on the premise that shell grep is denied by its absence
# here. Story 1.47 AC 2 required the shape be EXERCISED HEADLESS before it
# shipped — the file's own rule (kogaki#74) — and the exercise falsified the
# premise: under this exact allowlist minus Edit, `grep -c ...` and
# `<granted> | grep ...` both RAN, while `rm -f` and `Edit` were refused. The
# probe discriminates in both directions, so it is not merely permissive.
# Adding the member would have grown the enumeration by an entry with no
# defect behind it, which is precisely what kogaki#74's warning exists to
# prevent. The original round-2 grep denial therefore had another cause; the
# leading suspect is this file's own terminal_key() gate, and it is recorded
# on the issue rather than guessed at here.
REVIEW_TOOLS="${KOGAKI_REVIEW_TOOLS:-\
Bash(gh pr view:*),Bash(gh pr diff:*),Bash(gh pr checks:*),Bash(gh pr list:*),\
Bash(gh issue view:*),Bash(gh issue comment:*),Bash(gh pr comment:*),Bash(gh run:*),\
${CHECK_TOOLS:+$CHECK_TOOLS,}\
Bash(git log:*),Bash(git diff:*),Bash(git show:*),Read,Grep,Glob,Edit,Write,\
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
SWEEP_INFLIGHT_TTL="$SPAWN_INFLIGHT_TTL" \
SWEEP_TIER_REFLEXIVE_PATHS="$TIER_REFLEXIVE_PATHS" \
SWEEP_TIER_CAREFUL_PATHS="$TIER_CAREFUL_PATHS" \
SWEEP_TIER_ORDINARY_PATHS="$TIER_ORDINARY_PATHS" \
SWEEP_TIER_ORDINARY_MODEL="$TIER_ORDINARY_MODEL" \
SWEEP_TIER_ORDINARY_MAX_TURNS="$TIER_ORDINARY_MAX_TURNS" \
SWEEP_MODEL_PINNED="$REVIEW_MODEL_PINNED" \
SWEEP_MAX_TURNS_PINNED="$REVIEW_MAX_TURNS_PINNED" \
python3 <<'PYEOF'
import fnmatch, json, os, re, shutil, subprocess, sys, tempfile, time

# THE HEAD-RESOLUTION UNIT IS LOADED, NEVER RESTATED (§4 clause 7 v2,
# kogaki#308). `same_head` and `head_segments` used to be defined here and the
# merge gate defined its own; the two answered "is this head reviewed?" with
# different units and the disagreement cost an owner grant and a review round
# per moved head. `segments()` below stays LOCAL and duplicated on its own
# ratified grounds — clause 7 v2 shares the RESOLUTION, never the parser.
HEAD_RESOLUTION_PATH = "lib/head_resolution.py"
with open(HEAD_RESOLUTION_PATH, encoding="utf-8") as _fh:
    exec(compile(_fh.read(), HEAD_RESOLUTION_PATH, "exec"))

# THE DISPOSITION GRAMMAR MOVED OUT AND IS LOADED (§4 clause 11, kogaki#357).
# `DISPOSITION`, `CARRIER` and `disposition_ok` were defined here and are now
# `lib/disposition.py`, because clause 11 gives `checks/check-review-report.sh` a
# second, independent reason to read the same grammar — and clause 8 names a
# second vocabulary for "what happened to a finding" as a synonym in a join key.
# Nothing about the values moved: the pattern and the predicate are byte-identical
# to what stood here, so every reader below is unchanged.
DISPOSITION_PATH = "lib/disposition.py"
with open(DISPOSITION_PATH, encoding="utf-8") as _fh:
    exec(compile(_fh.read(), DISPOSITION_PATH, "exec"))

# CLAUSE 12'S ADJUDICATION GRAMMAR AND ITS JOIN ARE LOADED, NEVER RESTATED
# (§4 clause 12, kogaki#269; this consumer added by kogaki#288). `decide()`
# read only the CURRENT head's segments, so it returned `done` on a PR the
# merge gate was refusing on an unadjudicated EARLIER-head blocking: no round
# spawned, no `author-owes`, nothing for the author to push, and this tool's
# own output announcing a terminal state the merge layer contradicted.
# Re-deriving the predicate here was the declined arm — a divergent join does
# not disagree, it returns NOTHING, which is the same false `done` wearing a
# fix's clothes.
ADJUDICATION_PATH = "lib/adjudication.py"
with open(ADJUDICATION_PATH, encoding="utf-8") as _fh:
    exec(compile(_fh.read(), ADJUDICATION_PATH, "exec"))

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
# §4 clause 7's `review-base:` — READ HERE FOR THE FIRST TIME (v2, kogaki#308).
# This file contained the string `review-base` exactly once, inside the prompt
# telling the reviewer to WRITE the line, and never read it. That is why
# `decide()` could not use the carry-forward the merge gate computes: the unit
# needs A's declared base and the sweep's segments carried none. Anchored
# WHOLE, same 7-40 hex sha, same single pass, FIRST DECLARATION WINS — the
# grammar `checks/check-review-report.sh:310` already fixed, matched here
# rather than re-decided, or the two parsers become the next pair that
# disagree.
BASE = re.compile(r'^\s*review-base:\s*([0-9a-f]{7,40})\s*$', re.M)
# A SPAWNED ROUND WHOSE OUTCOME COULD NOT BE READ (kogaki#190). Its own token,
# on the same anchored-whole-line grammar as the three above, and DELIBERATELY
# NOT the report token: `segments()` never opens a segment for it, so it can
# satisfy neither the presence check, nor `counted()`, nor `head_scope()`, and
# `decide()` can never reach `done` or `author-owes` through it. What it does
# reach is the CYCLE COUNT — see `rally_cycles()`. That is the whole of AC 1
# and AC 2: representable to the budget, and never an assertion that a review
# landed.
UNVERIFIED = re.compile(r'^\s*review-round-unverified:\s*([0-9a-f]{7,40})\s*$',
                        re.M)
# §4 clause 8 (kogaki#224) — THE DISPOSITION OF A NON-GATING FINDING. Fourth
# declaration on the SAME adjacent-line grammar, for the third time on the same
# ground: the `finding:` token stays byte-identical, so no reader of it can be
# desynchronized by construction.
#
# It binds to the IMMEDIATELY PRECEDING `finding:` line in its segment, which is
# the only thing that makes it a per-FINDING declaration where scope and
# completeness are per-SEGMENT ones. Anchored whole, so `declined:` inside a
# finding's prose is a MENTION and declares nothing (kogaki#41) — which matters
# more here than for its three siblings, because `declined` is ordinary review
# vocabulary and appears in finding text constantly.
#
# WELL-FORMEDNESS IS PART OF THE TOKEN, not a later judgment: `carried:` takes
# an issue number or the literal `register` (§4 clause 8 admits the review
# lane's register, kogaki#246, as a carrier so this does not mint one issue per
# nit; the carrier is named in prose only — the pattern below matches the
# literal token `register` and has never carried an issue number), and
# `declined:` requires a non-empty reason — a bare `declined:` is the
# evaporation with a word in front of it. A malformed one is REPORTED rather
# than silently read as absent, because the two are indistinguishable at the
# boundary otherwise and this file has shipped that shape three times.
# The pattern, the carrier set and the predicate are `lib/disposition.py`,
# loaded above. Kept as a pointer rather than deleted silently: a reader
# arriving at this comment block for the grammar needs to be sent somewhere.


# The severities §4 clause 8 governs. `blocking` is absent by construction: a
# JUSTIFIED blocking gates and never reaches `done` open, and an UNJUSTIFIED one
# is downgraded to `should` by name (kogaki#72) — so it enters this class
# through the downgrade rather than through this tuple, which is why `decide()`
# below reads the downgrade set rather than the severity field alone.
NON_GATING = ('should', 'nit')
# §4 clause 3's bound, READ rather than defined (kogaki#305). This file used to
# assign the literal two to the name below — a second copy of a prose clause,
# and the only place the bound was evaluated at all, which is exactly why a
# grant naming round 3 could be minted and honoured upstream of it. The comment
# is worded to avoid spelling that assignment as a DISCIPLINE, not because
# anything catches it: THE SINGLE-SOURCE PROPERTY IS NOT CHECKED. kogaki#305's
# acceptance plan asked for a grep-shaped check that no numeric bound literal
# survives here or in the hook family, and no such member is in
# `checks/registry.json` — this comment previously asserted one existed, which
# is a claim about coverage that nothing backs. Correcting the claim rather
# than adding the member is an owner decision (2026-08-12): a suite growing one
# member per incident is the tell for being on the detect side, and #364's
# detector was removed on that same ground. The residue is stated plainly — a
# fourth copy of the number could return here and nothing would fail.
# The number now has ONE definition, `.claude/review-lane.json`'s
# `review_rounds_max`, and every layer binds it. Adding a copy here again would
# make TWO — one definition and one copy. The sentence used to say "three",
# which counted nothing this file can point at; an unbacked number inside the
# comment being repaired for an unbacked claim is the same defect twice.
#
# WHY A TRACKED FILE OF ITS OWN, and not `.claude/pipeline.json` where the
# kogaki#305 remedy design first sited it (owner selection 2026-08-09). That
# file is GITIGNORED — machine-local, absent from a fresh clone — and clause 3
# withholds an owner override on the express ground that the bound is raised
# only by "a deliberate, diffable, out-of-band act that leaves a record". A
# gitignored file produces no diff and leaves no record, so siting the bound
# there would have removed the very property standing in for the missing
# override, and would have left NO committed artifact in this repository
# stating the number at all. The name is the lane rather than the pipeline
# because a review-round bound is not a mechanical-gap grant, which is the one
# thing pipeline.json declares.
#
# A missing or unreadable declaration is FATAL, deliberately, and this is the
# opposite of the allowlist read at the eligibility site below. That one
# degrades to `{owner}` because an absent allowlist is a repo that widened
# nothing — a meaningful empty. There is no meaningful empty for a bound: the
# fail-open reading is "unlimited rounds", which is the state clause 3 exists to
# forbid. The toolkit hook family resolves an absent declaration to
# `bound-undeclared` and PROCEEDS, because it is actor-wide and runs against
# repos that ratified no reviewer-round contract; this file is kogaki's own and
# ships beside its declaration, so absence here is a broken checkout rather than
# a repo without the rule.
def _round_bound():
    try:
        with open(".claude/review-lane.json") as f:
            declared = json.load(f)["review_rounds_max"]
    except (FileNotFoundError, KeyError, json.JSONDecodeError) as exc:
        sys.exit("review-sweep: §4 clause 3's round bound is not declared in "
                 f".claude/review-lane.json (`review_rounds_max`): {exc}. The "
                 "sweep refuses rather than running unbounded.")
    if not isinstance(declared, int) or isinstance(declared, bool) or declared < 1:
        sys.exit("review-sweep: `review_rounds_max` in .claude/review-lane.json "
                 f"is {declared!r}, which is not a positive integer. The sweep "
                 "refuses rather than guessing §4 clause 3's bound.")
    return declared


MAX_ROUNDS = _round_bound()

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
# The in-flight window (kogaki#204), read rather than chosen here — see the
# shell knob for why it is a declaration and not a derivation.
INFLIGHT_TTL = int(os.environ["SWEEP_INFLIGHT_TTL"])
REPO_ROOT = os.path.realpath(os.getcwd())

# The tier table (kogaki#81), resolved in the shell above and passed in on the
# same ground every other knob is: two places that both know a default are two
# places that can disagree about it.
TIER_REFLEXIVE_PATHS = [p for p in
                        os.environ["SWEEP_TIER_REFLEXIVE_PATHS"].split(",") if p]
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
    "SINGLE act with `--body-file` — you hold `Write` (kogaki#74), so compose "
    "the report to a file and post it with `gh pr comment <n> --body-file "
    "<path>`; `--body-file -` fed by one heredoc remains correct for a short "
    "report. Then verify "
    "ONCE, with `gh pr view <n> --json comments`, that it landed. If it did "
    "not land, STOP and exit without posting again, and do not re-post a "
    "report you have already posted. On PR #67 a reviewer made FOUR "
    "consecutive `gh pr comment` attempts with the same body: each retry "
    "spends a turn and risks a DUPLICATE `review-lane report:` comment, and a "
    "second segment for one head changes what the sweep counts as rounds."
    "\n\nTHE REPORT DECLARES ITS BASE, ITS SCOPE AND ITS COMPLETENESS "
    "(specs/SPEC.md §4 clauses 5, 6 and 7). Beside the "
    "`review-lane report: <sha>` line, on its own "
    "adjacent line, write `review-base: <base sha>` — the commit you actually "
    "diffed against, from ONE read (`gh pr view <n> --json baseRefOid`) copied "
    "whole, never a sha you assembled from a prefix (kogaki#91). That line is "
    "what lets your report SURVIVE a rebase that changed no content: the merge "
    "check recomputes both diffs and carries the report forward when they are "
    "byte-identical, and it cannot do that without knowing which base yours was "
    "taken against. Omitting it is not a default — it drops the report to a "
    "transitional merge-base fallback that fails toward `stale`. Then, on its "
    "own "
    "adjacent line, write `review-scope: full` or `review-scope: delta`; end "
    "the report with `report-complete: <N> findings`, where N is EXACTLY the "
    "number of `finding:` lines you wrote. A report whose count does not match "
    "is read as a FRAGMENT and counts as nothing — it turns nothing green and "
    "the head stays unreviewed, so write the terminal line last and write it "
    "once. A round-2 review is `delta` by default and `full` whenever the fix "
    "touched files outside the ones round 1's findings named."
    "\n\nEVERY NON-GATING FINDING YOU LEAVE OPEN CARRIES A DISPOSITION "
    "(specs/SPEC.md §4 clause 8, kogaki#224). A `should` or a `nit` never gates "
    "a merge (kogaki#72), which is correct and is not changing — but it means "
    "the merge is the last moment anyone reads your finding, and on PR #221, "
    "#231 and #240 that is exactly what happened: sixteen findings across three "
    "PRs, every merge correct, and the only two repairs came from somebody "
    "re-reading a report BY CHANCE. So on the line AFTER each `finding:` you "
    "leave `open` at `should` or `nit`, write ONE of:"
    "\n  `carried: #<N>`      — the issue that now owns it (file it, then name "
    "it)"
    "\n  `carried: register`  — the review lane's register, kogaki#246, for an "
    "accretion-class "
    "finding whose value is the COUNT rather than the instance; this is what "
    "stops one issue being minted per nit"
    "\n  `declined: <reason>` — an explicit decline. A reason is REQUIRED; a "
    "bare `declined:` is the evaporation with a word in front of it."
    "\nChoose the carrier by WHERE THE DEFECT LIVES, never by severity: in the "
    "diff's own text means resolve it in the review; downstream work the diff "
    "merely licenses means its own carrier. The line is anchored whole, so "
    "writing `declined:` inside a finding's prose declares NOTHING — it must be "
    "its own line. The first disposition on a finding wins. This is REPORTED "
    "and never gated: the sweep's `done` state lists the ones without a "
    "disposition and merges nothing differently, so an honest `declined:` costs "
    "you nothing and an omission costs the finding."
    "\n\nA REFUSAL IS TERMINAL FOR THAT COMMAND (specs/SPEC.md §4, kogaki#100). "
    "If a command you compose is refused, that command is OVER — do not "
    "rephrase it, pipe it, redirect it, or hunt for a form that gets through. "
    "This is ENFORCED, not requested: a gate refuses every rephrasing of an "
    "already-denied command, so the turns are spent for nothing. Write the "
    "dimension you could not cover as its own adjacent line, "
    "`cannot-determine: <dimension> — <why>` (name the DIMENSION and the "
    "missing grant, e.g. `cannot-determine: CI status — `gh run view` is not "
    "granted`), and FINISH the review. That line is reported and never gated: "
    "it is not a finding, it does not count toward `report-complete:`, and it "
    "never blocks. A refused capability costs one dimension, not your report — "
    "and a review missing one dimension is worth far more than no review, "
    "which is what a spawn that spends its last turns rephrasing produces."
)


# The composition constraint, appended to the REVIEWER's prompt only
# (kogaki#74). Three shapes the route logs recorded as denied are NOT admitted
# to the grant table — the header's second exercise records why, and each is
# either per-value unmatchable or expressible only as an unbounded grant. What
# ships instead is this: the shapes are removed from the reviewer's repertoire,
# with the already-granted alternative named beside each, so the reviewer never
# composes the command that would be refused.
#
# It is a prompt rather than a grant because the act being constrained is
# COMPOSITION, and there is no allowlist entry whose absence prevents a session
# from typing a command — the denial already does that, silently and one turn
# too late. This is the generation side of the same fix; the grant table is the
# enumeration, and it stayed the size it was.
#
# RECLASSIFIED: THIS TEXT IS ERGONOMICS, NOT CONTROL (kogaki#100 AC 4). Its
# closing two sentences — "never re-attempt a refused command in another form"
# and "Do not spend turns probing for a form that gets through" — were the
# ONLY carrier of §4's third conduct clause, and prose is advisory to a system
# whose job is to satisfy instructions. It was measured failing on the very
# next PR: on PR #98 this exact text was in the second spawn's own context
# while that spawn spent its last four turns rephrasing one refused command.
#
# The text is KEPT, deliberately. Deleting it would remove a useful hint — the
# granted alternative named beside each refused shape is something no signal
# can compute, and naming one stays this prompt's static job. But it is marked
# here so the next reader does not take it for the carrier again: the carrier
# is the `PreToolUse` denial gate installed by `spawn()` below, and any gate
# upstream of the violation layer counts as ergonomics rather than control —
# which is the served line's own word for it
# (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:87`).
#
# The fixer never gets this, for the same reason it never gets POSTING: it
# holds a different grant list (no `gh pr comment`, no `gh api` question to
# have), and a constraint naming grants it does not hold would be noise it has
# to reason about.
COMPOSITION = (
    "\n\nCOMPOSE ONLY WHAT YOU ARE GRANTED (kogaki#74). Three command shapes "
    "are DENIED by design, not by oversight, and each has a granted "
    "alternative that is strictly better — reach for the alternative rather "
    "than the shape, and never re-attempt a refused command in another form."
    "\n\n1. NO leading environment assignment "
    "(`CONSULT_BASE_SHA=<sha> bash checks/...`). The assignment is part of the "
    "matched prefix, so such a grant would be per-VALUE and the value is a "
    "sha. Run every check BARE — `bash checks/<name>.sh` — and it resolves its "
    "own base from `git merge-base origin/master HEAD`, which is exactly what "
    "you would have supplied."
    "\n\n2. NO `git -C <path>`. You are ALREADY INSIDE the worktree you would "
    "point at: this session's working directory is a fresh worktree detached "
    "at the PR head. Run bare `git log` / `git diff` / `git show`."
    "\n\n3. NO `gh api` and NO `python3`. Whatever you wanted from the API, "
    "`gh pr view <n> --json <fields>` almost certainly serves — in particular "
    "the head sha is `--json headRefOid`, READ AS A VALUE and never assembled "
    "from a short prefix."
    "\n\nIf something you need is genuinely ungranted, say so IN THE REPORT as "
    "a cannot-determine on the dimension it blocked, and finish the review. "
    "Do not spend turns probing for a form that gets through."
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


def resolve_tier(paths, careful_paths=None, ordinary_paths=None,
                 reflexive_paths=None):
    """Resolve (model, max_turns, class, fallback, why) from diff paths.

    `class` is the declared class that produced the tier, or None when the
    fallback did. `fallback` is True in exactly that case, and the caller is
    required to SAY SO on both the spawn and the dry-run path: an unobservable
    non-member fallback is the defect kogaki#65 was filed over.

    The fail-safe side is the careful tier. A needlessly expensive review costs
    about $3; a too-cheap review of an unclassified diff passes the gate
    silently, which is the failure the presence check cannot see.

    THE REFLEXIVE CLASS IS RESOLVED FIRST, above the careful/ordinary axis
    (kogaki#99). It carries the careful tier's model and cap; what it adds is
    the CLASS the run's line names, so a review of the reviewer is legible as
    one.
    """
    # The tables default to the configured ones and are passed explicitly by
    # the fixture below, so an operator who overrides the table does not turn
    # this tool red over cases written against the shipped one.
    cp = TIER_CAREFUL_PATHS if careful_paths is None else careful_paths
    op = TIER_ORDINARY_PATHS if ordinary_paths is None else ordinary_paths
    rp = TIER_REFLEXIVE_PATHS if reflexive_paths is None else reflexive_paths
    careful = (MODEL, MAX_TURNS)
    if paths is None:
        return (*careful, None, True,
                "the diff paths could not be read, so no class could be matched")
    if not paths:
        return (*careful, None, True, "the diff listed no paths")
    # THE REFLEXIVE CLASS IS TESTED FIRST, ABOVE THE CAREFUL/ORDINARY AXIS
    # (kogaki#99). The precedence is a CODE FACT and not an ordering accident:
    # a reflexive path is also an ordinary path by `tools/**`, so a diff
    # touching the reviewer resolved cheap for as long as the axis was tested
    # first. It is placed here, before `careful_hit`, so a reflexive path that
    # is ALSO careful still reports `reflexive` — the tier is the same either
    # way and the CLASS is the thing the operator needs to read.
    reflexive_hit = next(((p, pat) for p, pat in
                          ((p, path_in_class(p, rp)) for p in paths) if pat),
                         None)
    if reflexive_hit:
        return (*careful, "reflexive", False,
                f"{reflexive_hit[0]} matches {reflexive_hit[1]} — the diff "
                f"touches the reviewing instrument itself")
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


def unverified_marks(bodies):
    """Every `review-round-unverified:` sha, in order, duplicates kept.

    Duplicates are kept deliberately — see `rally_cycles()`. Each line records
    a SEPARATE session that was spawned and paid for, and collapsing them is
    the thing that would let repetition go unbounded.
    """
    return [m.group(1) for m in UNVERIFIED.finditer(bodies or '')]


def rally_cycles(bodies, resolves=None):
    """The rounds this PR has spent, counted in CYCLES rather than segments.

    THE DETECTOR'S UNIT MUST MATCH THE PROPERTY'S UNIT (kogaki#190). What the
    two-round cap bounds is the RALLY: review a head, the author fixes, the
    push moves the head, review again. That is the cycle, and its unit is the
    HEAD — a cycle completes when the head moves. `rounds_used()` counted
    SEGMENTS, which is a different unit, and the gap between them is not
    theoretical: two reviewers landing on one head produced two segments,
    spent the whole cap, and the author was never given the one thing a spent
    round is supposed to buy them — a chance to move the head. Four cap
    incidents in one session came through that gap.

    So: performed segments are grouped by head, and a head is ONE cycle
    however many reviewers reported against it.

    Returns `(heads, unattested)`:

      heads       one entry per distinct head that a PERFORMED report names
                  (`performed()`, kogaki#91 — a fabricated sha still reviewed
                  nothing and still counts as nothing).
      unattested  the `review-round-unverified:` marks whose head has NO
                  performed report — rounds that were spawned and paid for
                  and left no readable artifact at all (kogaki#190).

    THE TWO HALVES COUNT DIFFERENTLY, and the asymmetry is the point:

    · Reports at one head COLLAPSE, because they are one cycle's artifacts.
    · Unverified marks at one head DO NOT, because each is a separate paid
      session that produced nothing. Collapsing them would leave the sweep
      free to respawn at the same head forever — the identical unboundedness
      the mark exists to close, moved one level in.

    · A mark is SUBSUMED by a performed report at the same head. That is the
      #190 specimen exactly: the report HAD landed on PR #174 and the sweep's
      read failed at that instant. The next sweep sees both, and the head
      costs ONE cycle. A cannot-determine can therefore never double-charge
      the round it records, which is what keeps AC 1 from buying its
      representability with a new over-count.

    THE NOT-COLLAPSING HALF COUPLES THIS TO kogaki#204, and the coupling runs
    one way (PR #208 review round 1). #190's two causes are disjoint in
    MECHANISM and they stop being disjoint in CONSEQUENCE the moment a mark
    costs a round: on #190's own PR #180 specimen — a polling loop that
    re-fired the trigger and completed three sessions at one head — the old
    behaviour was three free spawns and the new behaviour is a mark each and a
    PARK on the second. That is the correct reading of the spend, and it is
    also why #204's writer-side guard moves from open to urgent: until it
    lands, a caller bug that used to be silent spends the operator's whole cap.
    Recorded here, at the line that causes it, rather than only on the issue.

    Head grouping is PREFIX-BASED because report shas may be abbreviated, and
    the most specific spelling is kept as the group's representative — the
    longest sha is the one least likely to swallow a sibling head.
    """
    heads = []
    for s in segments(bodies):
        if not performed(s, resolves):
            continue
        sha = s['sha']
        for i, h in enumerate(heads):
            if same_head(h, sha):
                if len(sha) > len(h):
                    heads[i] = sha
                break
        else:
            heads.append(sha)
    unattested = [u for u in unverified_marks(bodies)
                  if not any(same_head(h, u) for h in heads)]
    return heads, unattested


def park_class(bodies, resolves=None):
    """Which KIND of park this is — selected from the count, never asserted.

    The postmortem stub said `unreviewed-head (a push landed after the final
    round)` unconditionally, and that was true while every counted round came
    from a report that had landed. Charging an unread spawn (kogaki#190) makes
    a park reachable with no push at all, so the stub would have named a cause
    that did not occur — in the one artifact the owner reads to decide what to
    do about the park. Three compositions of the count, three classes.
    """
    heads, unattested = rally_cycles(bodies, resolves)
    if unattested and not heads:
        return (f"class: unverified-rounds ({len(unattested)} spawned "
                "session(s) whose report could not be read; NO report has "
                "ever landed on this PR)")
    if unattested:
        return (f"class: mixed-rounds ({len(heads)} reviewed head(s) and "
                f"{len(unattested)} spawned session(s) whose report could not "
                "be read)")
    # THE FOURTH CLASS, SELECTED ON `counted()` RATHER THAN `performed()`
    # (kogaki#210). Every branch above reads `rally_cycles()`, which groups on
    # `performed()` — does the cited sha name a commit. That is the right
    # predicate for CHARGING and the wrong one for this ANNOUNCEMENT: a
    # fragment is performed, so it is charged a round (deliberately, see
    # `decide()`), and it lands in `heads` — after which the default branch
    # announced `a push landed after the final round`, naming a push that did
    # not happen and a head-move that did not occur, in the one artifact the
    # owner reads to decide what to do about a park.
    #
    # The two predicates are kept apart on purpose — `performed()`'s own
    # docstring says it is "Deliberately NOT folded into `counted()` … Two
    # different questions with two different fail-safe sides" — and the class
    # selector read the wrong one of the two. The detector's unit must match
    # the property's unit, and the property here is REVIEW ("this head was
    # reviewed / a push landed after it"), not EXISTENCE.
    #
    # SCOPE BOUNDARY, stated so this is not over-read: `rally_cycles()`'s
    # charging is UNTOUCHED. A fragment spent a round and is still counted as
    # one. What changes is only the class derived from that count. A fix that
    # stopped charging fragments would be fixing the wrong thing.
    segs = segments(bodies)
    reviewed = [h for h in heads
                if any(counted(s) for s in head_segments(segs, h))]
    if heads and not reviewed:
        return (f"class: fragment-rounds ({len(heads)} charged head(s), none "
                "carrying a COUNTED report — every round was a fragment, so "
                "no push landed and no head moved)")
    return "class: unreviewed-head (a push landed after the final round)"


def rounds_used(bodies, resolves=None):
    """How many review rounds this PR has already spent.

    A segment whose cited sha resolves to no commit is NOT a round (kogaki#91)
    — see `performed()`. A head reviewed twice is not two rounds and a spawn
    nobody could read is not zero (kogaki#190) — see `rally_cycles()`, which
    holds both rules so this stays the ONE place the count is computed, and
    `decide()` calls it rather than re-deriving: the round count has two
    consumers (the state machine's park bound at `decide()` and the driver's
    fix cap in the sweep loop), and a discount applied at one of two call
    sites is the shape this file keeps finding.
    """
    heads, unattested = rally_cycles(bodies, resolves)
    return len(heads) + len(unattested)


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


# =========================================================================
# A REFUSAL IS TERMINAL FOR THAT COMMAND (specs/SPEC.md §4's third conduct
# clause, kogaki#100). The rule already shipped as PROSE, in the COMPOSITION
# block above, and was measured failing on the very next PR: on PR #98 that
# prompt was present in the second spawn's own context while the spawn spent
# its last four turns rephrasing one refused command, and the first spawn
# issued nine denials of one intent. Both ended `error_max_turns` and neither
# posted a report.
#
# WHY THE CARRIER IS HERE. A prohibition needs a mechanical gate AT THE TOOL
# BOUNDARY, and where that boundary belongs to another system the carrier goes
# at the last boundary you control, with any gate upstream of it counting as
# ergonomics rather than control
# (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:87`).
# The permission boundary is the harness's. The last boundary this repository
# controls is the SPAWN, so the gate is installed by the spawn: the wrapper
# reads the session's own stream, and a `PreToolUse` hook it writes refuses the
# second attempt. Where that prevention lives inside the wrapper is story
# 1.28's to settle and is explicitly not a named slot (§4, "What this fill does
# NOT decide").
#
# THE SIGNAL IS THE EVENT, NEVER `is_error` (the `refusal-signal-source` fill,
# owner decision 2026-08-06). The in-session
# `{"type":"system","subtype":"permission_denied"}` event is emitted at the
# moment of the denial, one per denial, with real lead time — PR #102's first
# is at stream line 33 of 189. Keying on `is_error: true` instead would read a
# transient failure as terminal: measured, 16 of 310 error results are ordinary
# failures (`jq: command not found`, `File does not exist`, `ENOTDIR`) and NONE
# of them carries a denial event. The event makes the distinction a READ.
#
# IT IS CLI-VERSION-SCOPED AND THAT IS A STATED PREMISE, NOT AN ASSUMPTION.
# The event is observed present on CLI 2.1.223 and observed ABSENT on 2.1.222 —
# a boundary that fell inside the very run the fill was measured on. The
# prevention half therefore DEGRADES TO THE BACKSTOP, never to nothing: the
# terminal `permission_denials` field of the `{"type":"result"}` record is
# present on every spawn at every version observed and is what AC 5's count is
# taken from. There is NO version preflight and the lane is never withheld —
# a report, never a gate. `reconcile()` below is what makes the absence
# visible, because an absent event generates nothing to hook.
#
# AND "TERMINAL" IS ABOUT THE COMMAND, NOT THE INTENT. The log does not
# distinguish a rephrase-able denial from a dead-end one:
# `decision_reason_type: subcommandResults` names one offending sub-part of a
# compound command — the class kogaki#74 found HAD granted alternatives — and
# it is absent on roughly a fifth of events, so it is a weak hint and never a
# discriminator. Naming a granted alternative stays the COMPOSITION prompt's
# static job. The correct exit is the report's `cannot-determine:` line.


# THE KEY RULE HAS EXACTLY ONE COPY, and it is a source STRING because it must
# run in two processes: here, where a denial is turned into a key, and in the
# generated `PreToolUse` gate, where an incoming call is matched against one.
# Two hand-written copies of a rule are two things that can disagree — the
# defect this file has already found twice, once per call site — so the gate
# EMBEDS this text verbatim rather than restating it, and a fixture below
# compiles the generated gate and asserts the two agree.
TERMINAL_KEY_SRC = '''
def terminal_key(tool_name, command):
    """The key a refused command is made terminal under.

    A NORMALIZED FORM RATHER THAN THE RAW COMMAND STRING, which is the choice
    specs/SPEC.md §4 leaves to story 1.28. The raw string would not survive a
    rephrasing — and rephrasing is precisely the measured behaviour (PR #98's
    last four turns) — so a raw key would gate nothing it was built to gate.

    The normal form is the command's FIRST THREE WORDS under its tool name:
    exactly the label `denied_tools()` renders, so the operator-facing name of
    a denial and the key it is refused under are one string rather than two
    that can disagree.

    THE WIDTH IS THE WHOLE DESIGN, chosen against a measured failure in BOTH
    directions. Wider (the tool name alone, or the leading word) OVER-blocks:
    22 of 40 observed events are `subcommandResults`, one offending sub-part of
    a COMPOUND command, so keying `git` on a denied `git fetch` would make the
    granted `git log` terminal too — turning this gate into the review-deleting
    failure kogaki#100 exists to end. Narrower (the raw string) UNDER-blocks,
    as above. Three words separates `git fetch origin` from `git log --oneline`
    while absorbing everything a rephrasing changes after them — a redirect, a
    flag, a pipe.
    """
    words = (command or "").split()
    return f"{tool_name}({' '.join(words[:3])})" if words else (tool_name or "")
'''
exec(TERMINAL_KEY_SRC)


def denial_gate_source():
    """The `PreToolUse` hook program, generated with the key rule EMBEDDED.

    `terminal_key` is inlined from its own source rather than restated, so the
    wrapper that WRITES a key and the hook that MATCHES one cannot drift apart.
    Two copies of a rule are two things that can disagree; one copy and a
    mechanical transcription is the shape this file already uses for every
    knob it passes to its own heredoc.

    THE GATE FAILS OPEN, deliberately and in exactly one direction. An
    unreadable state file, an unparseable payload or a missing python all exit
    0 and admit the call: this half is PREVENTION, an enhancement over the
    guaranteed measurement path, and a gate that refused the review whenever
    its own instrument was unavailable would cost the whole review to save
    some turns — the trade kogaki#100 is against.
    """
    return (
        "# GENERATED per spawn by tools/review-sweep.sh — never edited in\n"
        "# place. `terminal_key` below is this file's ONLY copy of the key\n"
        "# rule, transcribed verbatim from its single definition.\n"
        "import json, os, sys\n\n"
        + TERMINAL_KEY_SRC
        + "\n\ndef main():\n"
        "    try:\n"
        "        ev = json.load(sys.stdin)\n"
        "        terminal = json.load(open(os.environ['KOGAKI_TERMINAL_DENIALS']))\n"
        "    except Exception:\n"
        "        return 0                      # fails OPEN: prevention only\n"
        "    key = terminal_key(ev.get('tool_name') or '',\n"
        "                       (ev.get('tool_input') or {}).get('command') or '')\n"
        "    if key not in terminal:\n"
        "        return 0\n"
        "    try:\n"
        "        with open(os.environ['KOGAKI_TERMINAL_PREVENTED'], 'a') as f:\n"
        "            f.write(key + '\\n')\n"
        "    except Exception:\n"
        "        pass\n"
        "    print(json.dumps({'hookSpecificOutput': {\n"
        "        'hookEventName': 'PreToolUse',\n"
        "        'permissionDecision': 'deny',\n"
        "        'permissionDecisionReason': (\n"
        "            'REFUSED ALREADY, AND A REFUSAL IS TERMINAL FOR THAT '\n"
        "            'COMMAND (specs/SPEC.md §4, kogaki#100). `' + key + '` was "
        "already denied in this session. Do NOT rephrase it, pipe it, or '\n"
        "            'retry it in another form — every form is refused. Record "
        "the blocked dimension in your report as a '\n"
        "            '`cannot-determine: <dimension> — <why>` line and finish "
        "the review. A refused capability costs ONE dimension, not the '\n"
        "            'report.')}}))\n"
        "    return 0\n\n\n"
        "sys.exit(main())\n"
    )


class DenialWatch:
    """Reads the spawn's own stream and makes each refused command terminal.

    THREE JOBS, and they degrade independently. It (1) writes the terminal key
    set the hook reads, which is the PREVENTION half and needs the event; (2)
    counts events for AC 6's reconciliation; and (3) takes AC 5's count from
    the terminal `permission_denials` field, which is the MEASUREMENT half and
    never degrades.

    THE BACKWARD JOIN IS WHY THIS READS THE WHOLE STREAM. The event carries
    `tool_name`, `tool_use_id`, `message` and `decision_reason_type` — and NOT
    `tool_input`. The command text lives only in the PRECEDING `assistant`
    tool_use block, so the label a key is built from must be joined backwards
    by `tool_use_id`. That is a fact about the event shape recorded in §4 so it
    is not re-derived from the logs, and it is the reason a live reader cannot
    simply read the label off the event.
    """

    def __init__(self, state_path, prevented_path):
        self.state_path = state_path
        self.prevented_path = prevented_path
        self.pending = {}        # tool_use_id -> (tool_name, command)
        self.terminal = []       # keys, in first-seen order
        self.events = 0          # in-session denial events observed
        self.measured = 0        # entries in the terminal permission_denials
        self.non_bash = []       # events whose tool is not Bash — unproven path

    def feed(self, line):
        """One stream line. Never raises: a malformed line is not a reason to
        take down a review, and the measurement half is read again at close."""
        try:
            rec = json.loads(line)
        except (ValueError, TypeError):
            return
        if not isinstance(rec, dict):
            return
        if rec.get("type") == "assistant":
            for block in ((rec.get("message") or {}).get("content") or []):
                if isinstance(block, dict) and block.get("type") == "tool_use":
                    self.pending[block.get("id")] = (
                        block.get("name") or "",
                        (block.get("input") or {}).get("command") or "")
            return
        if rec.get("type") == "system" and rec.get("subtype") == "permission_denied":
            self.events += 1
            name, command = self.pending.get(
                rec.get("tool_use_id"), (rec.get("tool_name") or "", ""))
            name = name or (rec.get("tool_name") or "")
            if name and name != "Bash":
                # UNPROVEN, recorded as unproven. All observed events carried
                # `tool_name: "Bash"`; MCP-tool, Write and Edit denials are
                # unproven on the event path and are expected to reach only the
                # terminal field. One seen here is the observation §4 names as
                # the thing that would prove coverage wider than measured.
                self.non_bash.append(name)
            key = terminal_key(name, command)
            if key and key not in self.terminal:
                self.terminal.append(key)
                self.publish()
            return
        if rec.get("type") == "result":
            self.measured = len(rec.get("permission_denials") or [])

    def publish(self):
        """Write the terminal set for the hook, which runs in another process.

        Written whole on every addition rather than appended: the hook reads it
        with one `json.load`, and a partially-appended file is a parse error
        that fails the gate open.
        """
        try:
            with open(self.state_path, "w", encoding="utf-8") as f:
                json.dump(self.terminal, f)
        except OSError:
            pass

    def prevented(self):
        """How many calls the hook actually refused — the gate's own record.

        A path whose guard is constant-false is indistinguishable from a
        deliberately disabled one, so the prevention half reports its own
        firings rather than being inferred from the terminal set's size.
        """
        try:
            with open(self.prevented_path, encoding="utf-8") as f:
                return sum(1 for line in f if line.strip())
        except OSError:
            return 0

    def reconcile(self):
        """AC 6 — the two signals, reconciled, stated. Returns the log lines.

        THE ABSENT CASE IS THE POINT. "The event did not arrive" produces no
        event to hook, so an obligation of this shape needs its absence made
        VISIBLE rather than gated. A run whose CLI predates the event path must
        read as *prevention unavailable — N denials measured, 0 prevented* and
        NEVER as "no denials": the two are indistinguishable in the output
        otherwise, which is the measured-absence defect this whole clause was
        written against.
        """
        out = [f"=== denials: {self.measured} measured (terminal "
               f"`permission_denials`), {self.events} observed in-session, "
               f"{len(self.terminal)} terminal command(s), "
               f"{self.prevented()} prevented"]
        if self.events == 0 and self.measured > 0:
            out.append(f"=== prevention unavailable this run — "
                       f"{self.measured} denials measured, 0 prevented. The "
                       "in-session `permission_denied` event did not arrive; "
                       "it is observed on Claude Code CLI >= 2.1.223 and "
                       "absent on 2.1.222 (specs/SPEC.md §4, PREMISE 1). This "
                       "is a REPORT, not a gate: the measurement half is "
                       "undiminished and the review was never withheld.")
        elif self.measured > self.events:
            out.append(f"=== {self.measured - self.events} denial(s) reached "
                       "the terminal field with NO matching in-session event. "
                       "That is what a denial class the event path does not "
                       "cover looks like — MCP-tool, `Write` and `Edit` "
                       "denials are unproven on the event path (specs/SPEC.md "
                       "§4, UNPROVEN), and this line is the named mechanism "
                       "that observes it.")
        for name in sorted(set(self.non_bash)):
            out.append(f"=== a denial event carried tool_name {name!r}, which "
                       "the event path was NOT proven to cover — recorded "
                       "because it widens what is known, not assumed.")
        return out


SPAWN_IN_FLIGHT = 76   # nothing was spawned: a round for this log is live
GRANT_REFUSED = 77     # nothing was spawned: no owner grant authorizes the act
                       # (§4 clauses 3-4, kogaki#295) — distinct from a stall
                       # by design: a spawn declined for want of authorization
                       # is a different fact from a session that started and
                       # produced nothing.
TERMINAL_MARK = "=== spawn terminal:"
SPAWN_MARK = "=== spawn:"   # the line that opens each attempt in a round log
PID_MARK = "=== spawn pid:"  # the owning process, so liveness is asked rather than inferred


def attempt_pid(text):
    """The pid recorded by THIS attempt, or None — kogaki#227.

    Scoped to the text after the last `=== spawn:` line for the same reason the
    terminal mark is: a re-used round log carries earlier attempts, and an
    earlier attempt's pid answers about a process that is not this round's.
    """
    attempt = text.rsplit(SPAWN_MARK, 1)[-1] if SPAWN_MARK in text else text
    m = re.search(rf"^{re.escape(PID_MARK)}\s*(\d+)\s*$", attempt, re.M)
    return int(m.group(1)) if m else None


def pid_alive(pid):
    """True / False / None — and None is a REAL answer, not a failure.

    None means liveness could not be observed: no recorded pid, or a pid from
    another host or namespace where the number means nothing here. The caller
    falls back to the window there and SAYS SO, rather than reporting in-flight
    from an absence it never checked.
    """
    if pid is None:
        return None
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        # It exists and is not ours. Alive is the honest answer.
        return True
    except Exception:
        return None


def round_state(log_path, now=None, ttl=None, exists=None, mtime=None, text=None, pid=None):
    """`in-flight` | `finished` | `absent` for one (pr, round) — kogaki#204.

    A POLL READS STATE; IT MUST NEVER RE-FIRE THE TRIGGER IT IS WAITING ON.
    `--spawn --pr <n>` spawned a session on every invocation with nothing
    relating one invocation to the round already in flight, so run inside a
    polling loop — the natural way to wait, since this tool is the only thing
    that reports the round's state — it re-fired the trigger it was being used
    to watch. Measured on PR #180: three sessions completed (29, 24 and 33
    turns) and the budget read exhausted.

    THE CARRIER ALREADY EXISTED, and kogaki#204's premise that "there is no
    persisted per-round state today" is corrected here rather than carried
    forward. `spawn_log_path(pr, rnd)` is already keyed per PR per round, and
    `spawn()` writes the command line into it BEFORE the process starts —
    deliberately, so "a spawn that dies immediately still leaves a file saying
    what was attempted". What it lacked is a TERMINAL line, so existence alone
    could not separate in-flight from finished. That is the whole addition.

    THE FOUR STATES (§4 clause 4 v2, kogaki#227). The v1 contract described
    here was THREE states inferring the window two ways, and it is superseded
    rather than edited away, because the superseded rule is what a reader
    reaching for this function's contract would otherwise still get (PR #231
    review round 1, should):

      finished          the terminal line is present, written on EVERY exit
                        path.
      in-flight         no terminal line, and the spawning process was
                        OBSERVED ALIVE. Asked and answered.
      absent            no terminal line and the process was observed GONE, so
                        a fresh spawn is permitted IMMEDIATELY; or no file at
                        all; or liveness unobservable AND the window expired.
      cannot-determine  no terminal line and liveness COULD NOT BE OBSERVED —
                        no OBSERVABLE pid for this attempt: none recorded, or
                        one this host cannot probe (another host or namespace,
                        which is the case the window is retained FOR). ONLY
                        HERE does the
                        declared window decide, and the token exists so the
                        decline can say it could not ask rather than reporting
                        a liveness it never checked.

    v1's rule was `in-flight` when touched inside the window and `absent`
    outside it — which made the window the FIRST question rather than the last,
    so a killed session blocked its own retry for the balance of it (the #225
    specimen) and a slow one read as abandoned. Liveness is locally decidable
    from a recorded pid, so it is asked FIRST and the window is the fallback.

    Blocking-ness is NOT a property of a single token: `in-flight` and
    `cannot-determine` both block a spawn, and callers test `BLOCKS_A_SPAWN`
    rather than either literal. They differ only in what the operator is told,
    which is the whole reason the fourth token is returned instead of folded.

    Pure over its inputs when they are supplied, so the fixture pass can state
    a clock and a filesystem rather than depend on either.
    """
    ttl = INFLIGHT_TTL if ttl is None else ttl
    if exists is None:
        exists = os.path.exists(log_path)
    if not exists:
        return 'absent'
    if text is None:
        try:
            with open(log_path, encoding="utf-8", errors="replace") as f:
                text = f.read()
        except OSError:
            return 'absent'
    # THE MARK IS READ ONLY IN THE CURRENT ATTEMPT, never over the whole file
    # (PR #219 review round 1, blocking finding 1).
    #
    # `spawn()` opens the log with "a" — append, never truncate — and the round
    # NUMBER does not advance on a report-less spawn: `decide()` returns
    # `spawn-round-{rounds_used + 1}`, and `rounds_used()` moves only on a
    # performed report segment or a `review-round-unverified:` mark. A spawn
    # that exits non-zero, or exits 0 having posted nothing, posts a STALL
    # COMMENT, which is deliberately not in report form and carries no mark. So
    # the count stays put, the next poll resolves the SAME spawn-round-N, and
    # `spawn_log_path(pr, rnd)` hands back a file that already carries the
    # previous attempt's terminal line.
    #
    # Read over the whole file, the guard then answers `finished` forever and
    # protects only the FIRST spawn at that key — while the issue closes and the
    # story reads discharged. That is the report-less path this file already has
    # a whole FAIL branch and a stall comment for, and the one an operator polls
    # hardest. `fix_log_path()` keys on the same arithmetic and inherits it.
    #
    # Scoping to the text after the LAST `=== spawn:` line makes the mark a fact
    # about THIS attempt rather than about the file.
    attempt = text.rsplit(SPAWN_MARK, 1)[-1] if SPAWN_MARK in text else text
    if TERMINAL_MARK in attempt:
        return 'finished'
    # ASK FIRST (§4 clause 4 v2, kogaki#227). A recorded pid makes liveness
    # LOCALLY DECIDABLE, and a guard that infers it from silence makes a
    # positive claim out of not-observed PLUS source-not-consulted — the
    # two-valued report that is most confident exactly when it knows least.
    #
    # consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e topics/archive/claude-code-ops.md:67
    alive = pid_alive(attempt_pid(text) if pid is None else pid)
    if alive is True:
        return 'in-flight'
    if alive is False:
        # Observed gone. The round is free IMMEDIATELY — this is the whole of
        # the #225 specimen, where a killed sweep blocked its own retry for the
        # balance of a 30-minute window.
        return 'absent'
    # alive is None: liveness could not be observed. ONLY HERE does the window
    # decide, and the state it returns SAYS SO — `cannot-determine`, never
    # `in-flight`.
    #
    # THE FOURTH TOKEN EXISTS BECAUSE THE THIRD ONE CANNOT CARRY THIS (PR #231
    # review round 1, blocking). v2 of §4 clause 4 ratified that the decline
    # "says that it could not ask", and the first implementation returned
    # `'in-flight'` from BOTH the observed-alive branch above and this one — so
    # the code held four states internally and the operator-visible artifact was
    # still the two-valued report the clause was ratified to END. A state a
    # caller cannot distinguish is not a state; it is a comment. The clause is
    # satisfied by what the DECLINE PRINTS, so the token has to reach the
    # printer, which means it has to leave this function.
    if mtime is None:
        try:
            mtime = os.path.getmtime(log_path)
        except OSError:
            return 'absent'
    now = time.time() if now is None else now
    return 'cannot-determine' if (now - mtime) <= ttl else 'absent'


# Both blocking states, named once. A caller asking "may I spawn?" treats these
# identically; a caller PRINTING must not, which is the whole of the #231
# finding — so the shared predicate lives here and the messages stay separate.
BLOCKS_A_SPAWN = ('in-flight', 'cannot-determine')


def decline_line(state, log_path, age, ttl):
    """The operator-visible sentence for a blocked spawn, one writer.

    Sited here rather than at each call site for the reason this file's header
    gives about guards: the review path and the dry-run path must not be able
    to disagree about what they SAY, and two format strings maintained apart is
    exactly how they would. `--dry-run` prefixes its own "would NOT"; the
    clause-bearing half is identical by construction because it is one string.
    """
    if state == 'cannot-determine':
        # NAMES THE CAUSE-CLASS, NEVER ONE CAUSE (PR #231 review round 2).
        # This said "no pid recorded for this attempt", and `pid_alive()`
        # returns None from TWO places — no recorded pid, OR a pid this host
        # cannot probe (another host or namespace, the bare `except`). The
        # second is precisely the case §4 clause 4 v2 RETAINS the window for
        # ("across a container or host boundary the probe means nothing"), so
        # on the motivating run the operator was told a pid was not recorded
        # when one was, and sent looking for a missing write in `spawn()` that
        # is not missing. A narrower instance of round 1's own defect: a
        # positive claim about WHICH cause fired, made without discriminating
        # them. The honest sentence names both and picks neither.
        return (f"a round's liveness COULD NOT BE OBSERVED — no observable pid "
                f"for this attempt (none recorded, or one this host cannot "
                f"probe), so the {ttl}s window decided and nothing spawned "
                f"(log {log_path}, last wrote {age}s ago). This is NOT a report "
                f"that the round is alive: it is a report that the question could "
                f"not be asked (specs/SPEC.md §4 clause 4 v2, kogaki#227).")
    return (f"a round is already IN FLIGHT — its spawning process was OBSERVED "
            f"ALIVE, so nothing spawned (log {log_path}, last wrote {age}s ago). "
            f"A poll reads state; it must never re-fire the trigger it is "
            f"waiting on (kogaki#204).")


# --- the third layer: spawn() consumes an owner grant (§4 clauses 3-4,
# --- kogaki#295; the store contract is claude-toolkit#283's) -----------------
#
# The session-level PreToolUse carrier reaches only tool calls made in a
# session; both PR #293 rounds were created by this file from a process no
# harness boundary ever saw. The act of process creation is the last boundary
# this repository controls, so the authorization check lives HERE — in
# spawn(), never at its call sites, for the same reason the budget mechanism
# above does: a per-call-site guard leaves call site N+1 uncovered by default.
#
# spawn() is SHARED (the driver's fix and the embedded fixtures ride it), so
# the check is keyed by a REQUIRED GRANT CLASS rather than applied wholesale:
# `reviewer` consumes a single-use owner grant or refuses fail-closed;
# `fix` has no grant rule, and §4 clause 4 records that it has none;
# `fixture` is the embedded pass's own never-launch class. An UNDECLARED
# class refuses — the load-bearing property: call site N+1 is denied by
# default rather than admitted.

GRANT_CLASSES = ("reviewer", "fix", "fixture")


def _approvals_dir():
    # expanduser at CALL time, so the embedded fixtures can point HOME at a
    # scratch store exactly as the hook's own test fixture does.
    return os.path.join(os.path.expanduser("~"), ".claude", "review-approvals")


def _repo_slug():
    """owner/repo from this working copy's origin remote, else None."""
    r = subprocess.run(["git", "config", "--get", "remote.origin.url"],
                       capture_output=True, text=True)
    if r.returncode != 0:
        return None
    m = re.search(r"[:/]([^/:\s]+)/([^/\s]+?)(?:\.git)?/?$", r.stdout.strip())
    return f"{m.group(1)}/{m.group(2)}" if m else None


def grant_lookup(pr):
    """The dry-run/act-shared predicate (§4 clause 4; kogaki#227's rule).

    Returns (state, path, record) with state one of:
      'open'             — an unconsumed grant for (this repo, pr); the
                           lowest round is returned.
      'no-grant'         — the store exists and holds none.
      'store-absent'     — the store DIRECTORY does not exist. Deliberately
                           its own state (PR #296 review, carried finding):
                           a store that was never created must not present
                           as a review lane correctly waiting on the owner.
      'store-unreadable' — a record failed to parse; fail closed.
      'no-repo'          — this working copy names no origin to key grants by.
    NEVER consumes: the dry run reports this state and leaves it; only
    spawn() stamps a grant, and only after the in-flight guard has passed.
    """
    d = _approvals_dir()
    if not os.path.isdir(d):
        return ("store-absent", None, None)
    repo = _repo_slug()
    if not repo:
        return ("no-repo", None, None)
    best = None
    for name in sorted(os.listdir(d)):
        if not name.endswith(".json"):
            continue
        p = os.path.join(d, name)
        try:
            with open(p, encoding="utf-8") as f:
                rec = json.load(f)
        except (OSError, ValueError):
            return ("store-unreadable", p, None)
        if (rec.get("repo") == repo and str(rec.get("pr")) == str(pr)
                and not rec.get("consumed_at")):
            if best is None or int(rec.get("round") or 0) < int(best[1].get("round") or 0):
                best = (p, rec)
    return ("open", best[0], best[1]) if best else ("no-grant", None, None)


def consume_grant(path, rec, tag):
    """Stamp one grant spent. The sweep's ONLY write to the store (AC8):
    read-and-consume, never create — no code path here writes a grant."""
    rec["consumed_at"] = time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime())
    rec["consumed_by"] = f"review-sweep spawn ({tag})"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(rec, f, indent=2)
        f.write("\n")
    _grant_log("consume", {"repo": rec.get("repo"), "pr": rec.get("pr"),
                           "round": rec.get("round"), "spawn": tag})


def _grant_log(kind, detail):
    """Append one JSONL record beside the store; failure changes no decision."""
    try:
        with open(os.path.join(_approvals_dir(), "denials.log"), "a",
                  encoding="utf-8") as f:
            f.write(json.dumps({
                "at": time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime()),
                "kind": kind, **detail}) + "\n")
    except OSError:
        pass


def grant_refusal_text(pr, state):
    """The refusal, terminal and legible (AC6): it names the missing
    approval, prints the same grant instruction the session hook prints, and
    the store-absent case says THAT rather than presenting as a lane
    correctly waiting on the owner."""
    repo = _repo_slug() or "<unresolvable repo>"
    if state == "store-absent":
        head = (f"refused: no grant — the approvals store does not exist at "
                f"{_approvals_dir()}. That is NOT the same fact as no grant: "
                f"the store was never created (no owner grant has ever been "
                f"written on this account), so the review lane is dark, not "
                f"waiting.")
    elif state == "store-unreadable":
        head = (f"refused: no grant — the approvals store is unreadable; "
                f"failing closed rather than spawning against a corrupt "
                f"store. The store is owner-owned: repair it outside any "
                f"session.")
    elif state == "no-repo":
        head = (f"refused: no grant — this working copy names no origin "
                f"remote, so no grant can be matched to it.")
    else:
        head = (f"refused: no grant — no unconsumed owner approval exists "
                f"for a reviewer session on {repo} PR #{pr}.")
    return (head + "\n"
            f"  Contract (§4 clauses 3-4, kogaki#295; store contract "
            f"claude-toolkit#283): a reviewer session requires a single-use "
            f"owner approval naming the PR, whatever invoked this sweep. "
            f"The owner grants one round by running, in a terminal OUTSIDE "
            f"any Claude session:\n"
            f"      ~/.claude/tools/story-sync approve-review "
            f"--repo {repo} --pr {pr} --round <N>\n"
            f"  This refusal is terminal: it never retries, and it is logged "
            f"beside the store.")


def spawn(prompt, log_path, model=None, tools=None, ref=None, detach=True,
          tag="review", max_turns=None, grant_class=None, pr=None):
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
    # THE GRANT CLASS IS REQUIRED, and an undeclared one refuses (AC1/AC3):
    # checked before any filesystem effect, so a refused call leaves no
    # artifact. This is the load-bearing property of the third layer — a
    # default here is what would make the classes an enumeration of the
    # callers someone remembered, and call site N+1 admitted by omission.
    if grant_class not in GRANT_CLASSES:
        print(f"  refused: no grant — spawn() was called with "
              + ("no grant class" if not grant_class
                 else f"undeclared grant class {grant_class!r}")
              + f" (§4 clause 4, kogaki#295). Every call site declares one "
              f"of {', '.join(GRANT_CLASSES)}; an undeclared class refuses "
              f"by default rather than being admitted. Nothing was spawned.")
        _grant_log("refuse-class", {"grant_class": grant_class, "tag": tag})
        return GRANT_REFUSED
    os.makedirs(LOG_DIR, exist_ok=True)
    # THE BUDGET MECHANISM BETWEEN THE INSTRUCTION AND THE SPAWN (kogaki#204),
    # sited HERE rather than at the call sites for the same reason the
    # isolation is (see this file's header): a per-call-site guard leaves call
    # site N+1 uncovered by default. The served position names the shape — a
    # system where one instruction can commit all available spend is MISSING A
    # COMPONENT, and the fault is not the wording of the instruction but the
    # absence of any budget mechanism between it and the spawn.
    #
    # consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e gloss/lessons/claude-code-ops.md:59
    #
    # It REPORTS and returns rather than refusing loudly. The documented caller
    # is a LOOP, and a poll that exits non-zero on its normal case makes "not
    # yet done" indistinguishable from "broken" — whose operator repair is
    # `|| true`, which removes the guard by ergonomics. Disclosure is not
    # traded away for that: the in-flight round prints on every iteration.
    state = round_state(log_path)
    if state in BLOCKS_A_SPAWN:
        try:
            age = int(time.time() - os.path.getmtime(log_path))
        except OSError:
            age = -1
        _m = re.search(r"pr-(\d+)-(?:round|fix)-(\d+)\.log$", log_path)
        _who = f"PR #{_m.group(1)} round {_m.group(2)}" if _m else "this round"
        print(f"  {_who}: {decline_line(state, log_path, age, INFLIGHT_TTL)}")
        return SPAWN_IN_FLIGHT
    # THE REVIEWER CLASS CONSUMES OR REFUSES (AC2), sited AFTER the in-flight
    # guard so a blocked retry preserves the grant, and BEFORE the claim so a
    # refusal leaves no round artifact. The consume happens here rather than
    # after isolation: a worktree failure after this point burns the grant —
    # stated rather than hidden, and accepted because moving the stamp later
    # would open a claim-vs-consume window two concurrent invocations could
    # thread. The owner re-grants a burnt round; nothing re-opens a doubled
    # one.
    if grant_class == "reviewer":
        which_pr = pr
        if which_pr is None:
            _m_pr = re.search(r"pr-(\d+)-", os.path.basename(log_path))
            which_pr = _m_pr.group(1) if _m_pr else None
        if which_pr is None:
            print("  refused: no grant — a reviewer spawn names no PR, so no "
                  "approval can be matched (§4 clause 4). Nothing was spawned.")
            _grant_log("refuse", {"state": "no-pr", "tag": tag})
            return GRANT_REFUSED
        _gstate, _gpath, _grec = grant_lookup(which_pr)
        if _gstate != "open":
            print("  " + grant_refusal_text(which_pr, _gstate))
            _grant_log("refuse", {"state": _gstate, "pr": which_pr, "tag": tag})
            return GRANT_REFUSED
        consume_grant(_gpath, _grec, tag)
        print(f"  grant consumed: round {_grec.get('round')} for PR "
              f"#{which_pr} (single-use; a further round needs a new owner "
              f"grant)")
    # CLAIM THE ROUND BEFORE ANY SETUP WORK (PR #219 review round 1, nit 3).
    # The state read above and the log's first write were several statements
    # apart — DenialWatch.publish(), the stale-file removal and the gate-source
    # write all sat between them — so two invocations landing inside that window
    # both read `absent` and both spawned. A poll loop with a sleep will not hit
    # it; a hook firing beside a manual sweep can. Writing the attempt's opening
    # line first shrinks the window to a single append, and it is the same line
    # `round_state()` scopes the terminal mark to, so the claim and the reader
    # agree by construction.
    # The line SAYS WHAT IT IS. This is a route log — "a spawn that dies
    # immediately still leaves a file saying what was attempted" — so a
    # placeholder dressed as the command line would be a lie in the one
    # artifact anybody opens to diagnose a failure. The real command line
    # follows a few statements later and re-opens the attempt scope, which is
    # what `round_state()` reads.
    with open(log_path, "a", encoding="utf-8") as _claim:
        _claim.write(f"{SPAWN_MARK} (round claimed; the command line follows)\n")
    # A refusal is terminal for that command (kogaki#100). The state file, the
    # gate's own firing record and the generated hook all sit BESIDE this
    # spawn's log, so a run is diagnosable from one directory and two
    # concurrent spawns cannot share a terminal set.
    denials_path = log_path + ".denials.json"
    prevented_path = log_path + ".prevented"
    gate_path = log_path + ".gate.py"
    watch = DenialWatch(denials_path, prevented_path)
    watch.publish()                       # an empty set, so the hook always reads
    for stale in (prevented_path,):
        try:
            os.remove(stale)
        except OSError:
            pass
    try:
        with open(gate_path, "w", encoding="utf-8") as g:
            g.write(denial_gate_source())
        gate_settings = json.dumps({"hooks": {"PreToolUse": [
            {"matcher": "*", "hooks": [
                {"type": "command", "command": f"python3 {gate_path}"}]}]}})
    except OSError:
        # The gate could not be installed. Prevention is an ENHANCEMENT over
        # the guaranteed measurement path, so the spawn proceeds without it and
        # says so, rather than withholding the review.
        gate_settings = None
    cmd = ["claude", "-p", prompt + HEADLESS,
           "--model", model or MODEL,
           "--max-turns", str(max_turns or MAX_TURNS),
           "--allowedTools", tools or REVIEW_TOOLS,
           "--verbose", "--output-format", "stream-json"]
    if gate_settings:
        cmd += ["--settings", gate_settings]
    env = dict(os.environ,
               KOGAKI_TERMINAL_DENIALS=denials_path,
               KOGAKI_TERMINAL_PREVENTED=prevented_path)
    with open(log_path, "a", encoding="utf-8") as log:
        log.write(f"=== spawn: {' '.join(cmd)}\n")
        # LIVENESS IS ASKED, NOT INFERRED (§4 clause 4 v2, kogaki#227). The
        # sweep process owns the round for its whole lifetime — it waits on the
        # child — so ITS pid is the liveness fact a reader consults instead of
        # guessing from silence.
        #
        # WRITTEN AFTER THE COMMAND LINE, and the order is load-bearing:
        # `attempt_pid` scopes to the text following the LAST `=== spawn:` line,
        # so a pid recorded before it is scoped out and the probe silently never
        # fires — the guard would fall back to the window on every real run
        # while every hand-built fixture passed. Caught by asserting the writer.
        log.write(f"{PID_MARK} {os.getpid()}\n")
        log.flush()
        try:
            base, tree = make_worktree(tag, ref, detach)
        except IsolationError as e:
            log.write(f"=== worktree FAILED: {e}\n")
            # AC1's named case: an isolation failure returns BEFORE the
            # finally below, so it closes the round here. Without this the log
            # would sit terminal-line-less and read as in-flight for the whole
            # window — a spawn that never started blocking its own retry.
            log.write(f"{TERMINAL_MARK} round closed (isolation failed)\n")
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
            # STREAMED RATHER THAN REDIRECTED (kogaki#100). The log is written
            # line by line and FLUSHED per line, so it stays exactly the
            # artifact it was — a spawn that dies mid-run still leaves every
            # line it produced — while the same lines pass through the denial
            # watch on their way there. The terminal set has to be built while
            # the session is still running, because a signal that arrives at
            # the last line of the spawn cannot prevent anything: every turn
            # the burn costs is already spent by then. That is the whole reason
            # the event is primary and the terminal field is the backstop.
            proc = subprocess.Popen(cmd, stdin=subprocess.DEVNULL,
                                    stdout=subprocess.PIPE,
                                    stderr=subprocess.STDOUT,
                                    cwd=tree, env=env, text=True, bufsize=1)
            for line in proc.stdout:
                log.write(line)
                log.flush()
                watch.feed(line)
            proc.stdout.close()
            code = proc.wait()
            if gate_settings is None:
                log.write("=== denial gate NOT installed (its state files "
                          "could not be written) — prevention unavailable "
                          "this spawn; the measurement half is unaffected\n")
            for line in watch.reconcile():
                log.write(line + "\n")
            log.flush()
            return code
        finally:
            # EVERY exit path, not only success: a non-zero exit and an
            # exception both reach here.
            remove_worktree(base, tree, log)
            # AND THE ROUND IS CLOSED HERE, for the same reason (kogaki#204).
            # A terminal line written only on success would leave every failed
            # spawn looking in-flight until the window expired, which is the
            # guard blocking exactly the round most likely to need a retry.
            log.write(f"{TERMINAL_MARK} round closed\n")
            log.flush()


def denied_tools(log_path):
    """The tools a spawned session was refused, read from its own route log.

    Primary capture, parsed rather than remembered: `permission_denials`
    entries carry the tool name and its input. Returns a de-duplicated,
    ordered list of short labels — a comment naming forty variations of one
    denial is a comment nobody finishes reading.

    THE LABEL IS A NAME FOR THE ACT, NEVER A GRANT TO PASTE (kogaki#74). It is
    the command's FIRST THREE WORDS, so a piped, redirected or looped command
    prints as though its LEADING command were refused. kogaki#74 arrived with
    eight labels harvested from route logs and proposed as eight grants; the
    headless exercise showed three of them — a pipe, a `2>&1` and a `for`
    loop — were ALLOWED shapes whose labels merely looked like denials. A
    reader who grows the grant list from this list grows it by members with no
    defect behind them, which is why the truncation is now disclosed at the
    only place the list is published (`post_stall_comment`) rather than known
    only here.
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
            # First three words: enough to name the act, short enough that a
            # comment listing several denials stays readable — and since
            # kogaki#100 it is `terminal_key()` rather than a second copy of
            # the same expression, so the label an operator reads and the key a
            # command is made terminal under are ONE string by construction.
            label = terminal_key(name, cmd.group(1) if cmd else "")
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
        lines.append(
            "Each label is the command's FIRST THREE WORDS, not a grant "
            "string — a piped or redirected command prints as though its "
            "leading command were refused. Exercise a shape headless before "
            "adding it to `KOGAKI_REVIEW_TOOLS` (kogaki#65, kogaki#74): three "
            "of the eight labels harvested this way turned out to name "
            "ALLOWED shapes.")
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


def unverified_round_body(head, log_path, denials):
    """The comment that makes a cannot-determine round representable.

    Composed as a pure function so the fixture pass can assert what it says
    without a network — the property that matters here is what the TEXT
    carries, not that `gh` was called.

    Three things at once, and they are separable claims:

    · AC 1 — the `review-round-unverified:` line is the budget record. It is
      the only durable trace this arm has ever had; before it, the fact lived
      in one run's stdout and the round was free.
    · AC 2 — it is NOT a report. Different token, so `segments()` opens
      nothing, the presence gate stays red, and nothing here asserts that a
      review happened. Cannot-determine keeps its own name.
    · AC 3 — it reaches the PR, in the same manner as the `spawn-failed` and
      `report-degraded` arms, so the fact does not survive only in the log.

    Why a PR comment rather than machine-local state, since story 1.35 left
    that open: the budget is derived from the PR's comment bodies, and state
    beside the tool would be invisible to `rounds_used()` on any other
    machine — the same PR, swept twice, would have two different budgets. The
    story's own worry about this option was that a synthetic segment fed to a
    segment-counting budget compounds the over-count. It does, which is why
    `rally_cycles()` lands first: against a CYCLE count the mark is bounded by
    the head it names, and a real report at that head subsumes it entirely.
    """
    lines = [f"review-round-unverified: {head}",
             "",
             f"**review-lane spawn produced no readable outcome** for "
             f"`{head[:7]}` — the report could not be verified (the PR comment "
             "read failed).",
             "",
             "This is CANNOT-DETERMINE, which is neither a report nor an "
             "absence. It carries no presence token, asserts nothing about "
             "whether a review landed, and the merge gate stays red — "
             "correctly.",
             "",
             "It is recorded because the round was **paid for**: a session "
             "ran and consumed a real review round. The line above is what "
             "the budget reads, so a spawn whose outcome nobody could read is "
             "no longer free (kogaki#190). If a report for this head does "
             "become readable later, that report SUBSUMES this line and the "
             "head still costs one round — this can never double-charge.",
             ""]
    if denials:
        lines.append("Tools the spawned session was denied:")
        lines += [f"- `{d}`" for d in denials]
        lines.append("")
    lines += [f"Route log: `{log_path}`"]
    return "\n".join(lines)


def post_unverified_round(pr, head, log_path, denials):
    """Put `unverified_round_body()` on the PR. True iff it landed."""
    try:
        subprocess.run(["gh", "pr", "comment", str(pr), "--body",
                        unverified_round_body(head, log_path, denials)],
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
    fragment case behaving as it should rather than a special rule for it.

    Each FINDING carries a fourth field, its DISPOSITION (§4 clause 8,
    kogaki#224): `'carried'`, `'declined'`, or None when the finding declared
    none. A disposition line binds to the immediately preceding `finding:` line
    IN THIS SEGMENT — one before any finding disposes of nothing and is dropped
    — and the FIRST disposition on a finding wins, on the same
    a-later-line-never-revises-an-earlier-claim rule scope and completeness
    already follow.

    A MALFORMED disposition (`carried: soon`, a bare `declined:`) is NOT a
    disposition and is collected separately in `bad_disp`, so `decide()` can
    say so. Reading it as absent would be correct arithmetic and a silent
    report — the shape this file has now shipped three times."""
    segs, cur = [], None
    for line in (bodies or '').splitlines():
        r = REPORT.match(line)
        if r:
            cur = {'sha': r.group(1), 'findings': [],
                   'scope': None, 'complete': None, 'bad_disp': [],
                   'base': None, 'adjudicates': {}}
            segs.append(cur)
            continue
        if cur is None:
            continue        # a declaration before any report belongs to none
        # CLAUSE 12'S ADJUDICATION LINE, bound by the SHARED grammar
        # (`lib/adjudication.py`, kogaki#288). Both binding rules — it binds to
        # the immediately preceding `finding:` line, and the first declaration
        # per finding wins — live there, so this loop and the merge gate's read
        # the same record from the same text. Read in the SAME single pass as
        # the findings, like every other declaration here: two sequential
        # passes over one parser is how the use-vs-mention defect got in.
        if bind_adjudication(cur, line):
            continue
        b = BASE.match(line)
        if b:
            if cur['base'] is None:      # first declaration wins
                cur['base'] = b.group(1)
            continue
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
            cur['findings'].append(
                (f.group(1), f.group(2), bool(f.group('just')), None))
            continue
        d = DISPOSITION.match(line)
        if d:
            kind, val = d.group('kind'), d.group('val')
            if not cur['findings']:
                continue    # a disposition before any finding disposes of none
            if not disposition_ok(kind, val):
                cur['bad_disp'].append(f"{kind}: {val}".rstrip(': '))
                continue
            sev, st, just, prev = cur['findings'][-1]
            if prev is None:            # FIRST declaration wins
                cur['findings'][-1] = (sev, st, just, kind)
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


def report_dispositions(current, downgraded):
    """§4 clause 8 (kogaki#224) — THE `done` BOUNDARY REPORTS UNDISCHARGED
    NON-GATING FINDINGS. It REPORTS. It never gates, never denies, and never
    changes the state it was called from.

    THE POLARITY IS THE POINT, so it is stated at the carrier and not only in
    the spec. kogaki#72's budget is ratified economics: `should` and `nit` NEVER
    gate a merge, and nothing here reopens that. `checks/check-review-report.sh`
    is untouched by this clause — a PR whose every non-gating finding is
    undispositioned merges exactly as it did yesterday. What was missing was not
    a denial; it was anybody SAYING SO at the boundary where the findings stop
    being read. The served surface rules on the direction: "the review lane's
    judgment half must NEVER be designed to depend on a blocking review verdict"
    (product-lab@dec0d568 topics/claude-code-ops.md:29).

    THE SPECIMEN IS THIS REPOSITORY'S OWN WORK, three times in ~24 hours. PR
    #221 merged with five findings open and zero carriers — one of them a real
    shipped defect, `indentedPinQuotes` reporting a wrong line number whenever a
    fenced block precedes the offending line. PR #231 merged with three `should`
    open (repaired post-merge in #238); PR #240 with eight (repaired in
    f2f986c). Every one of those merges was CORRECT. Both repairs happened
    because somebody re-read the report by chance, which is the diagnosis
    exactly: "an item whose discharging act is unnamed produces no surfaced next
    action, and that silence is caused by the gap rather than evidence of
    completeness" (product-lab@dec0d568 LESSONS.md:45).

    WHAT IT READS IS PRESENCE, NEVER ADEQUACY. `declined: not worth it`
    satisfies the clause, and that is the correct trade — whether a disposition
    is the RIGHT one is judgment the lane owns, while whether a finding carries
    one is a computable fact over a declared record
    (product-lab@dec0d568 topics/claude-code-ops.md:19,
    `authenticate-facts-mechanically-gate-judgments`). A record somebody can
    argue with is the whole delta over five findings nobody re-reads.

    THE DOWNGRADED BLOCKINGS ARE IN THE CLASS, and are passed in rather than
    recomputed — an unjustified `blocking open` fails toward merge as a `should`
    (kogaki#72), so it is exactly as non-gating as one, and a class defined on
    the severity FIELD alone would miss the population the downgrade creates.
    One reader, one definition; the caller already computed it.

    SILENCE WHEN THERE IS NOTHING TO SAY. A `done` with every finding
    dispositioned prints nothing, on the same rule clause 4's in-flight report
    obeys: "when the verdict count is zero, no gate-shaped nag may be emitted"
    (product-lab@98195e0a topics/archive/knowledge-architecture.md:197). This
    function is reached on EVERY poll that reaches `done`, so a nag here would
    be emitted repeatedly at exactly the channel-eroding cadence that line
    names.
    """
    undischarged = [(sev, st) for s in current
                    for sev, st, _j, d in s['findings']
                    if sev in NON_GATING and st == 'open' and d is None]
    # The downgraded set carries `blocking` in its severity field and `should`
    # in its behaviour; it is named by its behaviour, because that is the fact
    # the operator needs — the merge did not stop for it.
    undischarged += [('should (downgraded blocking)', st)
                     for _s, st, _j, d in downgraded if d is None]
    bad = [b for s in current for b in s['bad_disp']]
    if bad:
        print(f"NOTE: {len(bad)} malformed disposition line(s) — "
              + "; ".join(f"`{b}`" for b in bad)
              + " — read as NO disposition (§4 clause 8, kogaki#224). "
                "`carried:` takes `#<N>` or `register`; `declined:` requires a "
                "reason")
    if not undischarged:
        return
    counts = {}
    for sev, _st in undischarged:
        counts[sev] = counts.get(sev, 0) + 1
    tally = ", ".join(f"{n} {sev}" for sev, n in sorted(counts.items()))
    print(f"NOTE: {len(undischarged)} open non-gating finding(s) reach `done` "
          f"with NO stated disposition ({tally}) — §4 clause 8, kogaki#224. "
          "This is a REPORT and gates nothing: the merge is governed by "
          "`blocking` alone (kogaki#72) and is unaffected. Each owes a "
          "`carried: #<N>` (or `carried: register` for an accretion-class "
          "finding) or a `declined: <reason>` on the line after the finding, "
          "chosen by WHERE THE DEFECT LIVES rather than by its severity. "
          "Undischarged, they evaporate at merge — which is what happened on "
          "PR #221, #231 and #240")


def decide(bodies, head, resolves=None, base=None,
           diff_at=None, merge_base=None):
    """The sweep's whole state machine, as a pure function.

    Returns one of:
      spawn-round-N  — no report for this head and rounds remain
      park           — no report for this head and the rounds are spent
      author-owes    — a report for this head carries open blocking findings
                       AND rounds remain. The ball is with the author, and
                       since kogaki#53 the driver spawns the FIX here rather
                       than waiting for a session to notice. What it still
                       never does is spawn a REVIEW here — that would re-read
                       code nobody has changed since the report that judged it
      supersede      — the same open blocking findings with the bound SPENT
                       (kogaki#338). The fix cannot land here — no round could
                       read it — so it is owed as the successor change. NOTE
                       what this state does TODAY: the driver announces the
                       supersession and names the findings the successor owes.
                       Opening the successor and closing this PR are a named
                       slot, not shipped behaviour. Formerly this fell to
                       `author-owes` and then to a driver that refused the fix
                       and printed PARKED, which is a dead end rather than a
                       state. §4 clause 3 governs
      unadjudicated  — a report for this head with nothing blocking open,
                       while an EARLIER counted segment holds a justified
                       `blocking open` that no later segment adjudicates
                       (§4 clause 12, kogaki#288). The merge gate is red and
                       this used to return `done`, which is a terminal state
                       asserted over a PR the merge layer was refusing. IT
                       SPAWNS NOTHING, decided rather than defaulted: nothing
                       about the diff has changed, so the never-re-review rule
                       above binds, and the repair is one `adjudicates:` line
                       in a comment at this head — no round, none of clause 3's
                       bound. Asked through `lib/adjudication.py`, the same
                       predicate the merge gate denies on, so the two cannot
                       answer differently
      done           — a report for this head with nothing blocking open.
                       Since kogaki#224 this transition also REPORTS every open
                       non-gating finding carrying no disposition (§4 clause 8)
                       — a report, never a gate: `done` is still `done`, and
                       the merge is still governed by `blocking` alone

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
    # AND THE SAME DISCLOSURE FOR THE ROUNDS NOBODY COULD READ (kogaki#190).
    # Emitted here, before any return, on the same ground and for the same
    # reason as the loop above: `decide()` already announces a round it
    # DISCOUNTED, and a round it CHARGES to a spawn whose report was never
    # readable is the more surprising of the two — the count moved and the PR
    # carries no report explaining why. Without it, AC 2's "the two facts
    # remain distinct in the output" held on the arm's own line and nowhere
    # the state machine speaks.
    _uh, _um = rally_cycles(bodies, resolves)
    if _um:
        print(f"NOTE: {len(_um)} round(s) are charged to spawned session(s) "
              "whose report could NOT be read (kogaki#190) — cannot-determine, "
              "not a review. The head they name is NOT reviewed and the merge "
              "gate stays red; what they establish is only that the round was "
              "paid for. Route logs are named on the PR beside each "
              "`review-round-unverified:` line")
    # THE CARRY-FORWARD IS CONSUMED HERE (§4 clause 7 v2, kogaki#308). Before
    # this, `current` was `head_segments(segs, head)` — sha identity alone —
    # while the merge gate resolved the SAME question by diff hash. A head
    # that moved without changing content therefore read `not reviewed` here
    # and `reviewed` there, and the disagreement spent the bounded resource:
    # with rounds remaining this function returned `spawn-round-N` and the
    # sweep paid an owner grant and a round to re-read a byte-identical diff.
    #
    # The reads are INJECTED and default to None, so every existing fixture
    # calls this exactly as it did and gets exactly what it got. A caller that
    # supplies no base gets sha-identity resolution — not a silent downgrade,
    # because it is the same answer the caller asked for before.
    carried = []
    # THE GUARD IS ON THE READERS, NOT ON THE BASE (kogaki#323). It used to
    # read `if base and diff_at and merge_base:`, so where the PR's base could
    # not be resolved — `pr.get("baseRefOid") or None` at the call site — the
    # unit was never entered and its FIRST record line, written for exactly
    # that case, was unreachable from this consumer:
    #
    #   "carry-forward NOT computed: the PR's current base could not be
    #    resolved, so there is nothing to compare against — stale, failing
    #    toward the reviewed side"
    #
    # The gate has always called `carry_forward(bodies, head, base or None, …)`
    # unconditionally and printed that line. So the two consumers agreed on the
    # RESOLUTION and disagreed on its DISCLOSURE — the residue one layer down
    # from the defect §4 clause 7 v2 repaired, and the same state-absence
    # discipline inverted on one branch.
    #
    # Fixture purity is untouched: `decide(bodies, head)` still supplies
    # neither reader, so every pre-existing fixture takes the same path it did.
    if diff_at and merge_base:
        carried, record = carry_forward(bodies, head, base, diff_at,
                                        merge_base, segments)
        # THE RECORD IS PRINTED, NOT DISCARDED (PR #321 round 1). The first
        # form of this bound it to `_record` and printed only on the positive
        # branch — so a carry-forward that could NOT be computed (an
        # unresolvable base; a `base...head` diff git could not read, which is
        # the ORDINARY case for a head never fetched into this worktree) and
        # one computed as `DIFFERS, stale` were both indistinguishable from
        # "no carry-forward was attempted at all". That is the silent
        # re-derivation clause 7 forbids at its pin, and the unit's own
        # docstring names it: "the equality is RECOMPUTED AND RECORDED, never
        # assumed … a carry-forward that left no record is the silent
        # re-derivation". The gate has always printed every line; the sweep
        # printed none of the negative ones, which is the state-absence
        # discipline this repository applies everywhere else inverted.
        for _line in record:
            print(f"  clause-7 {_line}")
        # ANNOUNCED, on this function's established discipline: every other
        # discount and charge above says so before any return. A head that is
        # reviewed only BY CARRY-FORWARD is the more surprising of the two —
        # the PR carries no report naming this sha and the state machine
        # calls it reviewed anyway — so it is the one that most owes a line.
        if carried:
            print(f"NOTE: {len(carried)} report(s) carry forward to {head[:7]} "
                  "— the diff at this head is BYTE-IDENTICAL to the diff they "
                  "reviewed (§4 clause 7). This head is reviewed and NO round "
                  "is spent; a carry-forward is not a round and consumes none "
                  "of clause 3's bound. Shas: "
                  + ", ".join(c[:7] for c in carried))
    current = head_segments(segs, head, carried)
    if any(counted(s) for s in current):
        # Only a JUSTIFIED blocking gates (kogaki#72): an unjustified one
        # fails toward merge as a should — same rule as the presence check.
        blocking = [1 for s in current for sev, st, just, _d in s['findings']
                    if sev == 'blocking' and st == 'open' and just]
        # THE DOWNGRADE IS REPORTED ON THIS PATH TOO (kogaki#76). The presence
        # check emits its NOTE from its own loop; this function is the DRIVER's
        # view of the same finding set, and it was silent — so a blocking the
        # driver decided not to act on left no trace where the driver's reader
        # is looking. Same fact, two readers, and only one was told.
        downgraded = [(sev, st, just, d)
                      for s in current for sev, st, just, d in s['findings']
                      if sev == 'blocking' and st == 'open' and not just]
        if downgraded:
            print(f"NOTE: {len(downgraded)} unjustified blocking finding(s) "
                  "downgraded to should, non-gating (kogaki#72) — the driver "
                  "does not treat them as author-owes")
        if blocking:
            # THE ONE TRANSITION THAT HAD NO NEXT ACT (kogaki#338, §4 clause 3).
            # `author-owes` with the bound spent used to fall through to the
            # driver, which refused the fix (correctly — it could never be
            # reviewed) and printed PARKED. Correct at each step and a dead end
            # taken together: the lane stopped producing heads. The state is
            # now named for what it owes, and the naming is the whole change —
            # `author-owes` still means "the ball is with the author on THIS
            # branch", which is exactly what it stops meaning once no round can
            # read that branch again.
            #
            # Read here rather than at the driver because this is where the
            # blocking set is already computed; asking the driver to recompute
            # it is the two-call-sites defect this file has paid for twice.
            if rounds_used(bodies, resolves) >= MAX_ROUNDS:
                return 'supersede'
            return 'author-owes'
        # THE MERGE GATE'S OTHER RED (§4 clause 12; kogaki#288). Everything
        # above reads the CURRENT head only, which is correct for every state
        # it decides and is exactly why `done` was reachable while the merge
        # layer refused: an EARLIER counted segment can hold a justified
        # `blocking open` that no later segment adjudicates, and nothing here
        # looked. Asked through the SHARED predicate both consumers load, so
        # this cannot answer differently from the gate it is reporting on.
        _unadj = unadjudicated_blocking(bodies, head, carried)
        if _unadj:
            return 'unadjudicated'
        report_dispositions(current, downgraded)
        return 'done'
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

# --- §4 clause 8: the disposition grammar and the `done` report (kogaki#224) --
# SITED HERE, DIRECTLY AFTER decide()'s OTHER DISCLOSURE PASS, AND THAT PLACEMENT
# IS EVIDENCE-DRIVEN. The first version sat 1,200 lines below, after the phantom
# and cycle passes — and the mutation run found that the polarity mutant (this
# clause's ONE binding constraint: invert the report into a gate) was caught by
# the PHANTOM fixture, which calls sys.exit(1) first, so the assertion that
# NAMES the constraint never ran at all. A guard that is masked by an earlier
# exit is asserted nowhere it can speak, which is this file's oldest recurring
# shape one level up: the fixture existed, passed, and could not have reported
# the thing it was written for.
#
# ASSERTED ON THE VERDICT AS WELL AS THE TEXT, in both directions. The whole
# point of this clause is that NOTHING CHANGES about what merges, so every case
# asserts the verdict too, and the polarity case asserts it alone.
_pfail = 0
_DH = 'abc1234def'


def _disp(bodies, head=_DH):
    """(verdict, the clause-8 report text or '') for one body."""
    buf = _io.StringIO()
    with _ctx.redirect_stdout(buf):
        v = decide(bodies, head)
    out = buf.getvalue()
    keep = [l for l in out.splitlines() if 'kogaki#224' in l]
    return v, "\n".join(keep)


def _rep(*lines):
    return f"review-lane report: {_DH}\n" + "\n".join(lines)


for _label, _body, _want_verdict, _want_undisp, _want_bad in [
    # -- the two directions of the property itself ------------------------
    ("an undischarged `should open` is REPORTED",
     _rep("finding: should open  x"), 'done', True, False),
    ("a `carried: #N` discharges it",
     _rep("finding: should open  x", "carried: #245"), 'done', False, False),
    ("a `declined: <reason>` discharges it",
     _rep("finding: nit open  x", "declined: cosmetic, and the register would "
          "not read it"), 'done', False, False),
    ("`carried: register` discharges it — the accretion-class carrier that "
     "stops one issue per nit (AC 4)",
     _rep("finding: nit open  x", "carried: register"), 'done', False, False),
    ("a RESOLVED non-gating finding owes nothing",
     _rep("finding: should resolved  x"), 'done', False, False),
    # -- THE POLARITY. This is the constraint, not a companion to it. -----
    ("THE REPORT NEVER GATES: five undischarged findings still reach `done`",
     _rep(*["finding: should open  x"] * 3, *["finding: nit open  y"] * 2),
     'done', True, False),
    ("and a JUSTIFIED blocking still gates, unaffected by any disposition",
     _rep("finding: blocking open [harm: x]  x", "carried: #245",
          "finding: should open  y"), 'author-owes', False, False),
    # -- the downgraded blocking is IN the class (kogaki#72) --------------
    ("an UNJUSTIFIED blocking, downgraded to should, is in the class",
     _rep("finding: blocking open  x"), 'done', True, False),
    ("and a disposition discharges it there too",
     _rep("finding: blocking open  x", "declined: the justification is the "
          "fix, landing here"), 'done', False, False),
    # -- well-formedness, both arms --------------------------------------
    ("a BARE `declined:` is malformed — the evaporation with a word in front",
     _rep("finding: should open  x", "declined:"), 'done', True, True),
    ("`carried: soon` is malformed — a carrier is an issue or the register",
     _rep("finding: should open  x", "carried: soon"), 'done', True, True),
    # -- the anchoring rules the three sibling declarations already carry --
    ("MENTIONING `declined:` in a finding's prose declares nothing "
     "(use vs mention, kogaki#41)",
     _rep("finding: should open  the author declined: to fix it"),
     'done', True, False),
    ("a disposition before any finding disposes of nothing",
     _rep("carried: #245", "finding: should open  x"), 'done', True, False),
    # THE BINDING IS TO THE IMMEDIATELY PRECEDING FINDING, and the ORDER here
    # is what makes the case discriminate. The first version put the
    # disposition BETWEEN the two findings, where a segment-wide mutant is
    # indistinguishable from the correct parser — at that moment the segment
    # holds one finding, so binding "to all" and "to the last" are the same
    # act. Both findings must already be open when the line arrives.
    ("a disposition after TWO findings binds to the LAST, not to the segment",
     _rep("finding: should open  x", "finding: nit open  y", "carried: #245"),
     'done', True, False),
]:
    _v, _txt = _disp(_body)
    _got = (_v, 'NO stated disposition' in _txt,
            'malformed disposition' in _txt)
    if _got != (_want_verdict, _want_undisp, _want_bad):
        print(f"FAIL clause-8 fixture [{_label}]: "
              f"(verdict, undischarged-reported, malformed-reported)={_got}, "
              f"want {(_want_verdict, _want_undisp, _want_bad)}")
        _pfail = 1

# FIRST-DECLARATION-WINS IS A PARSER INVARIANT AND IS ASSERTED AT THE PARSER.
# It cannot be seen through `decide()` at all: the report says WHICH findings
# lack a disposition, so overwriting `carried` with `declined` leaves every
# observable identical and the fixture that tried to assert it through the
# report text passed against its own mutant. Either the invariant is asserted
# where it is decidable or it is not asserted — and it is the same rule the
# three sibling declarations carry, so it is kept and asserted structurally.
_fw = segments(_rep("finding: should open  x", "carried: #245",
                    "declined: changed my mind"))[0]
if _fw['findings'][0][3] != 'carried':
    print("FAIL clause-8 fixture [the FIRST disposition on a finding wins]: "
          f"retained {_fw['findings'][0][3]!r}, want 'carried' — a later line "
          "must never revise an earlier claim (§4 clause 8, the rule clauses "
          "5, 6 and 7 already follow)")
    _pfail = 1

# A DISPOSITION LINE IS NOT A FINDING. Count equality (§4 clause 6) must be
# blind to it, or every dispositioned report becomes a FRAGMENT and this clause
# would turn the gate RED — the precise failure the polarity constraint forbids,
# reachable through the parser rather than through the verdict.
_dc = segments(_rep("finding: should open  x", "carried: #245",
                    "finding: nit open  y", "declined: cosmetic",
                    "report-complete: 2 findings"))[0]
if not (len(_dc['findings']) == 2 and counted(_dc)):
    print("FAIL clause-8 fixture [a disposition line does not count toward "
          f"`report-complete:`]: findings={len(_dc['findings'])}, "
          f"counted={counted(_dc)} — want 2, True. A dispositioned report read "
          "as a FRAGMENT would turn the gate red on the exact findings "
          "kogaki#72 says must never gate")
    _pfail = 1

# THE VERIFICATION SPECIMEN, kept as data rather than as a claim in a commit
# message: PR #221's round-2 report (745300a, 2026-08-07T11:32), whose six
# findings are one `blocking resolved` and FIVE open non-gating ones with zero
# carriers. The merge was CORRECT. This asserts the carrier would have named
# all five at that PR's own `done`.
_221 = _rep(
    "finding: blocking resolved [harm: check-boundary-receipts failed]  ...",
    "finding: should open  AC6's fixture obligation is still not discharged",
    "finding: should open  the arm selection still has no decision record",
    "finding: should open  `indentedPinQuotes` still reports a wrong line "
    "number whenever a fenced block precedes the offending line",
    "finding: nit open  the `--recheck` report line is a behaviour change "
    "#209's Not-in-scope clause does not name",
    "finding: nit open  the in-source receipt copy is v1-shaped",
    "report-complete: 6 findings")
_v221, _t221 = _disp(_221)
if not (_v221 == 'done' and '5 open non-gating finding(s)' in _t221
        and '3 should' in _t221 and '2 nit' in _t221):
    print(f"FAIL clause-8 fixture [the PR #221 specimen]: verdict={_v221}, "
          f"report={_t221!r} — want `done` naming 5 undischarged findings, "
          "3 should and 2 nit")
    _pfail = 1

if _pfail:
    print("FAIL: §4 clause 8's disposition grammar and `done` report do not "
          "hold (kogaki#224)")
    sys.exit(1)
print("disposition pass: 14/14 grammar cases + first-declaration-wins and "
      "count-blindness at the parser + the PR #221 specimen (5 undischarged "
      "findings named at `done`, verdict unchanged)")

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
_TR = ["tools/review-sweep.sh", ".claude/skills/review-lane/**"]
_TT = {"careful_paths": _TC, "ordinary_paths": _TO, "reflexive_paths": _TR}
for _label, _paths, _want_class, _want_fallback, _want_cheap in [
    ("a checks/ path resolves careful", ["checks/registry.json"],
     "careful", False, False),
    ("BRANCH-BLIND: a `direct/71-*` PR editing checks/ is still careful "
     "(the resolver never sees a branch)", ["checks/registry.json"],
     "careful", False, False),
    ("spec/ and policy/ and the hooks are careful",
     ["spec/SPEC.md", "policy/source.yaml", ".claude/hooks/review-trigger.py"],
     "careful", False, False),
    # The ordinary cases below deliberately do NOT use `tools/review-sweep.sh`
    # as their stand-in for cheap code any more: it is the reviewing instrument
    # and is now reflexive. A `.claude/skills/` member that is NOT the review
    # lane carries the ordinary side instead, which also asserts that the new
    # class did not swallow `.claude/skills/**` whole.
    ("ordinary code resolves ordinary",
     [".claude/skills/terrain/SKILL.md", "docs/stories/1.19.md", "README.md"],
     "ordinary", False, True),
    ("a MIXED diff takes its most careful file, never an average",
     [".claude/skills/terrain/SKILL.md", "specs/SPEC.md"],
     "careful", False, False),
    ("`*.md` is top level only — specs/SPEC.md is NOT ordinary",
     ["specs/SPEC.md"], "careful", False, False),
    ("an unclassified path falls back, and never to the cheap tier",
     ["deps/spec-external-deps.json"], None, True, False),
    ("ordinary + one unclassified path falls back for the whole diff",
     [".claude/skills/terrain/SKILL.md", "gates/g.json"], None, True, False),
    ("an unreadable diff is cannot-determine, which falls back",
     None, None, True, False),
    ("an empty diff falls back rather than resolving cheap", [], None, True, False),
    # --- the reflexive class (kogaki#99) ---------------------------------
    # The measured defect first: `tools/review-sweep.sh` is ALSO `tools/**`,
    # so before this class existed the review of the reviewer resolved
    # sonnet/24 and died at the cap without posting. The case below is the
    # regression that would catch a re-ordering of the resolver.
    ("the reviewing instrument is REFLEXIVE, not ordinary, though it is also "
     "`tools/**`", ["tools/review-sweep.sh"], "reflexive", False, False),
    ("the review lane's skill is reflexive, though it is also "
     "`.claude/skills/**`", [".claude/skills/review-lane/SKILL.md"],
     "reflexive", False, False),
    ("reflexive + ordinary: the reflexive class WINS the whole diff",
     ["tools/review-sweep.sh", "README.md"], "reflexive", False, False),
    ("reflexive + careful: the same tier either way, but the class REPORTED "
     "is the reflexive one",
     [".claude/skills/review-lane/SKILL.md", "specs/SPEC.md"],
     "reflexive", False, False),
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
print("tier pass: 14/14 diff-class cases (reflexive-first / careful / ordinary "
      "/ mixed-takes-careful / branch-blind / unclassified, unreadable and "
      "empty fall back to the careful side, and every fallback announces "
      "itself)")

# The reflexive class is DELIBERATELY NARROW, so its NAMED WIDENING MECHANISM
# is asserted rather than described: an operator who declares
# $KOGAKI_REVIEW_TIER_REFLEXIVE_PATHS gets their list, and a member that is not
# on it falls back through the ordinary axis. A narrow list with an
# unexercised override is a narrow list with no trigger.
_rofail = 0
for _label, _rp, _paths, _want_class in [
    ("an operator's widened list reaches a path the shipped one does not",
     _TR + ["checks/check-review-report.sh"], ["checks/check-review-report.sh"],
     "reflexive"),
    ("and without that declaration the same path is plain `careful`",
     _TR, ["checks/check-review-report.sh"], "careful"),
    ("an operator's NARROWED list gives up the class it dropped",
     [".claude/skills/review-lane/**"], ["tools/review-sweep.sh"], "ordinary"),
]:
    _k = resolve_tier(_paths, careful_paths=_TC, ordinary_paths=_TO,
                      reflexive_paths=_rp)[2]
    if _k != _want_class:
        print(f"FAIL reflexive-override fixture [{_label}]: class={_k!r}, "
              f"want {_want_class!r}")
        _rofail = 1
if _rofail:
    print("FAIL: the reflexive class has no working operator override, so a "
          "deliberately narrow list has no named way to widen")
    sys.exit(1)
print("reflexive-override pass: 3/3 cases (widened / shipped / narrowed)")

if ((TIER_CAREFUL_PATHS, TIER_ORDINARY_PATHS, TIER_REFLEXIVE_PATHS)
        != (_TC, _TO, _TR)):
    print("NOTE: the tier table is OVERRIDDEN by env — the cases above "
          "exercised the shipped table, and this run resolves against "
          f"reflexive={','.join(TIER_REFLEXIVE_PATHS)} "
          f"careful={','.join(TIER_CAREFUL_PATHS)} "
          f"ordinary={','.join(TIER_ORDINARY_PATHS)}")

# --- the grant table and its composition constraint (kogaki#74) -----------
# The table is asserted in BOTH directions, because the issue's whole risk was
# one-directional: a list that only ever grows passes any test that asks
# "is X granted?". These cases also ask what must NEVER be granted, and name
# the reason inline so a future widening has to argue with it rather than
# silently satisfy the file.
#
# The reviewer/fixer split is asserted on the PROMPT too, not only the tools.
# COMPOSITION names grants the fixer does not hold, and the file's own recorded
# habit is that a fix applied at one of two call sites is the shape it keeps
# finding — so the second call site is checked here rather than assumed.
_gfail = 0
_RT = REVIEW_TOOLS.split(",")
for _label, _cond in [
    ("`Write` is granted — the post-once rule is unimplementable without it",
     "Write" in _RT),
    ("`gh pr comment` stays with the reviewer", "Bash(gh pr comment:*)" in _RT),
    ("NEVER `Bash(bash:*)` — a general shell dissolves the enumeration",
     "Bash(bash:*)" not in _RT),
    ("NEVER `Bash(gh api:*)` — `gh api -X DELETE` matches it",
     "Bash(gh api:*)" not in _RT),
    ("NEVER `Bash(git -C:*)` — it grants `git push` in any directory, which "
     "the reviewer's --detach exists to prevent",
     "Bash(git -C:*)" not in _RT),
    ("NEVER `Bash(python3:*)` — a general interpreter, same class as `bash`",
     "Bash(python3:*)" not in _RT),
    ("the reviewer is told not to compose the refused shapes",
     "COMPOSE ONLY WHAT YOU ARE GRANTED" in COMPOSITION),
    ("...and the alternative is named for each of the three, so the "
     "constraint is actionable rather than a prohibition",
     all(s in COMPOSITION
         for s in ("merge-base", "ALREADY INSIDE", "headRefOid"))),
    ("the fixer never receives the posting contract", "POSTING" not in FIX_TOOLS),
]:
    if not _cond:
        print(f"FAIL grant fixture [{_label}]")
        _gfail = 1
if _gfail:
    print("FAIL: the grant table or its composition constraint does not hold — "
          "a table that only grows is the one-member-per-incident tell "
          "(LESSONS.md:45)")
    sys.exit(1)
print("grant pass: 9/9 cases (Write granted; four unbounded grants refused by "
      "name; the composition constraint reaches the reviewer with an "
      "alternative per refused shape)")

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

# --- a refusal is terminal for that command (kogaki#100) -------------------
# EXERCISED, NOT REASONED ABOUT. Every input below is the real stream shape
# recorded in §4 so it is not re-derived from the logs: the event carries
# `tool_name`, `tool_use_id`, `message` and `decision_reason_type` and NOT
# `tool_input`, so the command text is joined BACKWARDS from the preceding
# `assistant` tool_use block. A suite that fed the event a `tool_input` it
# never carries would pass while the live path produced bare tool names.
_dfail = 0
_ASSIST = ('{"type":"assistant","message":{"content":[{"type":"tool_use",'
           '"id":"tu_1","name":"Bash","input":{"command":'
           '"git fetch origin master"}}]}}')
_DENY = ('{"type":"system","subtype":"permission_denied","tool_name":"Bash",'
         '"tool_use_id":"tu_1","decision_reason_type":"subcommandResults",'
         '"message":"requires approval"}')
for _label, _got, _want in [
    ("the key is the first three words under the tool name",
     terminal_key("Bash", "git fetch origin master --prune"),
     "Bash(git fetch origin)"),
    ("a rephrasing past the third word hits the SAME key — which is the whole "
     "reason the key is normalized",
     terminal_key("Bash", "git fetch origin 2>&1 | tail -3"),
     "Bash(git fetch origin)"),
    ("a DIFFERENT git subcommand is a different key — the compound-command "
     "class kogaki#74 found has granted alternatives must not be over-blocked",
     terminal_key("Bash", "git log --oneline -5"), "Bash(git log --oneline)"),
    ("a tool with no command keys on its own name",
     terminal_key("mcp__tsurezure__gloss_index", ""),
     "mcp__tsurezure__gloss_index"),
    ("a short command keys on what there is",
     terminal_key("Bash", "jq"), "Bash(jq)"),
    ("and `denied_tools`' operator-facing label is the SAME string, because it "
     "is now the same function", terminal_key("Bash", "git fetch origin master"),
     "Bash(git fetch origin)"),
]:
    if _got != _want:
        print(f"FAIL denial fixture [{_label}]: {_got!r}, want {_want!r}")
        _dfail = 1

# The watch, over a stream in the order the harness emits it.
_w = DenialWatch(os.devnull, os.devnull)
for _line in (_ASSIST, _DENY,
              '{"type":"result","permission_denials":[{"tool_name":"Bash"}]}'):
    _w.feed(_line)
for _label, _got, _want in [
    ("the backward join by tool_use_id recovers the command the event lacks",
     _w.terminal, ["Bash(git fetch origin)"]),
    ("the in-session event is counted", _w.events, 1),
    ("the terminal field supplies the measurement (AC 5)", _w.measured, 1),
]:
    if _got != _want:
        print(f"FAIL denial fixture [{_label}]: {_got!r}, want {_want!r}")
        _dfail = 1

# A denial whose tool_use_id joins to NOTHING still makes a key, from the
# event's own tool_name: an unjoinable event must degrade to a coarser key
# rather than to no key at all.
_w2 = DenialWatch(os.devnull, os.devnull)
_w2.feed('{"type":"system","subtype":"permission_denied","tool_name":"Write",'
         '"tool_use_id":"tu_missing"}')
if _w2.terminal != ["Write"] or _w2.non_bash != ["Write"]:
    print(f"FAIL denial fixture [an unjoinable non-Bash event]: "
          f"{_w2.terminal!r} / {_w2.non_bash!r}")
    _dfail = 1

# ORDINARY FAILURES ARE NOT DENIALS. The key is the EVENT, never `is_error`:
# 16 of 310 error results in the measured corpus are ordinary failures and none
# carries a denial event. A carrier keyed on `is_error` would read a transient
# failure as terminal, which is the slot's own counter-argument.
_w3 = DenialWatch(os.devnull, os.devnull)
_w3.feed(_ASSIST)
_w3.feed('{"type":"user","message":{"content":[{"type":"tool_result",'
         '"tool_use_id":"tu_1","is_error":true,"content":"jq: command not found"}]}}')
_w3.feed('{"type":"result","permission_denials":[]}')
if _w3.terminal or _w3.events or _w3.measured:
    print(f"FAIL denial fixture [an ordinary failure is not a denial]: "
          f"{_w3.terminal!r} / {_w3.events} / {_w3.measured}")
    _dfail = 1

# AC 6 — the reconciliation, in all three shapes. The ABSENT case is the point:
# it must read as prevention-unavailable and NEVER as "no denials".
_recon = [
    ("both signals present", 2, 2, "denials: 2 measured", None),
    ("the event path ABSENT — the CLI 2.1.222 shape", 12, 0,
     "prevention unavailable this run", "12 denials measured, 0 prevented"),
    ("a denial the event path does not cover", 3, 1,
     "reached\nthe terminal field with NO matching in-session event".replace(
         "\n", " "), None),
    ("no denials at all says nothing about prevention", 0, 0,
     "denials: 0 measured", None),
]
for _label, _measured, _events, _must, _also in _recon:
    _w4 = DenialWatch(os.devnull, os.devnull)
    _w4.measured, _w4.events = _measured, _events
    _text = " ".join(_w4.reconcile())
    if _must not in _text or (_also and _also not in _text):
        print(f"FAIL denial fixture [{_label}]: {_text!r}")
        _dfail = 1
    if _measured and not _events and "no denials" in _text.lower():
        print(f"FAIL denial fixture [{_label}]: an absent event path reported "
              "as 'no denials' — the measured-absence defect itself")
        _dfail = 1

# THE GENERATED GATE IS EXERCISED, not merely written. A hook that never ran is
# a carrier whose inputs have no writer: it would look installed and refuse
# nothing. This compiles it, then runs its decision over both directions.
_gate_src = denial_gate_source()
try:
    _ns = {}
    exec(compile(_gate_src.replace("sys.exit(main())", ""),
                 "<denial-gate>", "exec"), _ns)
    if _ns["terminal_key"]("Bash", "git fetch origin master") != \
            terminal_key("Bash", "git fetch origin master"):
        print("FAIL denial fixture [the generated gate's key rule drifted from "
              "its one definition]")
        _dfail = 1
except Exception as _e:                      # noqa: BLE001 — the fixture IS the report
    print(f"FAIL denial fixture [the generated gate does not compile]: {_e}")
    _dfail = 1
_gate_file = os.path.join(tempfile.mkdtemp(prefix="kogaki-gate-"), "gate.py")
with open(_gate_file, "w", encoding="utf-8") as _f:
    _f.write(_gate_src)
_state = _gate_file + ".json"
_prev = _gate_file + ".prevented"
with open(_state, "w", encoding="utf-8") as _f:
    json.dump(["Bash(git fetch origin)"], _f)
_genv = dict(os.environ, KOGAKI_TERMINAL_DENIALS=_state,
             KOGAKI_TERMINAL_PREVENTED=_prev)
for _label, _payload, _want_deny in [
    ("a terminal command is REFUSED on any rephrasing",
     {"tool_name": "Bash", "tool_input": {"command": "git fetch origin 2>&1"}},
     True),
    ("an untouched command is admitted",
     {"tool_name": "Bash", "tool_input": {"command": "git log --oneline"}},
     False),
    ("a different tool is admitted", {"tool_name": "Read", "tool_input": {}},
     False),
]:
    _r = subprocess.run(["python3", _gate_file], input=json.dumps(_payload),
                        capture_output=True, text=True, env=_genv)
    _denied = "deny" in _r.stdout
    if _denied != _want_deny or _r.returncode != 0:
        print(f"FAIL denial fixture [{_label}]: rc={_r.returncode} "
              f"out={_r.stdout!r} err={_r.stderr!r}")
        _dfail = 1
    if _denied and "cannot-determine" not in _r.stdout:
        print(f"FAIL denial fixture [{_label}]: the refusal does not route the "
              "session to a cannot-determine line (AC 3)")
        _dfail = 1
# AND IT FAILS OPEN, in exactly one direction: prevention is an enhancement
# over the guaranteed measurement path, so an unreadable state file admits the
# call rather than costing the whole review.
_r = subprocess.run(["python3", _gate_file],
                    input=json.dumps({"tool_name": "Bash",
                                      "tool_input": {"command": "git fetch origin"}}),
                    capture_output=True, text=True,
                    env=dict(os.environ, KOGAKI_TERMINAL_DENIALS="/nonexistent",
                             KOGAKI_TERMINAL_PREVENTED=_prev))
if "deny" in _r.stdout or _r.returncode != 0:
    print(f"FAIL denial fixture [an unreadable state file must fail OPEN]: "
          f"rc={_r.returncode} out={_r.stdout!r}")
    _dfail = 1
# The gate records its OWN firings, so prevention is never inferred.
if not os.path.exists(_prev) or not open(_prev).read().strip():
    print("FAIL denial fixture [the gate did not record its firing, so "
          "prevention would be inferred rather than observed]")
    _dfail = 1
shutil.rmtree(os.path.dirname(_gate_file), ignore_errors=True)
if _dfail:
    print("FAIL: a refusal is not terminal for that command (kogaki#100)")
    sys.exit(1)
print("denial pass: 6/6 key cases (three-word normal form / rephrasing hits / "
      "sibling subcommand does not / no-command / short / one label) + 3 watch "
      "cases (backward join, event count, terminal-field measurement) + "
      "unjoinable-event + ordinary-failure-is-not-a-denial + 4 reconciliation "
      "shapes (the absent event path never reads as 'no denials') + 5 "
      "generated-gate cases (compiles, key rule has not drifted, refuses a "
      "rephrasing with a cannot-determine route, admits siblings and other "
      "tools, fails OPEN, records its own firing)")

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

# --- AC 5: THE MOVED HEAD WHOSE DIFF DID NOT CHANGE (§4 clause 7 v2, #308) --
#
# The table above has no such case, and three of its eight cases encode the
# sha-only reading as CORRECT — `one stale report -> round 2` and `two stale
# reports -> park` are exactly this shape with the diff-equality question
# never asked. So the suite certified the shape it was built in, which is why
# the defect survived every green run.
#
# THE RED DEMONSTRATION IS PERMANENT RATHER THAN A ONE-OFF. AC 5 asks that the
# case fail before the fix; a manual revert-and-rerun proves that once and
# leaves nothing behind. Instead each case is decided TWICE — once through the
# resolution this clause installed, once through the sha-identity resolution
# it replaced — and the fixture asserts they DISAGREE. A future edit that
# quietly restores sha-only resolution turns this red, which a single-answer
# assertion could not do.
_MOVED, _OLD, _MBASE = "aaaaaaa", "bbbbbbb", "ccccccc"
_SAME_DIFF = "--- a/f\n+++ b/f\n@@ -1 +1 @@\n-x\n+y\n"
_OTHER_DIFF = _SAME_DIFF + "@@ -9 +9 @@\n-p\n+q\n"


def _reads(table):
    """(diff_at, merge_base) over a dict, through the SHARED form."""
    return make_git_readers(
        lambda *a: table.get(a[-1]) if a[0] == "diff" else _MBASE)


_carry_body = (f"review-lane report: {_OLD}\nreview-base: {_MBASE}\n"
               "finding: nit open  y\nreport-complete: 1 findings")

CARRY_FIX = [
    # The expensive case: rounds remain, so sha-identity SPENDS one.
    ("a moved head whose diff is IDENTICAL is reviewed, not a new round",
     _carry_body, {_MBASE + "..." + _MOVED: _SAME_DIFF,
                   _MBASE + "..." + _OLD: _SAME_DIFF},
     'done', 'spawn-round-2'),
    # The cheap case: the bound is spent, so sha-identity PARKS a mergeable PR.
    ("a moved head whose diff is IDENTICAL does not park a mergeable PR",
     _carry_body + f"\nreview-lane report: 8888888\nreview-base: {_MBASE}",
     {_MBASE + "..." + _MOVED: _SAME_DIFF,
      _MBASE + "..." + _OLD: _SAME_DIFF,
      _MBASE + "...8888888": _OTHER_DIFF},
     'done', 'park'),
    # The discriminating negative: content really changed, so nothing carries.
    ("a moved head whose diff DIFFERS still spends a round",
     _carry_body, {_MBASE + "..." + _MOVED: _OTHER_DIFF,
                   _MBASE + "..." + _OLD: _SAME_DIFF},
     'spawn-round-2', 'spawn-round-2'),
]

# --- kogaki#323: THE UNRESOLVED BASE IS DISCLOSED, NOT SILENT ----------------
#
# The guard used to be `if base and …`, so this branch never ran and the unit's
# own first record line was unreachable from the sweep. Asserted on the OUTPUT
# rather than on the verdict: the verdict was already correct (no base, no
# carry-forward, so the head is unreviewed and a round is owed) — what was
# missing was anybody SAYING SO, which is the whole defect.
_u_out = _io.StringIO()
with _ctx.redirect_stdout(_u_out):
    _u_state = decide(_carry_body, _MOVED, _ALL, base=None,
                      diff_at=lambda *a: None, merge_base=lambda *a: None)
_u_text = _u_out.getvalue()
if "carry-forward NOT computed" not in _u_text:
    bad.append("carry-forward [unresolved base]: the record line is absent — "
               "an unresolvable base is indistinguishable from no attempt "
               "(kogaki#323)")
if "could not be resolved" not in _u_text:
    bad.append("carry-forward [unresolved base]: the record does not name the "
               "base as the thing it could not resolve")
if _u_state != 'spawn-round-2':
    bad.append(f"carry-forward [unresolved base]: verdict changed to "
               f"{_u_state!r} — this clause disclosed, it never re-decided")

# AND THE NO-READER PATH IS UNCHANGED, which is the other half of #323's
# acceptance: a caller supplying neither reader must take exactly the path it
# took before this clause existed, printing no clause-7 line at all.
_n_out = _io.StringIO()
with _ctx.redirect_stdout(_n_out):
    _n_state = decide(_carry_body, _MOVED, _ALL)
if "clause-7" in _n_out.getvalue():
    bad.append("carry-forward [no readers]: a caller supplying no git reads "
               "got clause-7 output — the injection default has leaked")
if _n_state != 'spawn-round-2':
    bad.append(f"carry-forward [no readers]: got {_n_state!r}, want "
               "'spawn-round-2' — the pre-clause behaviour changed")

for _name, _body, _table, _want, _want_old in CARRY_FIX:
    _d, _m = _reads(_table)
    _got = decide(_body, _MOVED, _ALL, base=_MBASE, diff_at=_d, merge_base=_m)
    if _got != _want:
        bad.append(f"carry-forward [{_name}]: got {_got!r}, want {_want!r}")
    # The same inputs through the OLD unit — no base, so sha identity alone.
    _got_old = decide(_body, _MOVED, _ALL)
    if _got_old != _want_old:
        bad.append(f"carry-forward [{_name}] pre-fix baseline: got "
                   f"{_got_old!r}, want {_want_old!r}")
    if _want != _want_old and _got == _got_old:
        bad.append(f"carry-forward [{_name}]: the new resolution agrees with "
                   "the sha-only one on a case that must discriminate — the "
                   "fix is not in force")

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

# --- the successor lane (kogaki#338, §4 clause 3) -------------------------
# THE TRIGGER IS THE PARK-PRODUCING STATE AND NOTHING WIDER, so the fixture
# asserts BOTH directions: the state that must supersede, and the four
# neighbouring states that must NOT. A trigger tested only where it fires is
# indistinguishable from one that fires everywhere — the shape this file has
# already paid for three times in its disclosure branches.
#
# The `drives_fix()` half is asserted beside it because the two are one
# contract: superseding is what happens INSTEAD of a fix on the blocked
# branch, so a change that made both true would produce the unreviewable head
# the cap exists to forbid, and neither assertion alone would notice.
#
# MUTATIONS RUN, AND WHICH CASE CAUGHT EACH (kogaki#209; PR #341 review round
# 1, nit). A fixture not shown to discriminate is a coverage claim rather than
# coverage, and ABSENCE of the code under test is the one mutation that proves
# almost nothing here — every case asserting a state OTHER than `supersede`
# passes trivially when the new branch is gone.
#
#   narrowing  `return 'supersede'` unreachable   -> case 1 fails
#              (spent+blocking no longer supersedes)
#   widening   the `>= MAX_ROUNDS` guard dropped  -> case 2 fails
#              (rounds remaining wrongly supersedes)
#   widening   the `just` filter relaxed          -> the clause-8 fixture
#              above fails FIRST and exits, so this suite never runs
#
# The third row is recorded rather than tidied away, because it is a fact about
# the SUITE and not about these cases: an earlier `sys.exit(1)` masks every
# later fixture's evidence, so "the run went red" is not by itself evidence
# that the assertion under test discriminated. Verified by re-running that
# mutation with the earlier exit suppressed, where case 2 fails as designed.
_SPENT = f"review-lane report: 9999999\nreview-lane report: {H}\n"
_sfail = 0
for _label, _bodies, _head, _want in [
    ("rounds spent AND justified blocking open -> supersede",
     _SPENT + "finding: blocking open [harm: x]  x", H, 'supersede'),
    ("rounds REMAIN with the same findings -> author-owes, not supersede",
     f"review-lane report: {H}\nfinding: blocking open [harm: x]  x",
     H, 'author-owes'),
    ("rounds spent but only NON-GATING findings -> done, no successor summoned",
     _SPENT + "finding: should open  x\nfinding: nit open  y", H, 'done'),
    ("rounds spent and an UNJUSTIFIED blocking -> done (kogaki#72 downgrade "
     "survives: a successor is not summoned by a finding that does not gate)",
     _SPENT + "finding: blocking open  x", H, 'done'),
    ("rounds spent and NO report for this head -> park, unchanged",
     f"review-lane report: 9999999\nreview-lane report: 8888888", H, 'park'),
]:
    _got = decide(_bodies, _head, _ALL)
    if _got != _want:
        print(f"FAIL successor-lane fixture [{_label}]: got {_got}, want {_want}")
        _sfail = 1
# The blocked branch never receives a fix, whatever the state is called.
if drives_fix(_SPENT + "finding: blocking open [harm: x]  x", H, _ALL):
    print("FAIL successor-lane fixture: a fix was driven for a superseded PR — "
          "the cap must bind the driver (§4 clause 3)")
    _sfail = 1
if _sfail:
    # EXITS, never merely reports. The first draft of this block set a local
    # flag that nothing read, so every case above could have failed while the
    # suite passed — a fixture that cannot fail the run is worse than none,
    # because it reads as coverage. Caught before landing; recorded because the
    # shape is this file's most-repeated defect and the note is cheaper than
    # the next rediscovery.
    sys.exit(1)
else:
    print("successor pass: 5/5 successor-lane cases (spent+blocking supersedes; "
          "rounds remaining does not; non-gating does not; an unjustified "
          "blocking does not; an unreviewed head still parks), plus the "
          "no-fix-on-the-blocked-branch invariant")

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
    # DERIVED FROM THE CONDITION, not from the arithmetic. This read
    # `_rounds < len(segments(...))` until kogaki#190, which was the same
    # number only while one segment meant one round — once two reviewers on
    # one head became ONE round, a shortfall stopped implying a discount and
    # this assertion would have demanded a NOTE about a fabrication that had
    # not happened. Ask `performed()` what `decide()` asks it.
    _expected_note = any(not performed(_s, _res) for _s in segments(_bodies))
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

# --- a round is a CYCLE, and a cycle nobody could read still costs ---------
# kogaki#190. TWO PROPERTIES, ONE FIXTURE BLOCK, because they are one function.
#
#   · THE UNIT. The cap bounds rallies, and `rounds_used()` counted segments.
#     The specimen is the first case below and it is not hypothetical: two
#     reviewers landing on one head spent the whole cap while the author was
#     never given a chance to move the head, four times in one session. A
#     stricter rule about WHICH segments count could never have caught it —
#     the property's unit is the head and the detector's unit was the segment,
#     so the cases here are written over pairs, not over single segments.
#
#   · THE ARM WITH NO RECORD. A spawn whose report could not be read left
#     nothing in `bodies`, so it cost a real review and cost the budget zero.
#     The mark closes that, and the LAST THREE cases are the ones that keep the
#     close from buying itself an over-count: a mark is subsumed by a real
#     report at its own head, it never turns anything green, and it is not a
#     report to any reader that asks.
#
# Both directions are asserted. A budget that can only grow is as wrong as one
# that cannot: the `--UNDER` cases below would pass under a counter that simply
# charged more, and the `--OVER` cases would pass under the old one.
_cfail = 0
_CH = 'abc1234def'
for _label, _bodies, _head, _res, _want_state, _want_rounds in [
    # OVER — the incident. Two reviewers, one head, one cycle.
    ("THE SPECIMEN: two reviewers on ONE head is ONE round, not a park",
     "review-lane report: 9999999\nreview-lane report: 9999999",
     _CH, _ALL, 'spawn-round-2', 1),
    ("two reports on the CURRENT head is one round, and the head is reviewed",
     f"review-lane report: {_CH}\nreview-lane report: {_CH}\n"
     "finding: nit open  x",
     _CH, _ALL, 'done', 1),
    ("an abbreviated and a full spelling of one head are ONE cycle",
     f"review-lane report: abc1234\nreview-lane report: {_CH}",
     _CH, _ALL, 'done', 1),
    # UNDER — distinct heads are still distinct rounds. The fix must not
    # collapse a real rally into one cycle.
    ("two DISTINCT heads are still two rounds, and still park",
     "review-lane report: 9999999\nreview-lane report: 8888888",
     _CH, _ALL, 'park', 2),
    # UNDER — the unverified arm. Free before this story.
    ("a spawn nobody could read COSTS a round (it was paid for)",
     "review-round-unverified: 9999999",
     _CH, _ALL, 'spawn-round-2', 1),
    ("TWO unverified spawns at one head park the PR — the repetition is bounded",
     f"review-round-unverified: {_CH}\nreview-round-unverified: {_CH}",
     _CH, _ALL, 'park', 2),
    ("a mark and a report on different heads are two rounds",
     "review-lane report: 9999999\nreview-round-unverified: 8888888",
     _CH, _ALL, 'park', 2),
    # OVER — and the mark must not double-charge the round it records. This is
    # the PR #174 specimen: the report HAD landed and the read failed.
    ("a report SUBSUMES a mark at its own head — one round, never two",
     f"review-round-unverified: {_CH}\nreview-lane report: {_CH}",
     _CH, _ALL, 'done', 1),
    # A MARK IS NOT A REPORT. It costs a round and turns nothing green.
    ("a mark at the current head leaves that head UNREVIEWED",
     f"review-round-unverified: {_CH}",
     _CH, _ALL, 'spawn-round-2', 1),
    ("a mark cannot hold a PR at author-owes either — it carries no findings",
     f"review-round-unverified: {_CH}\nfinding: blocking open [harm: x]  x",
     _CH, _ALL, 'spawn-round-2', 1),
]:
    _buf = _io.StringIO()
    with _ctx.redirect_stdout(_buf):
        _got = decide(_bodies, _head, _res)
        _rounds = rounds_used(_bodies, _res)
    if (_got, _rounds) != (_want_state, _want_rounds):
        print(f"FAIL cycle fixture [{_label}]: state={_got!r} rounds={_rounds}, "
              f"want state={_want_state!r} rounds={_want_rounds}")
        _cfail = 1
# THE MARK IS NOT A REPORT TO ANY READER THAT ASKS (AC 2), asserted over the
# readers rather than over the regex: a token that only the counter treats as
# a non-report is a token the presence side may still be fooled by, and this
# file's own filed defect is two instruments disagreeing about one artifact.
_mark = f"review-round-unverified: {_CH}"
for _label, _got, _want in [
    ("`segments()` opens NO segment for a mark", segments(_mark), []),
    ("no head segment either", head_segments(segments(_mark), _CH), []),
    ("`head_scope()` sees no report", head_scope(_mark, _CH), (None, False)),
    ("the mark IS visible to the budget", unverified_marks(_mark), [_CH]),
    ("prose mentioning the phrase is not a mark",
     unverified_marks("I saw a review-round-unverified: line somewhere"), []),
]:
    if _got != _want:
        print(f"FAIL cycle fixture [{_label}]: got {_got!r}, want {_want!r}")
        _cfail = 1
# WHAT REACHES THE PR (AC 3) is asserted over the composed text, so the arm's
# contract is exercised without a network. The body must carry the marker as
# its OWN anchored line — a marker that lands indented, or after prose the
# regex will not match, is a round that is still free while looking recorded.
_body = unverified_round_body(_CH, "/tmp/pr-1-round-1.log", ["Bash(gh pr:*)"])
for _label, _ok in [
    ("the posted body carries the mark where the budget reads it",
     unverified_marks(_body) == [_CH]),
    ("the posted body is NOT a report and opens no segment",
     segments(_body) == []),
    ("it names the denied tools it observed", "Bash(gh pr:*)" in _body),
    ("it routes the reader to the log", "/tmp/pr-1-round-1.log" in _body),
    ("it says cannot-determine rather than claiming a review",
     "CANNOT-DETERMINE" in _body),
]:
    if not _ok:
        print(f"FAIL cycle fixture [{_label}]")
        _cfail = 1
# THE CHARGE IS DISCLOSED WHERE THE STATE MACHINE SPEAKS, and the class the
# park announces is SELECTED (PR #208 review round 1). AC 2 asks that a
# cannot-determine stay distinct from a genuine absence IN THE OUTPUT, and the
# first cut discharged that on the arm's own printed line and nowhere else —
# so a park whose rounds were all unread spawns printed a postmortem blaming a
# push that never happened. Both halves are asserted over the EMITTED TEXT,
# because a fixture that asserts only the verdict is exactly what let the
# downgrade NOTE ship on one of two paths (kogaki#76).
for _label, _bodies, _want_note, _want_class in [
    ("a charged unread spawn is ANNOUNCED by decide()",
     f"review-round-unverified: {_CH}", True, "unverified-rounds"),
    ("two of them park, and the park does NOT blame a push",
     f"review-round-unverified: {_CH}\nreview-round-unverified: {_CH}",
     True, "unverified-rounds"),
    ("a mark beside a real report is a MIXED park, counted as both",
     f"review-lane report: 9999999\nreview-round-unverified: 8888888",
     True, "mixed-rounds"),
    ("reports only: no notice, and the historical class is unchanged",
     "review-lane report: 9999999\nreview-lane report: 8888888",
     False, "unreviewed-head (a push landed after the final round)"),
    ("no bodies at all: the historical class, and no notice",
     "", False, "unreviewed-head"),
    # kogaki#210 — the fourth class. Every case above turns on `performed()`;
    # these turn on `counted()`, and each FAILS against the three-class form,
    # which announced a push that did not happen.
    ("one head, fragment only: a FRAGMENT park, and it blames no push",
     f"review-lane report: {_CH}\nfinding: nit open  x\nreport-complete: 4 findings",
     False, "fragment-rounds"),
    ("two charged heads, both fragments: still a fragment park",
     "review-lane report: 9999999\nfinding: nit open  x\nreport-complete: 4 findings\n"
     "review-lane report: 8888888\nfinding: nit open  y\nreport-complete: 3 findings",
     False, "fragment-rounds"),
    ("a fragment beside a COUNTED report at another head: a head WAS reviewed",
     "review-lane report: 9999999\nfinding: nit open  x\nreport-complete: 4 findings\n"
     "review-lane report: 8888888",
     False, "unreviewed-head (a push landed after the final round)"),
]:
    _buf = _io.StringIO()
    with _ctx.redirect_stdout(_buf):
        decide(_bodies, _CH, _ALL)
    _said = "could NOT be read" in _buf.getvalue()
    if _said != _want_note:
        print(f"FAIL cycle fixture [{_label}]: the charge was "
              f"{'announced without happening' if _said else 'SILENT'}")
        _cfail = 1
    _got_class = park_class(_bodies, _ALL)
    if _want_class not in _got_class:
        print(f"FAIL cycle fixture [{_label}]: park class {_got_class!r} "
              f"does not carry {_want_class!r}")
        _cfail = 1
if _cfail:
    print("FAIL: a round is still counted per segment, or a spawn nobody "
          "could read is still free or silent — kogaki#190")
    sys.exit(1)
print("cycle pass: 10/10 round-counting cases (two reviewers on one head is "
      "ONE round; distinct heads still park; an unread spawn costs a round; "
      "two of them park; a report subsumes its mark) + 5 mark-is-not-a-report "
      "reader cases + 5 posted-body cases + 8 disclosure cases (the charge is "
      "announced by decide(); the park SELECTS its class and never blames a "
      "push that did not happen; a park whose charged heads carry no COUNTED "
      "report is a FRAGMENT park, and one counted head anywhere is not)")

# --- kogaki#204: a poll must never re-fire the trigger it waits on ---------
#
# The three states are asserted over `round_state()` with an injected clock and
# filesystem, so a case about a log that does NOT exist can be written at all —
# the same reason `performed()` injects `resolves`.
#
# Each case FAILS against the pre-fix code, which had no terminal line and no
# state function: every invocation spawned, which is the defect.
_inflight_fail = 0
_T = TERMINAL_MARK + " round closed"
for _label, _kw, _want in [
    ("no log at all -> absent, so the first spawn proceeds",
     dict(exists=False), 'absent'),
    ("log written, no terminal line, NO PID, inside the window -> "
     "CANNOT-DETERMINE (v1 called this in-flight and could not say why)",
     dict(exists=True, text="=== spawn: claude -p ...", now=1000.0, mtime=990.0,
          ttl=1800), 'cannot-determine'),
    ("the terminal line is present -> finished, however old",
     dict(exists=True, text="=== spawn: ...\n" + _T, now=9e9, mtime=0.0,
          ttl=1800), 'finished'),
    ("no terminal line and the window has passed -> absent, so a retry is allowed",
     dict(exists=True, text="=== spawn: ...", now=1000.0, mtime=0.0, ttl=60),
     'absent'),
    ("exactly at the window edge still BLOCKS (<=, not <) — and reports "
     "cannot-determine, since the window only ever decides that case",
     dict(exists=True, text="=== spawn: ...", now=1060.0, mtime=1000.0, ttl=60),
     'cannot-determine'),
    ("an isolation failure closes its own round rather than looking live",
     dict(exists=True, text="=== worktree FAILED: x\n" + TERMINAL_MARK +
          " round closed (isolation failed)", now=1000.0, mtime=999.0,
          ttl=1800), 'finished'),
]:
    _got = round_state("/nonexistent", **_kw)
    if _got != _want:
        print(f"FAIL in-flight fixture [{_label}]: got {_got!r}, want {_want!r}")
        _inflight_fail = 1

# THE RE-FIRE ITSELF, over a real file rather than injected state: the second
# invocation must spawn NOTHING and return the sentinel, and the caller must
# recognise it rather than folding it into `result != 0`.
_tmpd = tempfile.mkdtemp()
_lp = os.path.join(_tmpd, "pr-999-round-1.log")
with open(_lp, "w") as _f:
    _f.write("=== spawn: claude -p /review-lane 999\n")
if round_state(_lp) != 'cannot-determine':
    print("FAIL in-flight fixture [a freshly written PID-LESS round log reads "
          "cannot-determine, not in-flight — it blocks either way, and the "
          "operator is told WHICH]")
    _inflight_fail = 1
with open(_lp, "a") as _f:
    _f.write(_T + "\n")
if round_state(_lp) != 'finished':
    print("FAIL in-flight fixture [a closed round log reads finished]")
    _inflight_fail = 1
shutil.rmtree(_tmpd, ignore_errors=True)

# EACH WRITE PATH NAMED, AND WHICH RUN COVERS IT. `spawn()` closes its round on
# two paths and they are exercised differently, so the split is written down
# rather than left for a reader to assume one fixture covers both — "write down
# each path and which passing run covers it; a path with no named run is
# untested no matter how healthy the overall suite looks"
# (verify-each-guard-on-each-write-path).
#
#   isolation-failure path   BEHAVIOURAL, below: spawn() is really called with
#                            ref=None, which raises before any process launch.
#   process-completion path  STRUCTURAL only, below: exercising it requires
#                            launching a real session, which a fixture pass may
#                            not do. Asserted on the source instead, and this
#                            comment is the disclosure that it is weaker.
_tmpd2 = tempfile.mkdtemp()
_lp2 = os.path.join(_tmpd2, "pr-998-round-1.log")
_buf2 = _io.StringIO()
with _ctx.redirect_stdout(_buf2):
    _rc2 = spawn("fixture — never launched", _lp2, ref=None, tag="fixture-noop", grant_class="fixture")
if "isolation could not be established" not in _buf2.getvalue():
    print("FAIL in-flight fixture [the isolation failure announces itself]")
    _inflight_fail = 1
if _rc2 != ISOLATION_FAILED:
    print(f"FAIL in-flight fixture [a ref-less spawn returns ISOLATION_FAILED]: got {_rc2}")
    _inflight_fail = 1
if round_state(_lp2) != 'finished':
    print("FAIL in-flight fixture [an isolation failure CLOSES its round] — "
          "the log would read in-flight for the whole window and block its own retry")
    _inflight_fail = 1
# THE WRITER, asserted on the same real spawn() call (kogaki#227). Every case
# above builds the pid line by hand, so none would notice if spawn() stopped
# recording it — the producer gap that made two mutants free.
with open(_lp2, encoding="utf-8", errors="replace") as _pf:
    _ptxt = _pf.read()
if PID_MARK not in _ptxt:
    print("FAIL in-flight fixture [spawn() does not record its pid] — liveness is then "
          "unobservable and every round falls back to the window, which is the v1 defect")
    _inflight_fail = 1
elif attempt_pid(_ptxt) != os.getpid():
    print(f"FAIL in-flight fixture [spawn() records the WRONG pid]: got {attempt_pid(_ptxt)}, "
          f"want {os.getpid()} — the owning process is the sweep, which waits on the child")
    _inflight_fail = 1
shutil.rmtree(_tmpd2, ignore_errors=True)

# The completion path's write, asserted on the source because the behavioural
# form would cost a real session. A mutation that drops it leaves every
# finished round reading in-flight until the window expires.
# The shell cd's to the repository root before this heredoc runs, so this
# resolves to the file the heredoc came from.
with open('tools/review-sweep.sh', encoding='utf-8') as _sf:
    _src = _sf.read()
# [1] is the text after the FIRST occurrence — the real finally. [-1]
# would land after this fixture's own literal, which is a check that
# always fails: the searched-for text following itself.
_after_finally = _src.split('remove_worktree(base, tree, log)')[1][:900]
# The IDENTIFIER, not the constant's value: the source writes
# `log.write(f"{TERMINAL_MARK} ...")`, so the value never appears there.
if 'TERMINAL_MARK' not in _after_finally:
    print("FAIL in-flight fixture [the completion path does not close its round] — "
          "spawn()'s finally block no longer writes the terminal line, so every "
          "finished round reads in-flight until the window expires")
    _inflight_fail = 1

# AC7's BEHAVIOURAL half (PR #219 review round 1, finding 2). The cases above
# assert `round_state()`; this asserts the GUARD BRANCH — that `spawn()`
# presented with an in-flight log returns the sentinel having launched nothing.
# Deleting the `if state == 'in-flight'` block failed no fixture before this,
# which is the dead-fixture shape story 1.36 exists to catch, committed inside
# the change that cites it. Cheap precisely because the guard returns BEFORE
# any Popen.
_tmpd3 = tempfile.mkdtemp()
_lp3 = os.path.join(_tmpd3, "pr-997-round-1.log")
with open(_lp3, "w") as _f:
    _f.write(SPAWN_MARK + " claude -p /review-lane 997\n")
_buf3 = _io.StringIO()
with _ctx.redirect_stdout(_buf3):
    _rc3 = spawn("fixture — must never launch", _lp3, ref="HEAD", tag="fixture-inflight", grant_class="fixture")
if _rc3 != SPAWN_IN_FLIGHT:
    print(f"FAIL in-flight fixture [spawn() returns the sentinel on an in-flight log]: got {_rc3}")
    _inflight_fail = 1
# This log carries NO pid, so the honest decline is cannot-determine — the
# fixture asserted the "IN FLIGHT" literal before kogaki#231 and would have gone
# on passing while the operator was told a liveness nobody checked.
if "COULD NOT BE OBSERVED" not in _buf3.getvalue() or "997" not in _buf3.getvalue():
    print("FAIL in-flight fixture [the decline names the PR and round, and a "
          "PID-LESS log declines as cannot-determine rather than as IN FLIGHT]")
    _inflight_fail = 1
# It launched nothing: the guard returns before the gate file is ever written.
if os.path.exists(_lp3 + ".gate.py"):
    print("FAIL in-flight fixture [spawn() did setup work before declining]")
    _inflight_fail = 1

# AND THE STICKY CASE, which is what finding 1 was: a log carrying a CLOSED
# attempt followed by a NEW `=== spawn:` line is in flight again, not finished
# forever.
with open(_lp3, "a") as _f:
    _f.write(_T + "\n" + SPAWN_MARK + " claude -p /review-lane 997 (second attempt)\n")
if round_state(_lp3) != 'cannot-determine':
    print("FAIL in-flight fixture [a re-used round log reads the CURRENT attempt] — "
          "the terminal mark is sticky and the guard protects only the first spawn")
    _inflight_fail = 1
shutil.rmtree(_tmpd3, ignore_errors=True)

# --- kogaki#227: liveness is ASKED, and cannot-determine is a real answer ---
#
# Every case here fails against the v1 two-valued form, which read a dead
# session as in-flight for the balance of the window.
_LIVE = os.getpid()                     # certainly alive: this process
# ...verified, not assumed — but BOUNDED. An unbounded search here needs the
# very capability the fixture exists to test: under a `pid_alive` that never
# reports False, `while True` spins forever instead of failing. A tripwire must
# be expressible in acts the design can still perform when the failure is
# present (`a-tripwire-cannot-need-the-missing-capability`). Observed: this
# loop hung a mutation run for 180s before the bound was added.
_DEAD = None
for _cand in range(2 ** 22, 2 ** 22 + 200):
    if pid_alive(_cand) is False:
        _DEAD = _cand
        break
if _DEAD is None:
    print("FAIL liveness fixture [no observably-dead pid found in 200 candidates] — "
          "pid_alive never reported False, so the dead-session cases below cannot run")
    _inflight_fail = 1
    _DEAD = 2 ** 22

for _label, _kw, _want in [
    ("a RECORDED LIVE pid is in flight, however old the file",
     dict(exists=True, text=f"{SPAWN_MARK} x\n{PID_MARK} {_LIVE}",
          now=9e9, mtime=0.0, ttl=60), 'in-flight'),
    ("THE #225 SPECIMEN: a dead session frees its round IMMEDIATELY, inside the window",
     dict(exists=True, text=f"{SPAWN_MARK} x\n{PID_MARK} {_DEAD}",
          now=1000.0, mtime=999.0, ttl=1800), 'absent'),
    ("no recorded pid -> CANNOT-DETERMINE is RETURNED, window decides (inside)",
     dict(exists=True, text=f"{SPAWN_MARK} x", now=1000.0, mtime=990.0,
          ttl=1800), 'cannot-determine'),
    ("no recorded pid -> cannot-determine, and the WINDOW decides (outside)",
     dict(exists=True, text=f"{SPAWN_MARK} x", now=1000.0, mtime=0.0,
          ttl=60), 'absent'),
    ("a terminal line still wins over any pid — finished is finished",
     dict(exists=True, text=f"{SPAWN_MARK} x\n{PID_MARK} {_LIVE}\n{_T}",
          now=1000.0, mtime=999.0, ttl=1800), 'finished'),
    ("an EARLIER attempt's pid does not answer for this one",
     dict(exists=True,
          text=f"{SPAWN_MARK} a\n{PID_MARK} {_LIVE}\n{_T}\n{SPAWN_MARK} b",
          now=1000.0, mtime=0.0, ttl=60), 'absent'),
]:
    _got = round_state("/nonexistent", **_kw)
    if _got != _want:
        print(f"FAIL liveness fixture [{_label}]: got {_got!r}, want {_want!r}")
        _inflight_fail = 1

# The three-valued predicate itself, asserted apart from the state machine:
# None is a REAL answer meaning "could not observe", never a failure.
for _label, _pid, _want in [("a live pid", _LIVE, True),
                            ("a dead pid", _DEAD, False),
                            ("no pid at all -> cannot-determine", None, None)]:
    if pid_alive(_pid) is not _want:
        print(f"FAIL liveness fixture [pid_alive: {_label}]")
        _inflight_fail = 1

# `attempt_pid` is scoped to the CURRENT attempt, for the same reason the
# terminal mark is — a re-used log carries earlier attempts' pids.
if attempt_pid(f"{SPAWN_MARK} a\n{PID_MARK} 111\n{SPAWN_MARK} b\n{PID_MARK} 222") != 222:
    print("FAIL liveness fixture [attempt_pid reads the CURRENT attempt's pid]")
    _inflight_fail = 1
if attempt_pid(f"{SPAWN_MARK} a\n{PID_MARK} 111\n{SPAWN_MARK} b") is not None:
    print("FAIL liveness fixture [an attempt with no pid line is cannot-determine, not the previous pid]")
    _inflight_fail = 1

# --dry-run must consult the SAME predicate as --spawn, or the prediction is
# not the act's precondition (kogaki#227's second defect).
with open('tools/review-sweep.sh', encoding='utf-8') as _df:
    _dsrc = _df.read()
# COUNT, do not merely search: this assertion's own literal is an occurrence,
# so `not in` can never be true and the check could never fire — the searched-
# for text finding ITSELF, the same self-match that made the completion-path
# assertion vacuous in story 1.38. Two occurrences = the call site plus this
# line; one = the call site is gone.
if _dsrc.count("_dry_state = round_state(spawn_log_path(n, rnd))") < 2:
    print("FAIL liveness fixture [--dry-run does not consult the in-flight guard] — "
          "a prediction that does not evaluate the gate it predicts is a different "
          "question wearing the answer's clothes")
    _inflight_fail = 1

# THE CLAUSE IS SATISFIED BY WHAT THE DECLINE PRINTS, so that is what is
# asserted (PR #231 review round 1, blocking). §4 clause 4 v2 ratified that the
# decline "says that it could not ask", and the first implementation satisfied
# every state assertion above while printing ONE message for both blocking
# states — four states in the code, a two-valued report at the operator. An
# assertion over `round_state()` alone cannot catch that, because the defect is
# downstream of it. These assert the SENTENCE.
_cd = decline_line('cannot-determine', '/x/pr-9-round-1.log', 12, 1800)
_if = decline_line('in-flight', '/x/pr-9-round-1.log', 12, 1800)
if _cd == _if:
    print("FAIL decline fixture [both blocking states print the SAME sentence] — "
          "this is the exact two-valued report §4 clause 4 v2 was ratified to end")
    _inflight_fail = 1
# The cause-CLASS, not one cause: both arms of pid_alive()'s None must be
# representable in the sentence, or the operator is sent after the wrong repair.
if 'none recorded' not in _cd or 'cannot probe' not in _cd:
    print("FAIL decline fixture [the cannot-determine decline names ONE cause "
          "where the state has TWO] — a pid this host cannot probe is exactly "
          "the case the window is retained for, and it is not 'none recorded'")
    _inflight_fail = 1
if 'COULD NOT BE OBSERVED' not in _cd or 'could not be asked' not in _cd:
    print("FAIL decline fixture [the cannot-determine decline does not SAY it "
          "could not ask] — the clause binds the artifact, not the internal state")
    _inflight_fail = 1
if 'IN FLIGHT' not in _if or 'OBSERVED ALIVE' not in _if:
    print("FAIL decline fixture [the in-flight decline does not state that "
          "liveness was OBSERVED] — a positive claim owes its observation")
    _inflight_fail = 1
# ...and that a cannot-determine decline never claims liveness it did not check.
if 'IN FLIGHT' in _cd:
    print("FAIL decline fixture [the cannot-determine decline still reports IN FLIGHT]")
    _inflight_fail = 1
# Both blocking states must actually reach that printer via the guard's own
# predicate, or the sentences above are unreachable decoration.
for _st in ('in-flight', 'cannot-determine'):
    if _st not in BLOCKS_A_SPAWN:
        print(f"FAIL decline fixture [{_st} does not block a spawn]")
        _inflight_fail = 1
if 'absent' in BLOCKS_A_SPAWN or 'finished' in BLOCKS_A_SPAWN:
    print("FAIL decline fixture [a non-blocking state blocks a spawn]")
    _inflight_fail = 1
# THE SIBLING CALL SITE, asserted by the same count discipline as its twin: the
# FIX branch's dry-run was the one #227 left unguarded.
if _dsrc.count("_fix_state = round_state(fix_log_path(n, used))") < 2:
    print("FAIL liveness fixture [--dry-run does not consult the guard on the FIX "
          "branch] — fixing one call site and leaving its sibling is how the class "
          "survives its own repair")
    _inflight_fail = 1
# And no call site may test a blocking literal directly, which is how the
# fourth token would get dropped on the floor at call site N+1.
# Scoped to CODE, not to prose: the first draft of this assertion matched a
# COMMENT forty lines up that quotes the old literal while describing it, and
# fired on a file that was already correct. A source-scanning assertion owes the
# same discrimination it demands — the searched-for text finding itself, one
# more time, which is why the comment survives here rather than being deleted.
# THE VARIABLE GROUP IS `\w*state`, NOT `state` (PR #231 review round 2).
# The first version required the name to be exactly `state`, so it covered
# `spawn()`'s one occurrence and NO other — while its FAIL text claimed the
# class. Both dry-run call sites are `_dry_state` and `_fix_state`, and before
# the fix commit one of them literally read `if _dry_state == 'in-flight':`,
# the exact shape the message describes. The assertion written to stop call
# site N+1 from escaping was itself scoped to call site N's SPELLING — the
# per-call-site defect one level up, in the guard against it.
#
# Asserted rather than asserted-about: the pattern must match the spellings
# that actually occur here, or the claim is decoration again.
for _spell in ("if state == 'in-flight':",
               "    if _dry_state == 'in-flight':",
               "        elif _fix_state == 'in-flight':"):
    if not re.search(r"^\s*(?:el)?if\s+\w*state == 'in-flight'", _spell):
        print(f"FAIL liveness fixture [the blocking-literal tripwire does not "
              f"match {_spell.strip()!r}] — it would pass over the very call "
              f"sites it names")
        _inflight_fail = 1
if any(re.search(r"^\s*(?:el)?if\s+\w*state == 'in-flight'", _l)
       for _l in _dsrc.splitlines()):
    print("FAIL liveness fixture [a call site tests the 'in-flight' literal rather "
          "than BLOCKS_A_SPAWN] — cannot-determine would silently spawn there")
    _inflight_fail = 1

# AND THE OBSERVED-ALIVE ARM END TO END, which had no spawn()-level coverage at
# all: every real-file decline fixture wrote a pid-less log, so the branch that
# makes a POSITIVE liveness claim was asserted only through round_state().
_tmpd5 = tempfile.mkdtemp()
_lp5 = os.path.join(_tmpd5, "pr-996-round-1.log")
with open(_lp5, "w") as _f:
    _f.write(f"{SPAWN_MARK} claude -p /review-lane 996\n{PID_MARK} {_LIVE}\n")
_buf5 = _io.StringIO()
with _ctx.redirect_stdout(_buf5):
    _rc5 = spawn("fixture — must never launch", _lp5, ref="HEAD", tag="fixture-alive", grant_class="fixture")
if _rc5 != SPAWN_IN_FLIGHT:
    print(f"FAIL liveness fixture [a LIVE pid blocks the spawn]: got {_rc5}")
    _inflight_fail = 1
if "OBSERVED ALIVE" not in _buf5.getvalue() or "996" not in _buf5.getvalue():
    print("FAIL liveness fixture [an observed-alive decline states that it "
          "OBSERVED liveness] — the two blocking states must be told apart at "
          "the operator, which is the whole of the kogaki#231 finding")
    _inflight_fail = 1
if "COULD NOT BE OBSERVED" in _buf5.getvalue():
    print("FAIL liveness fixture [an observed-alive decline claims it could not ask]")
    _inflight_fail = 1
shutil.rmtree(_tmpd5, ignore_errors=True)

# The sentinel must be distinguishable from every real exit code, or the
# caller's `result != 0` branch would swallow it and post a stall comment
# about a session that is still running.
if SPAWN_IN_FLIGHT in (0, ISOLATION_FAILED):
    print("FAIL in-flight fixture [the sentinel collides with a real exit code]")
    _inflight_fail = 1

if _inflight_fail:
    print("FAIL: a poll can still re-fire the trigger it is waiting on — kogaki#204")
    sys.exit(1)
# THE ROLL-UP IS THE ONE LINE AN OPERATOR READS TO LEARN WHAT WAS ASSERTED, so
# it names every half rather than the oldest one (PR #231 review round 1, nit).
# It had gone unchanged across the kogaki#227 additions, which is the failure
# mode a summary has: it keeps passing while describing less and less.
print("in-flight pass: 6/6 round-state cases (absent / cannot-determine / "
      "finished / expired / window edge / isolation-failure closes its round) "
      "+ 2 real-file cases + a REAL spawn() call on the isolation path + the "
      "completion path asserted structurally (disclosed as weaker) + the "
      "sentinel is distinct from every real exit code; kogaki#227 liveness: "
      "6/6 liveness state cases (live pid in flight however old / THE #225 "
      "SPECIMEN, a dead session frees its round immediately / no pid inside "
      "and outside the window / terminal line still wins / an earlier "
      "attempt's pid does not answer for this one) + 3 pid_alive cases + 2 "
      "attempt_pid scoping cases + the spawn() WRITER asserted (the pid line "
      "must land after the real `=== spawn:` line, or the probe never fires) "
      "+ both dry-run call sites consult the guard, counted not searched; "
      "kogaki#231 decline: the two blocking states print DIFFERENT sentences, "
      "cannot-determine says it could not ask and never claims IN FLIGHT, "
      "in-flight states that liveness was OBSERVED, both reach the printer "
      "via BLOCKS_A_SPAWN, and no call site tests a blocking literal directly")

if bad:
    print("FAIL fixture pass — the sweep's state machine does not discriminate:")
    for b in bad:
        print(f"  {b}")
    sys.exit(1)

# --- AC 2: THE AGREEMENT FIXTURE (§4 clause 7 v2, kogaki#308) ---------------
#
# Clause 7 v2 mandates "one definition and an agreement fixture". The
# definition is `lib/head_resolution.py`; this is the fixture, and it runs in
# BOTH consumers rather than in one, because a check that lives only in the
# gate cannot observe the sweep drifting and vice versa.
#
# It asserts two different things, and the second is the one a shared module
# does NOT give you for free:
#   1. the unit is REACHED THE SAME WAY — the other consumer's source carries
#      the identical path constant. A consumer that copied the functions back
#      in, or reached a different file, fails here even though its own tests
#      would all pass.
#   2. the unit ANSWERS THE SAME WAY on vectors that discriminate — including
#      the moved-head case the whole clause exists for.
_agree_fail = []
# The OTHER consumer, named as a plain constant — one literal per file. The
# first form computed it (`"check-review-report" in __file__ ? ... : ...`),
# which folds at authoring since both operands are literals: it READ as a
# self-identifying dispatch while being nothing of the kind, and a verbatim
# copy of this block into the other consumer would fold to the SAME arm and
# point that consumer at ITSELF — whereupon the redefinition test scans its own
# source, finds no local definition, and passes unconditionally. That is the
# orphan guard the anchoring below exists to prevent, one line above it.
_HR_OTHER = "checks/check-review-report.sh"
try:
    with open(_HR_OTHER, encoding="utf-8") as _f:
        _other_src = _f.read()
    # Anchored WHOLE for the same reason the duplicate test below is: this
    # fixture quotes the constant, so an unanchored search finds its own text
    # in the other file and passes unconditionally — an orphan guard that
    # cannot fail. Caught by exercising the drift, not by inspection.
    if not re.search(r'^HEAD_RESOLUTION_PATH = "lib/head_resolution\.py"$',
                     _other_src, re.M):
        _agree_fail.append(
            f"{_HR_OTHER} does not reach the head-resolution unit by the "
            "shared path constant — one consumer has drifted, and clause 7 "
            "v2's single definition is single in name only")
    # Anchored at LINE START — the detector's own literals sit inside a tuple
    # in this very fixture, which is present in both files, so an unanchored
    # search reports every consumer as a duplicator including the compliant one.
    for _dup in ("def same_head(", "def head_segments(", "def carry_forward("):
        if re.search("^" + re.escape(_dup), _other_src, re.M):
            _agree_fail.append(
                f"{_HR_OTHER} redefines `{_dup[4:-1]}` locally — the "
                "two-instruments shape has reappeared")
except OSError as _e:
    _agree_fail.append(f"could not read {_HR_OTHER} to check agreement: {_e}")

# The vectors. `same_head` is symmetric and abbreviation-tolerant; a carried
# sha is this head's segment; the moved-head/identical-diff case resolves
# through content rather than through sha identity.
_A, _B = "abc1234", "abc1234def5678"
if not (same_head(_A, _B) and same_head(_B, _A) and not same_head(_A, "999")):
    _agree_fail.append("same_head disagrees with its own contract")
_segs = [{"sha": "9999999"}, {"sha": "abc1234"}]
if [x["sha"] for x in head_segments(_segs, "abc1234")] != ["abc1234"]:
    _agree_fail.append("head_segments does not resolve by sha")
if [x["sha"] for x in head_segments(_segs, "abc1234", ("9999999",))] != \
        ["9999999", "abc1234"]:
    _agree_fail.append("head_segments does not admit a CARRIED segment as "
                       "this head's — clause 7's second instrument is dead")
if digest("x") != digest("x") or digest("x") == digest("y"):
    _agree_fail.append("digest is not a function of its input")
# The form is part of the resolution: a consumer rendering the diff
# differently would compare two different strings for identical content.
_seen = []
_da, _mb = make_git_readers(lambda *a: _seen.append(a) or "")
_da("BASE", "REV")
if _seen[0] != ("diff", "--no-color", "--unified=3", "BASE...REV"):
    _agree_fail.append(f"the shared diff FORM has drifted: {_seen[0]!r}")

# THE RECORD IS A SHARED VECTOR TOO (kogaki#323 AC 2, PR #327 round 1). The
# first form of this fixture asserted REACH plus resolution vectors, and the
# sweep-side fixture asserted the sweep's own stdout — so the defect #323
# names, two consumers agreeing on the RESOLUTION and diverging on its
# DISCLOSURE, was observed by nothing. A resolution vector cannot see it by
# construction: both consumers compute the same `carried`, and the divergence
# is in what they SAY. These run in both files, so a consumer that stops
# reporting an uncomputable comparison fails in its own suite.
_rec_fail = []
_c0, _r0 = carry_forward("", "aaaaaaa", None,
                         lambda *a: None, lambda *a: None, lambda b: [])
if _c0 or not _r0 or "could not be resolved" not in _r0[0]:
    _rec_fail.append("an unresolvable base must yield NO carry-forward and a "
                     "record naming the base — got "
                     f"carried={_c0!r} record={_r0!r}")
_c1, _r1 = carry_forward("", "aaaaaaa", "ccccccc",
                         lambda *a: None, lambda *a: None, lambda b: [])
if _c1 or not _r1 or "could not be read" not in _r1[0]:
    _rec_fail.append("an unreadable head diff must yield NO carry-forward and "
                     f"a record naming the diff — got carried={_c1!r} "
                     f"record={_r1!r}")
for _m in _rec_fail:
    _agree_fail.append(_m)

if _agree_fail:
    for _m in _agree_fail:
        print(f"FAIL head-resolution agreement: {_m}")
    raise SystemExit(1)
# --- the adjudication unit, and the state it decides (§4 clause 12, #288) ---
# THE FIXTURE THE ISSUE ASKED FOR, in its own words: "a counted clean
# current-head segment plus an unadjudicated earlier-head justified blocking
# must not return `done`". It is the discriminating case because EVERY field of
# the current-head segment says finished — counted, complete, nothing blocking
# open — which is exactly why `decide()` returned a terminal state over a PR
# the merge gate was refusing.
_adj_fail = []
_OLDH, _NEWH = "aaaaaaa1111111", "bbbbbbb2222222"
_clean_now = (f"review-lane report: {_NEWH}\n"
              "finding: should open  cosmetic\n"
              "carried: register\n"
              "report-complete: 1 findings")
_earlier_open = (f"review-lane report: {_OLDH}\n"
                 "finding: blocking open [harm: x]  the defect\n"
                 "report-complete: 1 findings\n")

# 1. THE SPECIMEN. Unadjudicated earlier blocking under a clean current head.
if decide(_earlier_open + _clean_now, _NEWH) != 'unadjudicated':
    _adj_fail.append(
        "a clean counted current-head segment over an UNADJUDICATED earlier "
        "justified blocking does not return `unadjudicated` — this is the "
        "kogaki#288 specimen and the state machine is reporting a terminal "
        "state on a PR the merge gate is refusing")

# 2. THE CONTROL. The same shapes with the adjudication PRESENT must be `done`,
# or the state would be firing on the earlier head rather than on the silence,
# and every green PR in this repository would go red.
_adjudicated = (f"review-lane report: {_NEWH}\n"
                "finding: should open  cosmetic\n"
                f"adjudicates: {_OLDH} finding 1  measured false at this head\n"
                "report-complete: 1 findings")
if decide(_earlier_open + _adjudicated, _NEWH) != 'done':
    _adj_fail.append(
        "an ADJUDICATED earlier blocking does not return `done` — the state "
        "is firing on the earlier finding rather than on the absence of an "
        "adjudication, which gates the SEVERITY and reopens kogaki#72")

# 3. THE STATE SPAWNS NOTHING. Asserted through the driver's own predicate
# rather than by reading the branch: `drives_fix` is what decides whether a fix
# session is born, and a state that quietly became fix-driving would spend a
# session re-reading code nobody changed.
if drives_fix(_earlier_open + _clean_now, _NEWH):
    _adj_fail.append(
        "the `unadjudicated` state drives a FIX — it must spawn nothing, "
        "because nothing about the diff has changed and the repair is one "
        "`adjudicates:` line in a comment (kogaki#288)")

# 4. THE ORDER MATTERS. `author-owes` must still win when the CURRENT head
# carries its own justified blocking — the new state is the clean-current-head
# case only, and swapping the two checks would mask a live blocking behind an
# earlier one.
if decide(_earlier_open + f"review-lane report: {_NEWH}\n"
          "finding: blocking open [harm: y]  live\n"
          "report-complete: 1 findings", _NEWH) != 'author-owes':
    _adj_fail.append(
        "a justified blocking at the CURRENT head no longer returns "
        "`author-owes` — the clause-12 read is masking a live finding")

# 5. THE UNIT IS REACHED BY ONE PATH FROM BOTH CONSUMERS, mirroring the
# head-resolution fixture above. Loading is not agreement: a consumer that
# loaded this and then re-derived the predicate its own way would have the
# divergence back, and a divergent join returns NOTHING rather than disagreeing.
try:
    if not re.search(r'^ADJUDICATION_PATH = "lib/adjudication\.py"$',
                     _other_src, re.M):
        _adj_fail.append(
            f"{_HR_OTHER} does not reach the adjudication unit by the shared "
            "path constant — one consumer has drifted")
    for _dup in ("def unadjudicated_blocking(", "def adjudication_states(",
                 "def bind_adjudication(", "ADJUDICATES = re.compile("):
        if re.search("^" + re.escape(_dup), _other_src, re.M):
            _adj_fail.append(
                f"{_HR_OTHER} redefines `{_dup.split('(')[0].split()[-1]}` "
                "locally — the two-vocabularies shape has reappeared")
    # And THIS file must not redefine them either. The other consumer runs the
    # mirror of this test, but a fixture that only ever inspects its sibling is
    # the orphan guard shape the block above already paid for once.
    _self_adj = open("tools/review-sweep.sh", encoding="utf-8").read()
    for _dup in ("def unadjudicated_blocking(", "def bind_adjudication(",
                 "ADJUDICATES = re.compile("):
        if re.search("^" + re.escape(_dup), _self_adj, re.M):
            _adj_fail.append(
                f"tools/review-sweep.sh redefines `{_dup.split('(')[0].split()[-1]}` "
                "locally — this consumer is the one that drifted")
except OSError as _e:
    _adj_fail.append(f"could not read a consumer to check agreement: {_e}")

if _adj_fail:
    for _m in _adj_fail:
        print(f"FAIL adjudication agreement: {_m}")
    raise SystemExit(1)
print("adjudication pass: 5/5 clause-12 state cases (THE #288 SPECIMEN — a "
      "clean counted current head over an unadjudicated earlier blocking is "
      "NOT `done`; its adjudicated control still is, so the state fires on the "
      "SILENCE and never on the severity; the state drives no fix, asserted "
      "through `drives_fix` rather than by reading the branch; a live "
      "current-head blocking still wins as `author-owes`), and the unit is "
      "reached by one path from both consumers with neither redefining it "
      "(§4 clause 12, kogaki#288)")

print("head-resolution agreement: the unit is reached by one path from both "
      "consumers, neither redefines it, and it answers identically on "
      "sha-identity, carried-segment, digest, diff-form AND RECORD "
      "vectors — the last covering an unresolvable base and an "
      "unreadable diff, so a consumer that stops DISCLOSING an "
      "uncomputable comparison fails here (§4 clause 7 v2, kogaki#323)")

print(f"fixture pass: {len(FIX)}/{len(FIX)} state-machine cases "
      "(round 1 / round 2 / park / done / author-owes / stale-segment), plus "
      f"{len(CARRY_FIX)}/{len(CARRY_FIX)} clause-7 v2 moved-head cases each "
      "decided TWICE — through the shared resolution and through the "
      "sha-identity one it replaced — with the disagreement asserted "
      "(kogaki#308 AC 5)")
print(f"driver pass: {len(DRIVE)}/{len(DRIVE)} fix-spawn cases "
      "(spawn on blocking / no fix without blocking / no fix without a report "
      "/ CAP BINDS with rounds spent / stale blocking summons nothing)")

# --- the third layer: grant fixtures (§4 clauses 3-4, kogaki#295 AC9) --------
# HOME is pointed at a scratch store for the block, exactly as the session
# hook's own fixture does; every case cleans up after itself and the real
# store is never touched.
_grant_fail = 0
_ghome = tempfile.mkdtemp()
_old_home = os.environ.get("HOME")
os.environ["HOME"] = _ghome
_gtmp = tempfile.mkdtemp()
try:
    # AC3, the load-bearing property: an undeclared class refuses, and a
    # declared-but-unknown class refuses identically. No artifact is left.
    _glp = os.path.join(_gtmp, "pr-901-round-1.log")
    _gbuf = _io.StringIO()
    with _ctx.redirect_stdout(_gbuf):
        _grc = spawn("fixture — must never launch", _glp, ref="HEAD",
                     tag="grant-noclass")
    if _grc != GRANT_REFUSED or os.path.exists(_glp):
        print(f"FAIL grant fixture [no class refuses, leaving no artifact]: "
              f"rc={_grc}, log_exists={os.path.exists(_glp)}")
        _grant_fail = 1
    with _ctx.redirect_stdout(_io.StringIO()) as _gbuf2:
        _grc = spawn("fixture — must never launch", _glp, ref="HEAD",
                     tag="grant-unknown", grant_class="janitor")
    if _grc != GRANT_REFUSED:
        print(f"FAIL grant fixture [an unknown class refuses]: rc={_grc}")
        _grant_fail = 1

    # Store-absent is ITS OWN state, distinct from no-grant (PR #296 review,
    # carried finding): a store never created must not read as a lane
    # correctly waiting on the owner.
    if grant_lookup("901")[0] != "store-absent":
        print("FAIL grant fixture [an absent store reports store-absent, "
              "never no-grant]")
        _grant_fail = 1
    _gstore = os.path.join(_ghome, ".claude", "review-approvals")
    os.makedirs(_gstore)
    if grant_lookup("901")[0] != "no-grant":
        print("FAIL grant fixture [an empty store reports no-grant]")
        _grant_fail = 1

    # AC2 + AC9: a reviewer spawn with no grant refuses fail-closed and
    # creates nothing; the refusal names the grant instruction.
    _gbuf3 = _io.StringIO()
    with _ctx.redirect_stdout(_gbuf3):
        _grc = spawn("fixture — must never launch", _glp, ref="HEAD",
                     tag="grant-none", grant_class="reviewer", pr="901")
    if _grc != GRANT_REFUSED or os.path.exists(_glp):
        print(f"FAIL grant fixture [reviewer with no grant refuses]: rc={_grc}")
        _grant_fail = 1
    if "approve-review" not in _gbuf3.getvalue():
        print("FAIL grant fixture [the refusal prints the grant instruction]")
        _grant_fail = 1

    # AC9: an open grant is CONSUMED and the spawn proceeds past the grant
    # gate — proven without launching anything by riding the isolation-failure
    # path (ref=None), which returns AFTER the stamp. The record needs no
    # creator fields: lookup keys repo/pr/round/consumed_at only.
    _grepo = _repo_slug()
    _grecp = os.path.join(_gstore, "g901.json")
    with open(_grecp, "w", encoding="utf-8") as _gf:
        json.dump({"repo": _grepo, "pr": 901, "round": 1,
                   "consumed_at": None}, _gf)
    # AC7 first, on the same record: the dry-run predicate sees it open and
    # leaves it open.
    if grant_lookup("901")[0] != "open":
        print("FAIL grant fixture [the shared predicate sees the open grant]")
        _grant_fail = 1
    with open(_grecp, encoding="utf-8") as _gf:
        if json.load(_gf).get("consumed_at") is not None:
            print("FAIL grant fixture [the dry-run predicate consumed the "
                  "grant it predicted on — the preview became the act]")
            _grant_fail = 1
    with _ctx.redirect_stdout(_io.StringIO()):
        _grc = spawn("fixture — never launched", _glp, ref=None,
                     tag="grant-consume", grant_class="reviewer", pr="901")
    with open(_grecp, encoding="utf-8") as _gf:
        _gafter = json.load(_gf)
    if _grc == GRANT_REFUSED or not _gafter.get("consumed_at"):
        print(f"FAIL grant fixture [an open grant is consumed and the spawn "
              f"proceeds past the gate]: rc={_grc}, "
              f"consumed={_gafter.get('consumed_at')!r}")
        _grant_fail = 1

    # AC9: the consumed grant does not authorize a second spawn.
    with _ctx.redirect_stdout(_io.StringIO()):
        _grc = spawn("fixture — must never launch", _glp, ref="HEAD",
                     tag="grant-spent", grant_class="reviewer", pr="901")
    if _grc != GRANT_REFUSED:
        print(f"FAIL grant fixture [a consumed grant refuses a second "
              f"spawn]: rc={_grc}")
        _grant_fail = 1

    # AC2: an unreadable store refuses.
    with open(os.path.join(_gstore, "bad.json"), "w", encoding="utf-8") as _gf:
        _gf.write("{not json")
    if grant_lookup("901")[0] != "store-unreadable":
        print("FAIL grant fixture [an unreadable store fails closed]")
        _grant_fail = 1

    # AC8: the sweep never CREATES a grant. The creator's signature field is
    # the grant-time stamp (the "granted"-prefixed key the owner act alone
    # writes, outside any session); this file's only store write is the
    # consume stamp, so that literal must not appear here at all — the
    # assertion below builds it by concatenation for exactly that reason.
    # Counted in the source, not searched by eye.
    with open("tools/review-sweep.sh", encoding="utf-8") as _gsrc_f:
        _gsrc = _gsrc_f.read()
    if _gsrc.count("granted" + "_at") != 0:
        print("FAIL grant fixture [AC8: a grant-creation field appears in the "
              "sweep — the store is read-and-consume only]")
        _grant_fail = 1
finally:
    os.environ["HOME"] = _old_home if _old_home is not None else ""
    shutil.rmtree(_ghome, ignore_errors=True)
    shutil.rmtree(_gtmp, ignore_errors=True)

if _grant_fail:
    print("FAIL: the third layer does not bind — §4 clauses 3-4, kogaki#295")
    sys.exit(1)
if GRANT_REFUSED in (0, ISOLATION_FAILED, SPAWN_IN_FLIGHT):
    print("FAIL grant fixture [the sentinel collides with a sibling exit code]")
    sys.exit(1)
print("spawn-grant pass: 11/11 third-layer cases (no class refuses artifact-less / "
      "unknown class refuses / store-absent is its own state / empty store is "
      "no-grant / reviewer refuses grant-less naming the instruction / the "
      "shared predicate reports without consuming / an open grant consumes "
      "and proceeds / a spent grant refuses again / unreadable store fails "
      "closed / the creator field is absent from this file / the sentinel is "
      "distinct)")

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
    # The base rides the SAME `gh pr list` the head sha came from — one more
    # field on a read already made, never a second request.
    _base = pr.get("baseRefOid") or None
    _d_at, _m_base = make_git_readers(
        lambda *a: (lambda r: r.stdout if r.returncode == 0 else None)(_git(*a)))
    state = decide(bodies, head, base=_base,
                   diff_at=_d_at, merge_base=_m_base)
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
    elif state == 'unadjudicated':
        # THE ONE STATE IN THIS DRIVER THAT ACTS ON NOTHING, and the exception
        # is decided rather than defaulted (kogaki#288). Every other red state
        # here spawns something; this one must not, because `decide()`'s own
        # never-re-review-unchanged-code rule applies with full force — NOTHING
        # ABOUT THE DIFF HAS CHANGED. The repair is not a code change at all:
        # it is one `adjudicates:` line in a review comment at this head, which
        # costs no round (kogaki#190 counts cycles by head) and spends none of
        # clause 3's bound.
        #
        # So what this branch owes is DISCLOSURE, and it pays it in full: the
        # findings by sha and ordinal, and the paste-ready discharge lines the
        # shared predicate already computed. An obligation cannot be gated —
        # an absence generates no event to hook — so the remedy is to make the
        # missing thing observable, which is exactly what the false `done` this
        # state replaces was preventing.
        # THE CARRIED SET IS PASSED, and it is not optional (PR #409 round 1).
        # Dropping it makes part 1 of the predicate read a segment that CARRIED
        # FORWARD onto this head as an EARLIER one, so this printed list would
        # be computed over a different segment partition from the state that
        # produced it — a disclosure disagreeing with its own verdict, which is
        # the one thing this branch exists to end. It cannot diverge today only
        # because a carried segment holding a justified `blocking open` is
        # caught by `author-owes` upstream; an argument masked by an invariant
        # elsewhere is still the wrong argument.
        #
        # Computed through the SHARED carry-forward unit rather than re-derived,
        # exactly as `decide()` computes it — two call sites of one unit is the
        # sanctioned shape here; two derivations of one answer is not.
        _c_here, _ = carry_forward(bodies, head, _base, _d_at, _m_base)
        _unadj = unadjudicated_blocking(bodies, head, _c_here)
        print(f"  #{n}: reviewed at {head[:7]} with nothing blocking open, but "
              f"the MERGE GATE IS RED — {len(_unadj)} justified `blocking "
              "open` finding(s) at an EARLIER head are adjudicated by nothing "
              "(§4 clause 12). No round is spawned and none is owed: this is "
              "not a code change.")
        for _sha, _ordinal, _finding, _suggestion in _unadj:
            print(f"       {_sha[:7]} finding {_ordinal}: {_finding[0]} "
                  f"{_finding[1]}")
            print(f"         discharge with: {_suggestion}")
        print("       Post the line(s) above in a review comment at this head. "
              "Costs no round (kogaki#190 counts cycles by head).")
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
        # THE SPENT-BOUND ARM MOVED OUT OF THIS BRANCH (kogaki#338). It used to
        # live here as `if used >= MAX_ROUNDS:` and print PARKED. `decide()` now
        # returns `supersede` for that state, so reaching it from `author-owes`
        # is impossible by construction rather than by this branch's vigilance —
        # which is the point: the old shape made every future reader of this
        # branch re-derive that a fix must not be spawned past the cap.
        if mode == 'spawn':
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
                           tag=f"fix-{n}", grant_class="fix")
            # NOTHING WAS SPAWNED, so nothing is charged and nothing failed
            # (kogaki#204). The sentinel is recognised rather than folded into
            # `result != 0`, which would post a stall comment blaming a fix
            # session that never started.
            if result == SPAWN_IN_FLIGHT:
                continue
            if result == GRANT_REFUSED:
                # A class refusal on the fix path is a CALLER defect (the fix
                # class has no grant rule), reported in its own count rather
                # than dressed as a failed session.
                counts['refused-no-grant'] = counts.get('refused-no-grant', 0) + 1
                continue
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
            # THE SIBLING CALL SITE (PR #231 review round 1, should). kogaki#227
            # fixed the REVIEW branch's dry-run guard and left the FIX branch's
            # unconditioned, so §4 clause 4's "the two paths cannot disagree by
            # construction" was true of one path and false of the other — the
            # #227 specimen exactly, one call site over. That is the shape
            # `spawn()`'s own comment names: a per-call-site guard leaves call
            # site N+1 uncovered by default. Fixing one and leaving its sibling
            # is how the class survives its own repair.
            _fix_state = round_state(fix_log_path(n, used))
            if _fix_state in BLOCKS_A_SPAWN:
                try:
                    _fage = int(time.time() - os.path.getmtime(fix_log_path(n, used)))
                except OSError:
                    _fage = -1
                print(f"  #{n}: would NOT spawn FIX for round {used} — "
                      f"{decline_line(_fix_state, fix_log_path(n, used), _fage, INFLIGHT_TTL)} "
                      f"--spawn would refuse here too.")
                continue
            print(f"  #{n}: would spawn FIX for round {used}'s findings "
                  f"[model {FIX_MODEL}, max-turns {MAX_TURNS}, "
                  f"{len(FIX_TOOLS.split(','))} granted tools, worktree "
                  f"{os.path.join(WORKTREE_ROOT, f'kogaki-fix-{n}-XXXX', 'tree')} "
                  f"on branch {head_ref or '(unknown)'}] -> "
                  f"{fix_log_path(n, used)} (--dry-run; pass --spawn to act)")
    elif state == 'supersede':
        # THE LANE'S ORDINARY CONTINUATION (kogaki#338, §4 clause 3). Rounds
        # spent and blocking still open: the fix cannot land here, so it is
        # born as the SUCCESSOR. The driver makes the GitHub mutation itself —
        # the owner selected the lane's own driver over the fixer for it, on
        # the convention every other lane act here follows: subagents implement
        # and push, dispatchers mutate the tracker.
        used = rounds_used(bodies)
        print(f"  #{n}: SUPERSEDED — {used}/{MAX_ROUNDS} rounds spent with "
              f"blocking findings still open at {head[:7]}. §4 clause 3: the "
              "fixes are born as the successor change; this PR closes as "
              "superseded. Not an owner decision and not a third round.")
        # The open blocking findings the successor owes a disposition for
        # (§4 clause 8's supersession grammar).
        #
        # THE CARRY-FORWARD IS RESOLVED HERE TOO, and the first draft of this
        # block is exactly why the sentence is worth writing (PR #341 review
        # round 1, should). It read `head_segments(segments(bodies), head)` —
        # the same call `decide()` makes, minus its third argument — so on a
        # head reviewed only BY CARRY-FORWARD (a base that moved with a
        # byte-identical diff) `decide()` returned `supersede` off the carried
        # segment while this list came back EMPTY. The PR would have been told
        # "superseded-by-lane: 2/2 rounds spent with 0 blocking finding(s)
        # still open", followed by "disposes of each finding above" naming
        # none — clause 8's evaporation reached through the record rather than
        # through forgetting.
        #
        # The comment on the first draft called a second derivation "the
        # two-call-sites defect again" and then was one. Repaired by resolving
        # through the same unit rather than by copying `decide()`'s argument
        # list: the readers are already in hand at this call site.
        _carried_here = []
        if _d_at and _m_base:
            _carried_here, _ = carry_forward(bodies, head, _base, _d_at,
                                             _m_base, segments)
        _carry = [d for s in head_segments(segments(bodies), head, _carried_here)
                  for sev, st, just, d in s['findings']
                  if sev == 'blocking' and st == 'open' and just]
        for _f in _carry:
            print(f"      owes disposition: {_f}")
        _body = (f"superseded-by-lane: {used}/{MAX_ROUNDS} rounds spent with "
                 f"{len(_carry)} blocking finding(s) still open at {head[:7]}. "
                 "§4 clause 3 (kogaki#338): the fixes are born as the successor "
                 "change rather than pushed here, because no round remains that "
                 "could read them. The successor declares `supersedes: "
                 f"#{n}` and disposes of each finding above under clause 8's "
                 "`carried:`/`declined:` grammar. This is the lane's ordinary "
                 "continuation, not a park and not an owner decision.")
        if mode == 'spawn':
            # DRY RUN MUTATES NOTHING — the same guard both park posts carry,
            # and the reason it is repeated rather than hoisted is that every
            # per-call-site guard in this file has been the site of the defect
            # at least once. An outward act is gated where it is performed.
            r = subprocess.run(["gh", "pr", "comment", str(n), "--body", _body],
                               check=False)
            if r.returncode != 0:
                print(f"  #{n}: FAIL supersession notice exited {r.returncode} "
                      "— the state stands but its record did not reach the PR; "
                      "posting it by hand is owed.")
                spawn_failures += 1
        else:
            print(f"  #{n}: would post supersession notice (--dry-run): {_body}")
        # NO COUNT KEY OF ITS OWN (PR #341 review round 1, nit). `supersede` is
        # already tallied for every PR at the `counts[state...]` line above, so
        # incrementing `superseded` here printed one PR under two spellings of
        # one state. The `park` branch below adds none either; the old
        # spent-bound arm's `counts['park']` was a deliberate RE-CLASSIFICATION
        # of an `author-owes`, which a state of its own no longer needs.
    elif state == 'park':
        print(f"  #{n}: PARKED — {MAX_ROUNDS} rounds spent and {head[:7]} is "
              "still unreviewed. §4 clause 3: this is an owner decision, "
              "never a third round.")
        # Same dry-run guard as the branch above (kogaki#76) — both posts were
        # unconditioned, so a dry run mutated two PR surfaces, not one.
        #
        # THE CLASS IS SELECTED, NEVER ASSERTED (kogaki#190, PR #208 review
        # round 1). It read `unreviewed-head (a push landed after the final
        # round)` unconditionally, which was true while every counted round
        # came from a report that had landed. Once an UNREAD spawn can spend a
        # round, a park is reachable with no push at all — and the stub would
        # have told the owner a cause that did not occur, in the one artifact
        # they read to decide what to do. That is the shape this file names
        # three times in its own comments: the outcome right, the disclosure
        # wrong. The three classes are the three compositions of the count.
        _stub = (f"park-postmortem: {MAX_ROUNDS} rounds spent and {head[:7]} "
                 f"is still unreviewed — {park_class(bodies)}. A park is a pipeline "
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
            result = spawn(f"/review-lane {n}" + POSTING + COMPOSITION, log_path,
                           model=r_model, tools=REVIEW_TOOLS,
                           ref=head, detach=True, tag=f"review-{n}",
                           max_turns=r_turns, grant_class="reviewer", pr=n)
            # NOTHING WAS SPAWNED (kogaki#204). Short-circuit BEFORE the
            # artifact question below: `report_present()` would report the
            # in-flight round's absent artifact as `landed is False` and route
            # a live round into the FAIL path, posting a stall comment about a
            # session that is still running. The sentinel is not folded into
            # `result != 0` for exactly that reason.
            if result == SPAWN_IN_FLIGHT:
                continue
            # A REFUSED SPAWN IS ITS OWN REPORTED STATE (AC5, §4 clause 4):
            # not a stall (no session started, so no stall comment blames
            # one), not a spawn failure (nothing was charged), and never
            # retried — the refusal already printed the grant instruction and
            # logged itself beside the store.
            if result == GRANT_REFUSED:
                counts['refused-no-grant'] = counts.get('refused-no-grant', 0) + 1
                continue
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
                # AND IT IS WRITTEN WHERE THE BUDGET LOOKS (kogaki#190). This
                # arm was the unbudgeted member of its own dispatch family:
                # `spawn-failed` posts a stall comment, `report-degraded` posts
                # one and the report is already in `bodies` — and this one
                # incremented a display tally and returned. `counts` is created
                # fresh each run and read once, to print the closing line, so
                # the fact died with the process and the round was FREE. An
                # unbounded number of these could repeat against a cap that
                # never moved.
                denials = denied_tools(log_path)
                if denials:
                    print(f"  #{n}: denied tools: {', '.join(denials)}")
                if post_unverified_round(n, head, log_path, denials):
                    print(f"  #{n}: recorded the round as spent-but-unverified "
                          "on the PR (not in report form — it must never "
                          "satisfy the presence token)")
                else:
                    # THE FAILURE TO RECORD IS A FAILURE, not a footnote. The
                    # round is unrepresentable exactly when this post does not
                    # land, which is the state the arm existed in before — so
                    # it is reported and reflected in the exit code rather than
                    # left to the summary's tally.
                    print(f"  #{n}: FAIL could NOT record the unverified round "
                          "on the PR — the round stays FREE to the budget and "
                          "the fact survives only in the route log. Post "
                          f"`review-round-unverified: {head}` by hand.")
                    spawn_failures += 1
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
            # THE PREDICTION CONSULTS THE GATE IT PREDICTS (§4 clause 4 v2,
            # kogaki#227). A dry run said `would spawn` while the immediately
            # following --spawn refused on the in-flight guard, so the
            # prediction was not the act's precondition — a different question
            # wearing the answer's clothes. An operator who trusted it fired a
            # no-op and read the refusal as a new failure. Evaluating the same
            # predicate is what makes the two paths unable to disagree.
            _dry_state = round_state(spawn_log_path(n, rnd))
            if _dry_state in BLOCKS_A_SPAWN:
                try:
                    _age = int(time.time() - os.path.getmtime(spawn_log_path(n, rnd)))
                except OSError:
                    _age = -1
                print(f"  #{n}: would NOT spawn review round {rnd} — "
                      f"{decline_line(_dry_state, spawn_log_path(n, rnd), _age, INFLIGHT_TTL)} "
                      f"--spawn would refuse here too.")
                continue
            # THE SAME PREDICATE, WITHOUT ITS SIDE EFFECT (AC7; kogaki#227's
            # rule where the predicate consumes). grant_lookup() is exactly
            # what --spawn consults; the dry run reports its state and leaves
            # the grant open — a prediction that consumed the grant it
            # predicted on would make the preview the act.
            _dgs, _dgp, _dgr = grant_lookup(n)
            if _dgs == "open":
                print(f"  #{n}: grant check (--dry-run, non-consuming): an "
                      f"open owner grant exists (round "
                      f"{_dgr.get('round')}) — --spawn would consume it")
            else:
                print(f"  #{n}: would NOT spawn — " + grant_refusal_text(n, _dgs)
                      .split("\n")[0] + " --spawn would refuse here too.")
                continue
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
