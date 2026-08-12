#!/usr/bin/env bash
# Review-report presence at the merge layer (specs/SPEC.md §4 PR-gate clause,
# kogaki#34; story 1.12, licensed by kogaki#36).
#
# WHAT THIS ENFORCES, AND WHAT IT ONLY STATES. The distinction is the point of
# the check, not a caveat on it.
#
#   ENFORCED — a review-lane report EXISTS for this PR's CURRENT head, AND no
#   finding in it is declared blocking and still open. Both are computable
#   facts about the PR. The property is CONVERGED OR ESCALATED rather than
#   reviewed-once (kogaki#34): a report that lands findings and is never
#   answered leaves the PR reviewed and unimproved.
#
#   STATED, NEVER ENFORCED — that the report's author did not author the work
#   under review. Session identity appears in neither git nor GitHub metadata:
#   measured on PR #43, the PR author, every commit author and the comment
#   author are one login. So the isolation half is an OBLIGATION carried by
#   `.claude/skills/review-lane/SKILL.md`, and a rule whose only carrier is a
#   document someone must read is ADVICE — labelling it as advice is more
#   honest than believing it is in force
#   (`a-rule-reproduces-only-through-a-default-carrier`, surveyed via the
#   consultation map's entry-1 read prescription before this file was written).
#
# IT READS THE DECLARED SEVERITY FIELD AND NEVER THE PROSE. Whether a finding
# IS blocking is the reviewer's judgment, recorded by the reviewer in a typed
# record; whether the PR CONTAINS an open blocking one is a fact over that
# record. That is the two-layer split's own test rather than an exception to
# it — "whether a work item LICENSES a check is a judgment … whether a PR
# CONTAINS an unlicensed check is a computable fact carried at the merge
# layer" (topics/knowledge-architecture.md:36@ed47fbd). A check that read the
# findings' PROSE to decide their severity would be the
# judgment-in-the-mechanical-half defect; this one cannot, because the field
# is all it parses.
#
# AND THE NO-OPEN-BLOCKING HALF IS CARRIER-LESS, MARKED RATHER THAN OMITTED.
# An EMPTY findings record satisfies it, and nothing here distinguishes a
# thorough review that found nothing from one that looked at nothing: the
# check rests on the reviewer's self-report about its own process, where a
# rationale is an attestation rather than evidence. Carrier-less by omission
# is the defect; carrier-less with a reopen trigger is admissible
# (topics/knowledge-architecture.md:52@ed47fbd). Reopen trigger: one PR that
# passed this gate with an empty findings record and later needed correction.
#
# THE HEAD SHA IS PART OF PRESENCE, not decoration. A report written against
# an earlier push reviewed different code, so it is recorded as STALE rather
# than counted — `proposals-carry-the-state-they-were-computed-against` applied
# to the reviewing act.
#
# BUT THE SHA IS THE INSTRUMENT AND THE CONTENT IS THE SUBJECT (§4 clause 7,
# kogaki#96). A report naming head A CARRIES FORWARD to head B when the PR's
# diff against its base at B is byte-identical to the diff that report reviewed
# at A. The occasion is the pipeline's own mandated post-squash rebase, which
# necessarily produces a new head while changing no reviewed content: observed
# on PR #89, whose only exit was an owner `--admin` merge. A carry-forward is
# NOT a round and consumes none of clause 3's bound.
#
#   THE EQUALITY IS RECOMPUTED AND RECORDED, NEVER ASSUMED. The check computes
#   both diffs at gate time and writes the pair it compared — each `base..head`
#   range and its digest — into its own output, so a later reader re-runs the
#   comparison instead of trusting it. A carry-forward that left no record
#   would be the silent re-derivation clause 7 forbids at its pin.
#
#   THE BASE OF A IS READ, NEVER DERIVED, whenever the report recorded one:
#   `report-base-resolution` was filled to (c) on 2026-08-06 (kogaki#96), so
#   `review-base:` is the base of A. It is the one resolution that survives a
#   rewritten history, and the only one under which a base MOVE is visible at
#   all — (a), the PR's current base, takes both diffs against one base and so
#   cannot tell "the base moved" from "the content changed".
#
#   THE FALLBACK IS TRANSITIONAL AND FAILS TOWARD THE REVIEWED SIDE. A report
#   written before the field ships carries no base; those fall back to (b), the
#   merge-base at A, and NEVER to (a). Where that derived base is not the one
#   reviewed the diffs differ and the result is `stale`, which is the safe
#   outcome. It is keyed on the line's absence alone — no flag, no
#   configuration — and expires with the last base-less live report.
#
#   AND AN UNCOMPUTABLE EQUALITY IS `stale`, NEVER A CARRY-FORWARD. An
#   unresolvable base or an unreadable revision fails toward the reviewed side,
#   the same choice head-unknown already makes below.
#
# A REPORT DECLARES ITS SCOPE, ITS BASE AND ITS COMPLETENESS (§4 clauses 5, 6
# and 7; kogaki#70, kogaki#74, kogaki#96), on adjacent lines beside the report
# token:
#
#   review-lane report: <head sha>
#   review-base: <base sha>             — absent means NO RECORDED BASE
#   review-scope: full | delta          — absent is read as `full`
#   finding: ...
#   cannot-determine: <dimension> — <why>   — REPORTED, never gated
#   report-complete: <N> findings       — absent is read as complete
#
# A REFUSED CAPABILITY DEGRADES A DIMENSION, IT DOES NOT DELETE A REPORT (§4's
# third conduct clause, kogaki#100). `cannot-determine:` is where a reviewer
# blocked by a refused command puts the blocked dimension INSTEAD OF RETRYING —
# on PR #98 a spawn spent its last four turns rephrasing one refused command and
# posted no report at all. The line is REPORTED AND NEVER GATED, on the same
# side of the two-layer split as `review-scope:`: whether a blocked dimension
# should have been obtained is the lane's judgment, which is where clause 5
# already puts scope honesty. Concretely it is NOT a finding, it does NOT count
# toward `report-complete:` equality, and it never blocks — a line whose whole
# purpose is to record an absence cannot also be a reason to fail.
#
# Only ONE of them is enforced here, and the asymmetry is the two-layer split
# rather than an inconsistency. COMPLETENESS is two mechanical facts — the
# token's presence and count equality — so a segment counts only when N equals
# its own finding lines, and a fragment turns nothing green. SCOPE is REPORTED
# and never gated, because whether a declared `delta` was the honest one is
# judgment; clause 5 says so itself and marks itself carrier-less with a named
# reopen trigger. Both absences default toward this repository's history: every
# report already posted was whole and full, and voiding them would empty this
# gate rather than tighten it.
#
# FINDINGS BIND TO THEIR REPORT SEGMENT (PR #44 review, round 1). An
# unsegmented union of all comments let a round-1 `blocking open` deadlock
# every later round: clearing it would have required editing the round-1
# comment, which §4 clause 4 (every round leaves its record) forbids in
# spirit. Only findings under a report naming the CURRENT head gate; a stale
# segment's findings are that round's record, not this head's state — a new
# round supersedes by writing a new report, never by mutating an old one.
#
# THREE-VALUED, AND THE THIRD VALUE IS EARNED BY EVIDENCE. Exactly one state
# is CANNOT-DETERMINE: a lookup that SUCCEEDED and established there is no pull
# request. `gh` missing, a failed call, or a PR whose head will not resolve are
# all COULD NOT ESTABLISH and FAIL — because a gate that exits 0 whenever its
# own instrument is unavailable disappears silently in exactly the condition
# where it matters, and "I could not look" is not evidence that there was
# nothing to see. An earlier draft of this file collapsed those into
# cannot-determine, which reported "no pull request for this branch" on an auth
# expiry — the defect its own header refuses, one level down (PR #44 review).
# CANNOT-DETERMINE is still rendered separately from FAIL so a genuinely
# absent PR is never spent as a positive finding
# (`establish-the-substrate-before-reporting`).
#
# Tier is `ci` rather than `pre-push`: the substrate is a pull request, which
# does not exist at push time, and a check's position in the loop is a cost
# decision (`a-checks-runtime-multiplies-by-its-loop-position`).
set -euo pipefail
cd "$(dirname "$0")/.."

PR_NUMBER="${REVIEW_PR_NUMBER:-}"
HEAD_SHA="${REVIEW_HEAD_SHA:-}"
# The PR's CURRENT base (§4 clause 7). Unlike the head it is NOT part of
# presence: it is the input to the carry-forward alone, so an unresolvable base
# disables the carry-forward and leaves the existing `stale` outcome, and it
# must never reach the substrate-unestablished branch below. Failing toward the
# reviewed side is the whole design of the second instrument.
BASE_SHA="${REVIEW_BASE_SHA:-}"
COMMENTS="${REVIEW_PR_COMMENTS:-}"   # pre-trusted bodies (test injection route)
COMMENTS_JSON=""                      # authored comments, filtered before parse
TRUSTED_OWNER="${REVIEW_TRUSTED_OWNER:-}"

# THE THIRD VALUE IS EARNED BY EVIDENCE, not reached by falling through.
# CANNOT-DETERMINE is for one state only: a lookup that SUCCEEDED and
# established there is no pull request. Everything else — the tool missing, a
# call that failed, a PR whose head could not be resolved — is COULD NOT
# ESTABLISH and fails. A gate that exits 0 whenever its own instrument is
# unavailable disappears silently in exactly the condition where it matters,
# and an unfounded "no pull request" is the very defect this file's header
# refuses one level down: refusing to report absence without looking, then
# reporting why it could not look without establishing that either.
substrate="ok"      # ok | no-pr | unestablished
substrate_note=""

if [ -z "$PR_NUMBER" ]; then
  if ! command -v gh >/dev/null 2>&1; then
    substrate="unestablished"; substrate_note="gh is not available"
  else
    # `gh pr list`, not `gh pr view`: view EXITS NON-ZERO when the branch has
    # no pull request, which is indistinguishable from an auth or network
    # failure, so the cannot-determine state was unreachable and every pre-PR
    # branch failed. `list` exits 0 and returns an empty array — a lookup that
    # SUCCEEDED and established absence, which is the evidence the third value
    # is supposed to be earned by. Found by exercising the path rather than
    # reading it (PR #44 review, second round).
    _branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo HEAD)"
    if _found="$(gh pr list --head "$_branch" --state open \
                 --json number -q '.[0].number' 2>/dev/null)"; then
      PR_NUMBER="$_found"
      [ -z "$PR_NUMBER" ] && { substrate="no-pr"
        substrate_note="the lookup succeeded and found no open pull request
 for branch $_branch"; }
    else
      PR_NUMBER=""
      substrate="unestablished"
      substrate_note="the gh lookup FAILED (auth, network or API) — this is not
 evidence that no pull request exists"
    fi
  fi
fi

# The head is resolved INDEPENDENTLY of whether comments were supplied. Tying
# it to the comments fetch made it optional exactly when it could not be
# checked, and the fallback was the permissive value (PR #44 review).
if [ "$substrate" = "ok" ] && [ -n "$PR_NUMBER" ]; then
  if [ -z "$HEAD_SHA" ]; then
    if command -v gh >/dev/null 2>&1 &&
       HEAD_SHA="$(gh pr view "$PR_NUMBER" --json headRefOid \
                   -q .headRefOid 2>/dev/null)"; then
      :
    else
      HEAD_SHA=""
    fi
  fi
  if [ -z "$BASE_SHA" ] && command -v gh >/dev/null 2>&1; then
    BASE_SHA="$(gh pr view "$PR_NUMBER" --json baseRefOid \
                -q .baseRefOid 2>/dev/null || true)"
  fi
  # Comments are fetched WITH their authors, and only trusted authors'
  # comments carry reports or findings (kogaki#56): on a public repository
  # anyone can comment, so an author-blind parse lets a fork-PR author spoof
  # presence with a hand-written report token — or hold a PR hostage with a
  # foreign `blocking open` line. Trusted = the repository owner plus
  # pipeline.json's merge_author_allowlist — the merge-eligibility rule's
  # SOURCES, copied as sources rather than as a login (the PR #46 lesson).
  if [ -z "$COMMENTS_JSON" ] && command -v gh >/dev/null 2>&1; then
    COMMENTS_JSON="$(gh pr view "$PR_NUMBER" --json comments 2>/dev/null || true)"
  fi
  if [ -n "$COMMENTS_JSON" ] || [ -n "$COMMENTS" ]; then
    if [ -z "$TRUSTED_OWNER" ] && command -v gh >/dev/null 2>&1; then
      TRUSTED_OWNER="$(gh repo view --json owner -q .owner.login 2>/dev/null || true)"
    fi
    if [ -n "$COMMENTS_JSON" ] && [ -z "$TRUSTED_OWNER" ]; then
      substrate="unestablished"
      substrate_note="comments exist but the repository owner could not be
 resolved, and report trust is computed against it (kogaki#56)"
    fi
  fi
  if [ -z "$HEAD_SHA" ]; then
    substrate="unestablished"
    substrate_note="PR #$PR_NUMBER exists but its head sha could not be
 resolved; the head is part of presence, so an unknown head is not a pass"
  fi
fi

# §4 clause 11 (kogaki#357): a successor's obligations are declared by its
# AUTHOR, so they are read from the DECLARATION TEXT — the PR body plus the
# branch's commit messages — and never from the review record, which is the
# reviewer's artifact. Both sources are gathered here so the reader below stays
# seam-free; either may be empty and the reader says cannot-determine.
DECL_TEXT=""
if [ "$substrate" = "ok" ] && [ -n "$PR_NUMBER" ] && command -v gh >/dev/null 2>&1; then
  DECL_TEXT="$(gh pr view "$PR_NUMBER" --json body -q .body 2>/dev/null || true)"
fi
if [ -n "$BASE_SHA" ]; then
  DECL_TEXT="$DECL_TEXT
$(git log "$BASE_SHA..HEAD" --format=%B 2>/dev/null || true)"
fi

REVIEW_PR="$PR_NUMBER" REVIEW_HEAD="$HEAD_SHA" REVIEW_BODIES="$COMMENTS" \
REVIEW_BASE="$BASE_SHA" REVIEW_DECL="$DECL_TEXT" \
REVIEW_COMMENTS_JSON="$COMMENTS_JSON" REVIEW_OWNER="$TRUSTED_OWNER" \
REVIEW_NOTE="$substrate_note" REVIEW_SUBSTRATE="$substrate" python3 <<'EOF'
import hashlib, json, os, re, subprocess, sys

# THE HEAD-RESOLUTION UNIT IS LOADED, NEVER RESTATED (§4 clause 7 v2,
# kogaki#308). `same_head`, `head_segments`, `digest` and `carry_forward` used
# to live here; `tools/review-sweep.sh` answered the same question with a
# different unit, and the disagreement cost a review round per moved head. The
# reach is the four-line recipe the unit documents, identical in both
# consumers; the agreement fixture below is what keeps it that way.
HEAD_RESOLUTION_PATH = "lib/head_resolution.py"
with open(HEAD_RESOLUTION_PATH, encoding="utf-8") as _fh:
    exec(compile(_fh.read(), HEAD_RESOLUTION_PATH, "exec"))

# CLAUSE 8'S DISPOSITION GRAMMAR IS LOADED, NEVER RESTATED (§4 clause 11,
# kogaki#306). Clause 11 LENDS this file clause 8's `carried:`/`declined:`
# vocabulary for a successor's inherited findings, and says so in those words —
# a second vocabulary for "what happened to a finding" is a synonym in a join
# key. Until kogaki#357 the grammar lived only in `tools/review-sweep.sh`; the
# module is the same third-carrier move `lib/head_resolution.py` makes, for the
# same two consumers.
DISPOSITION_PATH = "lib/disposition.py"
with open(DISPOSITION_PATH, encoding="utf-8") as _fh:
    exec(compile(_fh.read(), DISPOSITION_PATH, "exec"))

# A report's first line, fixed token and fixed position — the same discipline
# the consult receipt carries, and for the same reason: a report announced in
# whatever phrasing the sitting reaches for is invisible to anything looking
# for one.
REPORT = re.compile(r'^\s*review-lane report:\s*([0-9a-f]{7,40})\s*$',
                    re.MULTILINE)
# The typed findings record (kogaki#34 clause 1). One line per finding, a
# DECLARED severity field — the merge layer reads this field and never the
# prose beside it. `blocking` is the only severity that gates; `open` is the
# only state that counts. Whether a finding IS blocking is the reviewer's
# judgment; whether the PR CONTAINS an open blocking one is a fact.
#
# BLOCKING IS A BUDGET, NOT A SEVERITY FEELING (kogaki#72, owner ruling
# 2026-08-06). AutoReview is a policy check and a critical-issue filter, not a
# perfection machine: single-pass merge is the norm and a park is a measured
# pipeline defect. The mechanical half of that ruling lives here: a `blocking`
# finding gates ONLY when it carries its one-line justification —
# `[policy: <pin>]` or `[harm: <one line>]` — and an unjustified blocking
# FAILS TOWARD MERGE: it is counted as `should` and the downgrade is reported
# by name. Whether the justification is ADEQUATE stays the review lane's
# judgment; whether it is PRESENT is the fact read here. The reviewer that
# believes something is critical pays one line to say why.
FINDING = re.compile(
    r'^\s*finding:\s*(blocking|should|nit)\s+(open|resolved)\b'
    r'(?P<just>\s*\[(?:policy|harm):[^\]]+\])?', re.MULTILINE)
# THE ADJUDICATION LINE (specs/SPEC.md §4 clause 12; kogaki#269). A finding
# that revises an EARLIER head's severity names which finding it revises:
# `adjudicates: <earlier head sha> finding <N>`, where N is the 1-based
# ordinal of that finding WITHIN the segment the sha names. Before this line
# existed the gate's only unit of identity was the head sha, so a head move —
# for any reason, touching the finding or not — discarded every earlier
# segment's severity, and a `blocking` re-declared `should` at the new head
# turned the gate green with nothing fixed. PR #255 is the specimen.
#
# IT IS PARSED INTO ITS OWN LIST, for the three properties `cannot:` and
# `boundary:` get by construction rather than by a rule someone must remember:
# not a finding, no effect on clause 6's count equality, and never a gate in
# its own right. What gates is its ABSENCE, and only under the five-part
# predicate `unadjudicated_blocking()` carries.
#
# EVERY line is kept, unlike the single-valued declarations below: one segment
# may adjudicate several earlier findings, and a first-wins rule here would
# silently drop the second and third — which is the shape of the defect this
# clause exists to end, one layer over.
#
# GROUNDS ARE REQUIRED AND NON-EMPTY, and the pattern is where that is
# enforced: clause 12's grammar is `adjudicates: <sha> finding <N>  <grounds>`
# and the clause states "grounds required and non-empty, with no branch on the
# superseding severity; a malformed line declares nothing and the gate stays
# red". A groundless line is therefore not a weaker declaration — it is NO
# declaration, so the earlier blocking stays unadjudicated and the gate stays
# red, which is the safe direction and the one the clause names.
#
# WHY THE REQUIREMENT LIVES IN THE PATTERN rather than in a check after it: the
# first form of this block stopped at the ordinal, and the consequences ran
# past a missing validation into a taught one. `unadjudicated_blocking()`
# PRINTED the groundless form as its paste-ready remedy, all 18 fixture rows
# wrote it and expected it to clear, and the round-trip assertion made "pasting
# the gate's own groundless suggestion clears the gate" a fixture-ENFORCED
# property. The gate would have taught the malformed form to every reviewer who
# read its output. Clause 12 exists so that a revision carries WHY; a grammar
# that gates the identity and discards the reason keeps the machinery and loses
# the point of it.
ADJUDICATES = re.compile(
    r'^\s*adjudicates:\s*([0-9a-f]{7,40})\s+finding\s+([0-9]+)\s+(\S.*?)\s*$',
    re.MULTILINE)
# THE REPORT DECLARES ITS SCOPE AND ITS COMPLETENESS (specs/SPEC.md §4 clauses
# 5 and 6; kogaki#70, kogaki#74). One grammar over one segmenter, read in the
# same single pass as the findings — two sequential passes over this parser is
# how the use-vs-mention defect (kogaki#41) was introduced the first time.
#
# THEY ARE ADJACENT LINES AND THE REPORT TOKEN IS UNTOUCHED. The alternative —
# widening the report line to `review-lane report: <sha> delta` — was EXERCISED
# rather than reasoned about (story 1.17's named closing act, run through
# tools/review-sweep.sh's embedded fixture pass): with the token's regex not
# widened in lockstep, a declared report segmented to NOTHING and read as
# absent. That regex lives in two files and four uses, so the adjacent form is
# the one whose failure mode does not exist. Each line is anchored WHOLE, so a
# finding's prose mentioning `report-complete:` is a mention, never a
# declaration.
#
# SCOPE IS READ AND REPORTED, NEVER GATED — clause 5 is deliberately
# carrier-less: whether a declared `delta` was the honest one is judgment, and
# the clause says in as many words that it "adds no computable obligation to
# the merge layer".
#
# COMPLETENESS IS GATED, because both of its halves are mechanical — token
# presence and count equality, computable facts over a declared record, which
# is the split's own test. A segment counts ONLY when the count it declares
# equals its own finding lines; a fragment turns nothing green. The specimen is
# a merge that should not have happened (PR #71: a split report's first part
# landed, the re-check fired, auto-merge completed, and the complete report
# carrying a new open blocking finding arrived on an already-merged PR).
#
# AND BOTH DEFAULTS FAIL TOWARD THE HISTORY. An absent scope reads `full`; an
# absent `report-complete:` reads complete. Every report already in this
# repository was posted whole and reviewed fully, so a default that
# retroactively narrowed or voided them would empty this gate rather than
# tighten it. The tokens bind reports written after they ship.
SCOPE = re.compile(r'^\s*review-scope:\s*(full|delta)\s*$', re.MULTILINE)
COMPLETE = re.compile(r'^\s*report-complete:\s*(\d+)\s+findings?\s*$',
                      re.MULTILINE)
# THE BASE THE REPORT ACTUALLY DIFFED AGAINST (§4 clause 7, kogaki#96 — the
# `report-base-resolution` slot filled to (c)). A third declaration on the
# established adjacent-line pattern: anchored WHOLE, taking the same 7–40 hex
# sha the report token takes, read in the SAME single pass over the SAME
# segmenter, first declaration wins. The report token is NOT widened — that
# form was exercised and failed in story 1.17, and its regex lives in this file
# and tools/review-sweep.sh, both of which an adjacent line leaves untouched.
# A `review-base:` inside a finding's prose is a MENTION, never a declaration.
BASE = re.compile(r'^\s*review-base:\s*([0-9a-f]{7,40})\s*$', re.MULTILINE)
# THE BLOCKED DIMENSION (§4's third conduct clause, kogaki#100). A fourth
# adjacent declaration on the established pattern, anchored WHOLE, read in the
# same pass. Its payload is taken WHOLE and is deliberately unvalidated beyond
# being non-empty: the line is REPORTED and never gated, so refusing a shape
# would be gating the one declaration whose entire job is to record that
# something could not be obtained. The `<dimension> — <why>` split is rendered
# when the separator is there and the raw payload is shown when it is not.
CANNOT = re.compile(r'^\s*cannot-determine:\s*(\S.*?)\s*$', re.MULTILINE)
# THE BOUNDARY-VS-RECEIPT RECORD (kogaki#258). A fifth adjacent declaration on
# the established pattern, anchored WHOLE, read in the same pass. Dimension 2 of
# `.claude/skills/review-lane/SKILL.md` has always prescribed three facts per
# TOUCHED consultation-map entry — the entry, what in the diff touched it, and
# whether a receipt covers it — and declared no shape for them, so the one
# per-boundary touched-and-uncovered judgment in this repository was prose a
# human read once. An obligation cannot be gated and needs its ABSENCE MADE
# VISIBLE (`carry-a-rule-at-its-violation-layer`), which is what a token whose
# absence is greppable buys and free phrasing does not.
#
#   boundary: <entry N> <covered|uncovered|cannot-determine> [receipt: <pin>]  <what touched it>
#   boundary: none  <why no entry was touched>
#
# REPORTED, NEVER GATED, on the same side of the split as `cannot-determine:`
# and for a stronger reason: by kogaki#72 an uncovered boundary is not in the
# blocking budget's three classes, so a deny here would be a registered member
# minting a fourth. It is not a finding, does not count toward
# `report-complete:` equality, and cannot fail this check.
#
# EVERY LINE IS KEPT rather than the first: several boundaries can be touched
# and a first-wins rule would silently drop the second and third — the same
# choice `cannot-determine:` already makes, for the same reason.
#
# `none` IS A DECLARED ZERO AND IS NOT THE SAME FACT AS NO LINE AT ALL. A report
# with no `boundary:` line is UNDECLARED — the state every report already in
# this repository's history is in, and the state story 1.41's AC1a exists to
# report rather than read as "no boundary touched". The distinction is the whole
# value of the token, so it is carried in the grammar and not inferred.
#
# AND A `covered` NAMING NO RECEIPT IS READ AS `cannot-determine`. A coverage
# claim with no pin is not falsifiable; the downgrade fails toward the honest
# side — "I could not establish it" rather than "there is one" — and is reported
# by name, which is kogaki#72's unjustified-`blocking` downgrade one field over.
BOUNDARY = re.compile(
    r'^\s*boundary:\s*(?:(?P<none>none)\s*$'
    r'|(?P<none_why>none)\s+(?P<why>\S.*?)\s*$'
    r'|(?P<entry>\d+)\s+(?P<verdict>covered|uncovered|cannot-determine)\b'
    r'(?P<receipt>\s*\[receipt:[^\]]+\])?)', re.MULTILINE)


# ── §4 clause 11 — a successor's DECLARED OBLIGATIONS (kogaki#306, kogaki#357)
#
# Clause 11 sorts a successor's three obligations by the layer each can be
# BROKEN at, and this file carries the two that are OBLIGATIONS — a `supersedes:`
# declaration and a disposition for every finding inherited from the blocked PR.
# Their violation is an ABSENCE, which generates no event to deny, so they are
# discharged by being made VISIBLE here and are REPORTED, NEVER GATED — the same
# polarity `cannot-determine:` and the boundary record already hold, and the same
# polarity clause 8 holds for its own dispositions.
#
# THE THIRD OBLIGATION IS A PROHIBITION AND THIS IS NOT ITS LAYER. A successor
# based on a commit that predates the corrective merge is broken by an ACT, and
# an act is deniable — so clause 11 wants a mechanical gate at the merge
# boundary. That boundary is ACTOR-LEVEL (`~/.claude/hooks/lint-pr-merge.py`,
# registered by `story-sync install-hooks`, both in tim-nish/claude-toolkit) and
# is unreachable from this repository. Clause 11 rules the case under the served
# line's own last clause — the carrier goes at the last boundary you control —
# so what stands here is a CHECK STANDING IN FOR A GATE, and every line it
# prints says so. A green run of this file is not the prohibition being in
# force. `deferred-slot: cross-repo-merge-gate`.
#
#   consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17
#   LESSONS.md:103 — "A rule is enforced only at the layer where it can be
#   broken … an obligation cannot be gated at all and needs its absence made
#   visible … and when that layer belongs to another system, the carrier goes at
#   the last boundary you control, with any gate upstream of it counting as
#   ergonomics rather than control."
SUPERSEDES = re.compile(r'^\s*supersedes:\s*#(\d+)\s*$', re.M)
# GitHub's own close vocabulary, which is what actually decides whether a merge
# closes an issue. Read from the successor's declaration text for ONE reason:
# AC2a, below — a `carried:` naming an issue THIS merge closes is a disposition
# that evaporates at the moment it reads as satisfied.
CLOSES = re.compile(
    r'\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)\b', re.I)


def supersedes_of(text):
    """The blocked PR this text declares itself the successor to, or None.

    FIRST declaration wins, on the same a-later-line-never-revises rule every
    other declaration in this file follows. Read from the successor's
    DECLARATION TEXT — its commit messages and PR body — rather than from its
    review record, because the obligation is the author's and the record is the
    reviewer's, and because kogaki#335 (the rule's only real application before
    a carrier existed) put it in both, with the commit-message copy explicitly
    noted as the one a merge-layer reader reaches without the API.
    """
    m = SUPERSEDES.search(text or '')
    return int(m.group(1)) if m else None


def closes_of(text):
    """Every issue number this text's close keywords would close, as a set."""
    return {int(n) for n in CLOSES.findall(text or '')}


def declared_dispositions(text):
    """(good, bad) dispositions in a successor's declaration text.

    `good` is a list of (kind, val); `bad` holds the malformed ones verbatim.
    Malformed is collected rather than dropped for the reason clause 8 already
    gives: absent and malformed are indistinguishable at the boundary otherwise,
    and this repository has shipped that confusion three times.

    UNLIKE clause 8's own parse this does NOT bind to a preceding `finding:`
    line. These are the AUTHOR's dispositions of findings that live on a
    DIFFERENT, closed pull request, so there is no finding line here to bind to
    — the inherited findings are counted from the blocked PR's own record.
    """
    good, bad = [], []
    for line in (text or '').splitlines():
        d = DISPOSITION.match(line)
        if not d:
            continue
        kind, val = d.group('kind'), d.group('val')
        if disposition_ok(kind, val):
            good.append((kind, val))
        else:
            bad.append(f"{kind}: {val}".rstrip(': '))
    return good, bad


def inherited_open(blocked_bodies, blocked_head):
    """Findings left OPEN on the blocked PR's final head, as raw lines.

    Every severity, not only the non-gating ones: the state clause 11 governs is
    reached with OPEN BLOCKING findings on the blocked PR — that is the whole
    trigger — so restricting this to `should`/`nit` would drop exactly the
    findings the successor most owes a disposition for.
    """
    return [line
            for seg in head_segments(segments(blocked_bodies), blocked_head)
            if counted(seg)
            for sev, state, just, line in seg['findings']
            if state == 'open']


def structural_block(blocked_bodies, blocked_head):
    """Did the block make a STRUCTURAL claim? True / False / None.

    True when the blocked head's counted report carries an open BLOCKING
    finding — a diagnosis was made. False when it carries none: the block was
    PROCEDURAL (the bound was spent and the head moved), and a procedural block
    diagnoses nothing. None when no counted report names that head at all, so
    the question cannot be answered here.

    This is AC4a's discriminator and it exists because without it every
    procedural block reports a spurious falsification. kogaki#335 is the
    specimen: its rebased diff came out identical to `d36b15a` under a block
    that was procedural, and a check written to clause 11's sentence alone would
    have fired on it.
    """
    seen = False
    for seg in head_segments(segments(blocked_bodies), blocked_head):
        if not counted(seg):
            continue
        seen = True
        for sev, state, just, line in seg['findings']:
            if sev == 'blocking' and state == 'open':
                return True
    return False if seen else None


def blocked_record_from(comments, allowed):
    """(trusted bodies, spoof-shaped logins) for a superseded PR's comments.

    The PURE half of `_blocked_pr_record`, split out so the trust filter has a
    fixture rather than only a call site. It is `trusted_bodies` (kogaki#56)
    reached by a second consumer, not a second filter: the whole point is that
    the blocked PR's record is filtered by the SAME rule this file already
    applies to its own PR's comments.
    """
    return trusted_bodies(comments, allowed)


def successor_obligations(decl_text, blocked_bodies, blocked_head,
                          bases=None, ancestor=None, diffs=None):
    """Clause 11's obligations for one successor. Returns a list of rows
    (property, verdict, detail); verdict is 'ok' | 'unmet' | 'cannot-determine'.

    Every input that would touch the world is INJECTED, so every fixture below
    runs with no seam: `bases` maps a PR number to its base sha, `ancestor(a,b)`
    answers 'is a an ancestor of b' (True/False/None), and `diffs` maps a PR
    number to its diff digest.

    Returns [] when `decl_text` declares no `supersedes:` — a PR that is not a
    successor owes none of this, which is AC7's narrowness and is true by
    construction here rather than by a rule someone must remember.
    """
    blocked = supersedes_of(decl_text)
    if blocked is None:
        return []
    rows = [('supersedes', 'ok', f"declares `supersedes: #{blocked}`")]

    # ── the disposition half, and AC2a's evaporating carrier
    inherited = inherited_open(blocked_bodies, blocked_head)
    good, bad = declared_dispositions(decl_text)
    closing = closes_of(decl_text)
    evaporating = [f"{k}: {v}" for k, v in good
                   if carried_issue(k, v) in closing and carried_issue(k, v)]
    live = len(good) - len(evaporating)
    # The SAME cannot-determine the falsification row below already computes.
    # Keying this row on `blocked_bodies is None` alone read a record that was
    # fetchable but carried no COUNTED segment for that head — a fragment, or a
    # head that moved — as "zero findings inherited", so the obligation came out
    # satisfied because nothing was legible. That inverts this file's own stated
    # polarity one row above its correct twin.
    if blocked_bodies is None or structural_block(blocked_bodies,
                                                  blocked_head) is None:
        rows.append(('disposition', 'cannot-determine',
                     f"no counted report names #{blocked}'s final head, so the "
                     f"count of findings it left open is unknown; "
                     f"{len(good)} disposition(s) are declared here"))
    elif live < len(inherited):
        rows.append(('disposition', 'unmet',
                     f"#{blocked} left {len(inherited)} finding(s) open and "
                     f"{live} live disposition(s) are declared"))
    else:
        rows.append(('disposition', 'ok',
                     f"{live} live disposition(s) for {len(inherited)} "
                     f"inherited open finding(s)"))
    for e in evaporating:
        rows.append(('disposition-evaporates', 'unmet',
                     f"`{e}` names an issue THIS merge closes — the carrier "
                     f"does not outlive the merge, so the finding is "
                     f"undisposed the moment the disposition reads as "
                     f"satisfied (kogaki#335: `carried: #325` while #325 "
                     f"closed on the successor's merge)"))
    for b in bad:
        rows.append(('disposition-malformed', 'unmet',
                     f"`{b}` is not a well-formed disposition (§4 clause 8)"))

    # ── the base half: a CHECK standing in for a gate this repo cannot install
    bases = bases or {}
    b_base, s_base = bases.get(blocked), bases.get('successor')
    if not b_base or not s_base:
        rows.append(('base-advanced', 'cannot-determine',
                     "one of the two base shas did not resolve"))
    elif b_base == s_base:
        # ITS OWN KEY, not a `base-advanced` failure. "the successor branched
        # from the same tip" and "the base went backwards" are different facts
        # and kogaki#306 records only the first, with the reading that matters:
        # such an application DOES NOT EXERCISE the clause. Collapsing them
        # renders one as the other, and the fixture that only read the verdict
        # could not tell them apart — found by mutation, not by reading.
        rows.append(('base-unmoved', 'unmet',
                     f"the successor branched from the same base as #{blocked} "
                     f"({b_base[:7]}) — the base did not move, so this "
                     f"application does not exercise the clause (kogaki#306)"))
    else:
        anc = ancestor(b_base, s_base) if ancestor else None
        if anc is None:
            rows.append(('base-advanced', 'cannot-determine',
                         "ancestry between the two bases was not readable"))
        elif anc:
            rows.append(('base-advanced', 'ok',
                         f"the successor's base {s_base[:7]} strictly descends "
                         f"#{blocked}'s base {b_base[:7]}. THIS DOES NOT "
                         f"ESTABLISH that it contains the corrective merge: "
                         f"nothing in this repository NAMES that commit, so "
                         f"the containment half is cannot-determine by "
                         f"construction and is not asserted here"))
        else:
            rows.append(('base-advanced', 'unmet',
                         f"the successor's base {s_base[:7]} does not descend "
                         f"#{blocked}'s base {b_base[:7]}"))

    # ── the falsification member, narrowed to blocks that made a claim
    diffs = diffs or {}
    b_diff, s_diff = diffs.get(blocked), diffs.get('successor')
    structural = structural_block(blocked_bodies, blocked_head)
    if b_diff is None or s_diff is None:
        rows.append(('falsification', 'cannot-determine',
                     "one of the two diffs was not computable"))
    elif b_diff != s_diff:
        rows.append(('falsification', 'ok',
                     "the successor's diff differs from the blocked PR's"))
    elif structural is None:
        rows.append(('falsification', 'cannot-determine',
                     f"the diffs are identical, but no counted report names "
                     f"#{blocked}'s final head, so whether the block made a "
                     f"structural claim cannot be read"))
    elif not structural:
        rows.append(('falsification', 'ok',
                     f"the diffs are identical AND #{blocked}'s block was "
                     f"PROCEDURAL — it carried no open blocking finding, so it "
                     f"diagnosed nothing and there is no claim to falsify. "
                     f"Reporting one here would be the spurious falsification "
                     f"kogaki#306 recorded against this member"))
    else:
        rows.append(('falsification', 'unmet',
                     f"the successor's rebased diff is UNCHANGED from "
                     f"#{blocked}'s, and that block made a STRUCTURAL claim — "
                     f"the diagnosis that justified it is FALSIFIED. Reported "
                     f"as a finding rather than merged quietly"))
    return rows


def boundary_of(m, line):
    """One parsed `boundary:` line: (entry, verdict, downgraded, raw).

    `entry` is None for the declared zero, whose verdict is the literal
    `none`. `downgraded` records the `covered`-with-no-receipt case, which is
    reported as such rather than silently rewritten.
    """
    if m.group('none') or m.group('none_why'):
        return (None, 'none', False, line.strip())
    verdict, receipt = m.group('verdict'), bool(m.group('receipt'))
    if verdict == 'covered' and not receipt:
        return (m.group('entry'), 'cannot-determine', True, line.strip())
    return (m.group('entry'), verdict, False, line.strip())


def counted(seg):
    """Does this segment COUNT? §4 clause 6 — a fragment counts as nothing.

    An ABSENT token counts as complete; a PRESENT one counts only when its N
    equals the segment's own finding lines.
    """
    return seg['complete'] is None or seg['complete'] == len(seg['findings'])


def scope_of(seg):
    """The segment's declared scope, or `full` when it declared none."""
    return seg['scope'] or 'full'


def segments(bodies):
    """Split the concatenated comment bodies into REPORT SEGMENTS: each
    report line opens a segment holding the finding lines after it, up to
    the next report line. Findings before any report belong to no segment.

    Segmentation is what makes the rally converge (PR #44 review, round 1):
    an unsegmented union let a round-1 `blocking open` deadlock every later
    round — clearing it would have required editing the round-1 comment,
    which §4 clause 4 (every round leaves its record) forbids in spirit. A
    stale segment's findings are that round's RECORD, never this head's
    state; a new round supersedes by writing a new report, not by mutating
    an old one.

    Each segment also carries its DECLARATIONS (§4 clauses 5, 6 and 7 and the
    third conduct clause), read in this same pass: `cannot` (every blocked
    dimension declared, in order — reported, never gated), `scope`
    ('full'|'delta'|None), `complete`
    (the declared N, or None) and `base` (the recorded base sha, or None —
    absent means NO RECORDED BASE, never a default sha, and routes the
    carry-forward to clause 7's transitional fallback). The FIRST declaration
    of each kind wins: a
    later line must never revise an earlier claim about the same segment, so
    a second declaration is IGNORED and the report stays otherwise intact —
    there is no malformed state, and the duplicate invalidates nothing. The
    fixture below pins exactly that ('the FIRST declaration wins; a later
    line cannot revise it' expects `present` with the first values). Said
    plainly because this docstring previously called a second declaration
    "a malformed report", which the code beneath it has never done, and story
    1.26 AC 7 inherited the wrong word from here. Findings written
    AFTER a `report-complete:` line still count as findings, so a report that
    keeps writing past its own terminal token fails count equality; that is
    the fragment case behaving as it should, not a special rule for it."""
    segs = []
    current = None
    for line in (bodies or '').splitlines():
        r = REPORT.match(line)
        if r:
            current = {'sha': r.group(1), 'findings': [], 'cannot': [],
                       'boundaries': [], 'adjudicates': {},
                       'scope': None, 'complete': None, 'base': None}
            segs.append(current)
            continue
        if current is None:
            continue        # a declaration before any report belongs to none
        b = BASE.match(line)
        if b:
            if current['base'] is None:
                current['base'] = b.group(1)
            continue
        cd = CANNOT.match(line)
        if cd:
            # EVERY one is kept, unlike the single-valued declarations above: a
            # review can be blocked on several dimensions, and a first-wins rule
            # here would silently drop the second and third disclosures. It is
            # appended to its OWN list and never to `findings`, which is what
            # makes AC 2's three properties true by construction rather than by
            # a rule someone must remember — not a finding, no effect on count
            # equality, never a gate.
            current['cannot'].append(cd.group(1))
            continue
        bd = BOUNDARY.match(line)
        if bd:
            # Kept in its OWN list for the same three properties `cannot` gets
            # by construction: not a finding, no effect on count equality,
            # never a gate. Every line is appended — a touched-boundary record
            # is a set, not a single-valued declaration.
            current['boundaries'].append(boundary_of(bd, line))
            continue
        aj = ADJUDICATES.match(line)
        if aj:
            # IT BINDS TO THE IMMEDIATELY PRECEDING `finding:` LINE, and FIRST
            # DECLARATION PER FINDING WINS — clause 12's own two rules, and the
            # reason the record is per-finding rather than per-segment: which
            # finding carries the adjudication is what makes the three-way
            # distinction (resolved / adjudicated-down / re-declared) readable
            # at all. A segment-level list discharges the earlier finding and
            # cannot say what answered it.
            #
            # A line before any `finding:` in its segment BINDS TO NOTHING and
            # declares nothing — the same shape `segments()` already gives a
            # declaration written before any report line. It is not an error
            # and invalidates nothing; there is simply no finding for it to
            # revise.
            if current['findings']:
                idx = len(current['findings']) - 1
                if idx not in current['adjudicates']:
                    # The ordinal is an int so `finding 03` and `finding 3`
                    # name the same finding: the writer is copying an ordinal
                    # out of a gate's own output, and a join disagreeing with
                    # itself on leading zeros would fail in the one direction
                    # nobody would think to test.
                    current['adjudicates'][idx] = (
                        aj.group(1), int(aj.group(2)), aj.group(3))
            continue
        s = SCOPE.match(line)
        if s:
            if current['scope'] is None:
                current['scope'] = s.group(1)
            continue
        c = COMPLETE.match(line)
        if c:
            if current['complete'] is None:
                current['complete'] = int(c.group(1))
            continue
        f = FINDING.match(line)
        if f:
            current['findings'].append(
                (f.group(1), f.group(2), bool(f.group('just')), line.strip()))
    return segs


def open_blocking(bodies, head, carried=()):
    """JUSTIFIED findings declared `blocking` and still `open`, in segments
    whose report names the CURRENT head only. Reads the declared severity,
    state and justification-presence fields — never the finding's prose.
    Returns (gating, downgraded): an open blocking WITHOUT a
    `[policy:|harm:]` justification does not gate (kogaki#72 — it fails
    toward merge as a `should`) and is returned separately so the downgrade
    is reported by name rather than silently absorbed."""
    gating, downgraded = [], []
    for seg in head_segments(segments(bodies), head, carried):
        for sev, state, just, line in seg['findings']:
            if sev == 'blocking' and state == 'open':
                (gating if just else downgraded).append(line)
    return gating, downgraded


def unadjudicated_blocking(bodies, head, carried=()):
    """§4 clause 12 (kogaki#269): EARLIER-head justified `blocking open`
    findings that no later counted segment adjudicates.

    Returns a list of (sha, ordinal, line, suggestion) — the suggestion being
    the `adjudicates:` line that would discharge it, PASTE-READY, because the
    remedy is one line and a gate that names a defect without naming its
    repair spends the reader's time computing an ordinal the gate already has.

    THE FIVE-PART PREDICATE, in the clause's own order. A finding is
    unadjudicated when ALL of:

      1. its segment does not name the current head and is not carried onto it
         — `head_segments()` decides both, so this and the presence side
         cannot drift apart on what "this head" means;
      2. its segment COUNTS (clause 6) — a fragment counts as nothing here
         exactly as it does everywhere else, so a half-posted round-1 report
         cannot hold a later head red;
      3. it is `blocking` and still `open`;
      4. it carries its `[policy:|harm:]` justification — kogaki#72's budget
         is untouched, and an UNJUSTIFIED blocking already fails toward merge
         as a `should`, so admitting one here would let it gate by the back
         door after failing to gate at its own head;
      5. no LATER counted segment carries an `adjudicates:` line naming its
         sha and ordinal. Only this part is new.

    THIS GATES THE SILENCE AND NEVER THE SEVERITY. `should` and `nit` appear
    nowhere above: the predicate never reads the later finding's severity, so
    no `should` gates as a `should`, an adjudicated downgrade passes exactly
    as before, and a PR that writes no lower-severity finding at all is caught
    identically — the case has nothing to do with downgrading and everything
    to do with an earlier blocking that no later segment ever answered. The
    served ground is that a check denies on a block's ABSENCE and never judges
    its CONTENT (`consulted: product-lab@dec0d568
    topics/claude-code-ops.md:19`).

    LATER IS DOCUMENT ORDER, and that is the whole ordering available: comment
    bodies arrive concatenated in the order the PR holds them, and a segment
    cannot adjudicate a finding written after it. Reading the adjudications of
    EVERY counted segment instead — earlier ones included — would let a
    round-1 segment discharge a round-2 blocking, which is the direction the
    clause exists to refuse.
    """
    segs = segments(bodies)
    this_head = {id(s) for s in head_segments(segs, head, carried)}
    out = []
    for i, seg in enumerate(segs):
        if id(seg) in this_head or not counted(seg):
            continue                                    # parts 1 and 2
        # Part 5's evidence, gathered over the segments AFTER this one only.
        answered = set()
        for later in segs[i + 1:]:
            if not counted(later):
                continue
            for _i, (sha, n, _grounds) in later['adjudicates'].items():
                if same_head(sha, seg['sha']):
                    answered.add(n)
        for ordinal, (sev, state, just, line) in enumerate(seg['findings'], 1):
            if sev != 'blocking' or state != 'open' or not just:
                continue                                # parts 3 and 4
            if ordinal in answered:
                continue                                # part 5
            # THE SUGGESTION CARRIES THE GROUNDS SLOT, and carries it as an
            # unmistakable placeholder rather than as empty space. A remedy
            # printed without it is a remedy the predicate refuses, and the
            # earlier form of this line printed exactly that — the gate would
            # have taught a malformed line to every reviewer who pasted its
            # output.
            out.append((seg['sha'], ordinal, line,
                        f"adjudicates: {seg['sha']} finding {ordinal}  "
                        f"<why this severity is being revised>"))
    return out


def adjudication_states(bodies, head, carried=()):
    """The THREE-WAY DISTINCTION clause 12 requires to be renderable, read off
    the record rather than inferred: for every earlier-head finding that a
    later counted segment adjudicates, which of the three states answered it.

    Returns a list of (sha, ordinal, state, grounds) where state is:

      `resolved`         the adjudicating finding is `blocking resolved`
      `adjudicated-down` it is `should` or `nit`
      `re-declared`      it is still `blocking open`

    The fourth state — SILENTLY RE-GRADED — is the absence of all three, and
    is exactly what `unadjudicated_blocking()` denies on. It is not a value
    here because it is not a thing the record says; it is the record saying
    nothing.

    THIS READS THE ADJUDICATING FINDING'S SEVERITY AND THE DENY DOES NOT, and
    the split is the whole of kogaki#72's safety here: the gate decides on
    identity alone, so no `should` ever gates as a `should`, while the human
    reading the gate's output still gets told which of the three happened.
    """
    segs = segments(bodies)
    out = []
    for seg in segs:
        if not counted(seg):
            continue
        for idx, (sha, n, grounds) in sorted(seg['adjudicates'].items()):
            sev, state, _just, _line = seg['findings'][idx]
            if sev == 'blocking' and state == 'resolved':
                what = 'resolved'
            elif sev == 'blocking':
                what = 're-declared'
            else:
                what = 'adjudicated-down'
            out.append((sha, n, what, grounds))
    return out


def fragments(bodies, head, carried=()):
    """This head's segments that DO NOT count — (declared, actual) each.

    Reported by name rather than absorbed into 'absent': a report that reached
    the PR and was not counted is a different fact from no report at all, and
    an operator told only "no report" would go looking for a spawn that in
    fact ran. The PR #71 specimen is precisely a fragment nobody could see.
    """
    return [(s['complete'], len(s['findings']))
            for s in head_segments(segments(bodies), head, carried)
            if not counted(s)]


def head_scope(bodies, head, carried=()):
    """(scope, declared) for this head's counted report, or (None, False).

    Reported, never gated (§4 clause 5): what a report ATTESTS TO belongs on
    the gate's own line, because presence and open-blocking read identically
    whatever the round and a delta review is otherwise invisible here.
    """
    for seg in head_segments(segments(bodies), head, carried):
        if counted(seg):
            return scope_of(seg), seg['scope'] is not None
    return None, False


def head_cannot(bodies, head, carried=()):
    """Every blocked dimension this head's segments declared, in order.

    REPORTED, NEVER GATED (kogaki#100 AC 2). It is returned for rendering and
    is read by nothing that decides a state: `find_report` never consults it,
    `counted()` never counts it, and `open_blocking` never sees it. A refused
    capability costs one dimension, not the review.
    """
    out = []
    for seg in head_segments(segments(bodies), head, carried):
        out.extend(seg['cannot'])
    return out


def head_boundaries(bodies, head, carried=()):
    """Every `boundary:` record this head's segments declared, in order.

    REPORTED, NEVER GATED (kogaki#258), and SEGMENT-BOUND exactly as findings
    are: a stale segment's boundary record is that round's record and never
    this head's state. Read by nothing that decides a state — `find_report`
    never consults it, `counted()` never counts it, `open_blocking` never sees
    it — so the parse cannot change this check's verdict in either direction.
    """
    out = []
    for seg in head_segments(segments(bodies), head, carried):
        out.extend(seg['boundaries'])
    return out


def find_report(bodies, head, carried=()):
    """Return ('present'|'stale'|'absent'|'head-unknown'|'blocked'
    |'incomplete', shas).

    `stale` means a report exists but names a different head: it reviewed code
    this PR no longer proposes, so it is not presence for THIS head.
    `blocked` means the report is present for this head and carries at least
    one finding declared blocking and still open — the converged half of
    converged-or-escalated (specs/SPEC.md §4, kogaki#34).
    `incomplete` means every report for this head is a FRAGMENT — §4 clause 6:
    the count it declares does not equal its own finding lines, so it turns
    nothing green and a split report holds the gate red until its last part
    lands. It is its own state rather than folded into 'absent' because the
    two owe the reader different sentences.

    ORDER MATTERS, and it is: absent, head-unknown, stale, blocked,
    incomplete, present. `blocked` is asked BEFORE completeness so that a
    fragment's own open blocking still gates and is still NAMED — clause 6
    says a fragment turns nothing GREEN, and letting incompleteness swallow a
    blocking finding would be the inverse: a partial report used to hide one.
    Both states are red; the earlier one is the more specific sentence.

    `carried` (§4 clause 7) names segments PROVEN to have reviewed this head's
    content, computed by `carry_forward` above. A carried segment is treated as
    this head's own for every state below, which is what makes the second
    instrument an instrument for the SAME pin: a carry-forward's own open
    blocking still gates, and its fragment still counts as nothing. It is not a
    round and touches no counter here.
    """
    segs = segments(bodies)
    shas = [seg['sha'] for seg in segs]
    if not shas:
        return 'absent', []
    if not head:
        # The head is part of presence. Unknown-head is its own state and is
        # NEVER 'present': making it optional exactly when it cannot be checked,
        # with the permissive value as the fallback, is failing open (PR #44
        # review).
        return 'head-unknown', shas
    current = head_segments(segs, head, carried)
    if not current:
        return 'stale', shas
    if open_blocking(bodies, head, carried)[0]:
        return 'blocked', shas
    if not any(counted(seg) for seg in current):
        return 'incomplete', shas
    return 'present', shas


def trusted_bodies(comments, allowed):
    """Concatenate only trusted authors' comment bodies (kogaki#56).

    On a public repository anyone can comment, so an author-blind parse lets
    a fork-PR author SPOOF presence with a hand-written report token — or
    hold a hostage with a foreign `blocking open` line. Trust = the repo
    owner plus the merge allowlist, the merge-eligibility rule's sources.
    Returns (bodies, spoof_shaped) where spoof_shaped lists untrusted logins
    whose dropped comments carried report or finding tokens — reported, not
    counted, because a silent drop of a spoof-shaped comment reads as no
    spoof having been attempted."""
    kept, spoof = [], set()
    for c in comments or []:
        login = ((c.get('author') or {}).get('login')) or ''
        body = c.get('body') or ''
        if login in allowed:
            kept.append(body)
        elif REPORT.search(body) or FINDING.search(body):
            spoof.add(login or '<unknown>')
    return "\n".join(kept), sorted(spoof)


# ---------------------------------------------------------------------------
# Fixture pass — discrimination evidence, run every invocation and needing no
# network, because a check whose only exercise is the live path is untested
# wherever the live path is unavailable.
# ---------------------------------------------------------------------------
HEAD = 'abc1234def5678'
FIXTURES = [
    ("a report naming this head is present",
     f"review-lane report: {HEAD}\nfindings follow", HEAD, 'present'),
    ("no report at all is absent",
     "Looks good to me, merging.", HEAD, 'absent'),
    ("a report naming a different head is stale, not present",
     "review-lane report: 9999999\nfindings", HEAD, 'stale'),
    ("an abbreviated sha still matches its full head",
     "review-lane report: abc1234", HEAD, 'present'),
    ("prose mentioning the phrase without the token is not a report",
     "I ran the review lane report on this.", HEAD, 'absent'),
    ("a report among several comments is found",
     f"nice\n---\nreview-lane report: {HEAD}\n---\nthanks", HEAD, 'present'),
    # --- PR #44 review: the head-unknown branch, previously unexercised ---
    ("a report with an unknown head is NOT present",
     f"review-lane report: {HEAD}", '', 'head-unknown'),
    ("no report with an unknown head is still absent, not head-unknown",
     "lgtm", '', 'absent'),
    # --- kogaki#34 amendment: converged, not merely reviewed ---
    ("a justified open blocking is blocked, not present",
     f"review-lane report: {HEAD}\nfinding: blocking open [harm: serves a wrong pin to every consumer]  the pin is wrong",
     HEAD, 'blocked'),
    ("an UNJUSTIFIED open blocking does not gate (kogaki#72: fails toward merge)",
     f"review-lane report: {HEAD}\nfinding: blocking open  the pin is wrong",
     HEAD, 'present'),
    ("a policy-justified blocking gates like a harm-justified one",
     f"review-lane report: {HEAD}\nfinding: blocking open [policy: product-lab@ed47fbd3 topics/x.md:9]  violates the ruling",
     HEAD, 'blocked'),
    ("the same finding RESOLVED lets the report through",
     f"review-lane report: {HEAD}\nfinding: blocking resolved  fixed in abc",
     HEAD, 'present'),
    ("open findings below blocking do not gate",
     f"review-lane report: {HEAD}\nfinding: should open  naming\n"
     "finding: nit open  a typo", HEAD, 'present'),
    ("one open blocking among several resolved still blocks",
     f"review-lane report: {HEAD}\nfinding: blocking resolved  a\n"
     "finding: blocking open [harm: b breaks the gate]  b", HEAD, 'blocked'),
    ("prose describing a blocking finding without the field does not gate",
     f"review-lane report: {HEAD}\nThis is blocking and open, I think.",
     HEAD, 'present'),
    ("findings without a report are not a report",
     "finding: blocking open  orphaned", HEAD, 'absent'),
    # --- PR #44 review, round 1: findings bind to their report segment ---
    ("an open blocking under a STALE report does not gate the current head",
     f"review-lane report: 9999999\nfinding: blocking open [harm: old]  old round\n"
     f"review-lane report: {HEAD}\nfinding: blocking resolved  fixed",
     HEAD, 'present'),
    ("an open blocking in the current head's segment gates despite an older clean report",
     f"review-lane report: 9999999\n"
     f"review-lane report: {HEAD}\nfinding: blocking open [harm: new defect breaks CI]  new defect",
     HEAD, 'blocked'),
]
failures = []
for name, bodies, head, want in FIXTURES:
    got, _ = find_report(bodies, head)
    if got != want:
        failures.append(f"{name}: got {got!r}, want {want!r}")
if failures:
    print("FAIL fixture pass — the report parser does not discriminate:")
    for f in failures:
        print(f"  {f}")
    sys.exit(1)

print(f"fixture pass: {len(FIXTURES)}/{len(FIXTURES)} discrimination cases "
      "(present / absent / stale / head-unknown / blocked / "
      "severity-below-blocking / prose-vs-field)")

# --- the declarations: scope and completeness (§4 clauses 5 and 6) ---------
# ONE GRAMMAR OVER ONE SEGMENTER, so it is exercised as one: every case below
# asserts the state AND the two declarations, because the risk this story
# carries is not that either token fails to parse but that reading them
# DISTURBS the segmentation clauses 1-4 already rest on. The adjacent-line form
# was chosen by running tools/review-sweep.sh's fixture pass against both
# candidate forms first (story 1.17's named closing act); the widened-report-
# line form segmented a declared report to nothing wherever the token's regex
# had not been widened in lockstep.
DECL = [
    ("a report declaring `delta` is still present, and the scope is read",
     f"review-lane report: {HEAD}\nreview-scope: delta\n"
     "report-complete: 0 findings", HEAD, 'present', ('delta', True)),
    ("an absent scope reads `full` — the history is not retroactively "
     "narrowed (criterion 2)",
     f"review-lane report: {HEAD}", HEAD, 'present', ('full', False)),
    ("an absent report-complete reads COMPLETE (criterion 1c)",
     f"review-lane report: {HEAD}\nfinding: should open  x",
     HEAD, 'present', ('full', False)),
    ("a matching count is complete",
     f"review-lane report: {HEAD}\nreview-scope: full\n"
     "finding: should open  x\nfinding: nit open  y\n"
     "report-complete: 2 findings", HEAD, 'present', ('full', True)),
    ("a FRAGMENT turns nothing green — declares 5, carries 1",
     f"review-lane report: {HEAD}\nfinding: should open  x\n"
     "report-complete: 5 findings", HEAD, 'incomplete', (None, False)),
    ("the PR #71 specimen: a first part declaring more than it carries",
     f"review-lane report: {HEAD}\nreview-scope: delta\n"
     "finding: should resolved  round 1's finding is fixed\n"
     "report-complete: 3 findings", HEAD, 'incomplete', (None, False)),
    ("and its completion, landing later, turns the gate green",
     f"review-lane report: {HEAD}\nreview-scope: delta\n"
     "finding: should resolved  round 1's finding is fixed\n"
     "report-complete: 3 findings\n"
     f"review-lane report: {HEAD}\nreview-scope: delta\n"
     "finding: should resolved  round 1's finding is fixed\n"
     "finding: nit open  naming\nfinding: should open  a gap\n"
     "report-complete: 3 findings", HEAD, 'present', ('delta', True)),
    ("a fragment's own open blocking still gates, and is named",
     f"review-lane report: {HEAD}\n"
     "finding: blocking open [harm: the gate would pass a fragment]  x\n"
     "report-complete: 4 findings", HEAD, 'blocked', (None, False)),
    ("zero findings, declared zero, is a complete record",
     f"review-lane report: {HEAD}\nreport-complete: 0 findings",
     HEAD, 'present', ('full', False)),
    ("findings written PAST the terminal token break count equality",
     f"review-lane report: {HEAD}\nfinding: should open  x\n"
     "report-complete: 1 findings\nfinding: nit open  y",
     HEAD, 'incomplete', (None, False)),
    ("MENTIONING the tokens in prose declares nothing (kogaki#41's class)",
     f"review-lane report: {HEAD}\nThe report-complete: 9 findings token is "
     "terminal, and review-scope: delta is the other one.\n"
     "finding: should open  x", HEAD, 'present', ('full', False)),
    ("the FIRST declaration wins; a later line cannot revise it",
     f"review-lane report: {HEAD}\nreview-scope: delta\nreview-scope: full\n"
     "report-complete: 0 findings\nreport-complete: 99 findings",
     HEAD, 'present', ('delta', True)),
    ("declarations before any report belong to no segment",
     f"review-scope: delta\nreport-complete: 7 findings\n"
     f"review-lane report: {HEAD}", HEAD, 'present', ('full', False)),
    ("a fragment naming a DIFFERENT head is stale, not incomplete",
     "review-lane report: 9999999\nreport-complete: 4 findings",
     HEAD, 'stale', (None, False)),
    ("an unknown head is still head-unknown, whatever a report declares",
     f"review-lane report: {HEAD}\nreport-complete: 4 findings",
     '', 'head-unknown', (None, False)),
]
decl_bad = []
for name, bodies, head_fx, want_state, want_scope in DECL:
    got_state, _ = find_report(bodies, head_fx)
    got_scope = head_scope(bodies, head_fx)
    if got_state != want_state or got_scope != want_scope:
        decl_bad.append(f"{name}: got ({got_state!r}, {got_scope}), "
                        f"want ({want_state!r}, {want_scope})")
# THE FRAGMENT IS NAMED, not merely refused. Asserting the outcome while never
# asserting the disclosure is the habit kogaki#76 was filed over, and this
# suite has made the same correction twice already.
for name, bodies, head_fx, want in [
    ("a fragment reports what it declared and what it carried",
     f"review-lane report: {HEAD}\nfinding: should open  x\n"
     "report-complete: 5 findings", HEAD, [(5, 1)]),
    ("a complete report owes no fragment line",
     f"review-lane report: {HEAD}\nfinding: should open  x\n"
     "report-complete: 1 findings", HEAD, []),
    ("a report with no token at all owes no fragment line",
     f"review-lane report: {HEAD}\nfinding: should open  x", HEAD, []),
]:
    got = fragments(bodies, head_fx)
    if got != want:
        decl_bad.append(f"{name}: fragments={got}, want {want}")
# And the declarations must not change a verdict the parser already reached:
# every case above re-run with all THREE lines present — a recorded base, scope
# `full` and a matching count. The base line is included here rather than only
# in its own suite because the risk clause 7 carries is the same one clauses 5
# and 6 carried: not that the token fails to parse, but that reading it
# DISTURBS the segmentation clauses 1-4 rest on.
def _declare(bodies):
    out, buf = [], []

    def flush():
        if buf:
            n = sum(1 for l in buf if FINDING.match(l))
            out.extend([buf[0], "review-base: 1111111",
                        "review-scope: full",
                        *buf[1:], f"report-complete: {n} findings"])
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


for name, bodies, head_fx, want in FIXTURES:
    got, _ = find_report(_declare(bodies), head_fx)
    if got != want:
        decl_bad.append(f"declared[{name}]: got {got!r}, want {want!r}")
if decl_bad:
    print("FAIL fixture pass — the report's declarations are not read as one "
          "grammar over the existing segmenter:")
    for f in decl_bad:
        print(f"  {f}")
    sys.exit(1)
print(f"declaration pass: {len(DECL)}/{len(DECL)} scope-and-completeness cases "
      "(declared / absent-is-full / absent-is-complete / count equality / "
      "fragment / the PR #71 split report and its completion / use-vs-mention "
      "/ first-declaration-wins), 3 fragment-disclosure cases, and all "
      f"{len(FIXTURES)} cases above re-run with all three declarations present")

# --- the base declaration and the carry-forward (§4 clause 7, kogaki#96) -----
# AC 7 first: `review-base:` is READ on the established adjacent-line pattern.
# Each case asserts the parsed base AND that the report's state is unchanged by
# it — a third declaration that shifted a verdict on its own would be the
# widened-token failure one field over.
BASE_FIX = [
    ("a recorded base is read",
     f"review-lane report: {HEAD}\nreview-base: fedcba9\n"
     "report-complete: 0 findings", HEAD, 'present', 'fedcba9'),
    ("an ABSENT base is None — never a default sha (clause 7's transitional "
     "case, not a missing base)",
     f"review-lane report: {HEAD}\nreview-scope: delta", HEAD, 'present', None),
    ("the FIRST base declaration wins; a second is IGNORED and the report "
     "stays PRESENT (AC 7 — the sibling rule, not a malformed state)",
     f"review-lane report: {HEAD}\nreview-base: fedcba9\nreview-base: 0000000",
     HEAD, 'present', 'fedcba9'),
    ("MENTIONING review-base in a finding's prose declares nothing",
     f"review-lane report: {HEAD}\n"
     "finding: nit open  the review-base: fedcba9 line is missing here",
     HEAD, 'present', None),
    ("a malformed base value is not a declaration and does not gate",
     f"review-lane report: {HEAD}\nreview-base: not-a-sha", HEAD,
     'present', None),
    ("a base declared before any report belongs to no segment",
     f"review-base: fedcba9\nreview-lane report: {HEAD}", HEAD,
     'present', None),
    ("each segment carries its OWN base",
     f"review-lane report: 9999999\nreview-base: 1111111\n"
     f"review-lane report: {HEAD}\nreview-base: 2222222", HEAD,
     'present', '2222222'),
]
base_bad = []
for name, bodies, head_fx, want_state, want_base in BASE_FIX:
    got_state, _ = find_report(bodies, head_fx)
    segs_fx = head_segments(segments(bodies), head_fx)
    got_base = segs_fx[0]['base'] if segs_fx else None
    if got_state != want_state or got_base != want_base:
        base_bad.append(f"{name}: got ({got_state!r}, {got_base!r}), "
                        f"want ({want_state!r}, {want_base!r})")

# AC 6: the carry-forward itself, over an INJECTED pair of git readers so every
# branch is exercised with no repository and no network. `D` maps a
# (base, rev) range to its diff text; a range absent from it is UNREADABLE,
# which is AC 3's fail-toward-the-reviewed-side case. `M` maps (base_b, A) to
# the merge-base at A, which is AC 8's transitional fallback.
# Every fixture sha is 7 hex characters, because `review-base:` takes the same
# 7–40 hex the report token takes: a mnemonic-but-non-hex placeholder is not a
# declaration at all, and a suite built on one would assert the fallback path
# everywhere while reporting that it had tested the recorded one.
B_HEAD, A_HEAD = 'bbbbbbb', 'aaaaaaa'
BASE_B, BASE_A, MOVED = '0b0b0b0', '0a0a0a0', '0d0d0d0'
SAME, OTHER = "diff --git a/x b/x\n+one\n", "diff --git a/x b/x\n+two\n"


def _reader(table):
    return lambda base, rev: table.get((base, rev))


CARRY = [
    ("identical-diff carry-forward — same recorded base, byte-identical diffs",
     f"review-lane report: {A_HEAD}\nreview-base: {BASE_B}\n"
     "report-complete: 0 findings",
     {(BASE_B, B_HEAD): SAME, (BASE_B, A_HEAD): SAME}, {}, 'present'),
    ("changed-diff no-carry-forward — same recorded base, the diffs differ",
     f"review-lane report: {A_HEAD}\nreview-base: {BASE_B}\n"
     "report-complete: 0 findings",
     {(BASE_B, B_HEAD): SAME, (BASE_B, A_HEAD): OTHER}, {}, 'stale'),
    ("moved-base no-carry-forward — the recorded base is NOT the PR's current "
     "base AND the move changed the diff",
     f"review-lane report: {A_HEAD}\nreview-base: {MOVED}\n"
     "report-complete: 0 findings",
     {(BASE_B, B_HEAD): SAME, (MOVED, A_HEAD): OTHER}, {}, 'stale'),
    ("moved-base-but-identical-diff CARRIES FORWARD — the case that "
     "distinguishes 'the base moved' from 'the content changed', and the one "
     "resolution (a) cannot express at all",
     f"review-lane report: {A_HEAD}\nreview-base: {MOVED}\n"
     "report-complete: 0 findings",
     {(BASE_B, B_HEAD): SAME, (MOVED, A_HEAD): SAME}, {}, 'present'),
    ("uncomputable-diff staleness — A's revision is unreadable",
     f"review-lane report: {A_HEAD}\nreview-base: {BASE_A}\n"
     "report-complete: 0 findings",
     {(BASE_B, B_HEAD): SAME}, {}, 'stale'),
    ("uncomputable-diff staleness — THIS head's own diff is unreadable, so "
     "nothing is compared at all",
     f"review-lane report: {A_HEAD}\nreview-base: {BASE_B}\n"
     "report-complete: 0 findings",
     {(BASE_B, A_HEAD): SAME}, {}, 'stale'),
    ("base-less report — AC 8's TRANSITIONAL fallback derives the merge-base "
     "at A, never the PR's current base",
     f"review-lane report: {A_HEAD}\nreport-complete: 0 findings",
     {(BASE_B, B_HEAD): SAME, (BASE_A, A_HEAD): SAME}, {(BASE_B, A_HEAD): BASE_A},
     'present'),
    ("base-less report whose derived merge-base is NOT the base reviewed — the "
     "diffs differ and the result is the safe one",
     f"review-lane report: {A_HEAD}\nreport-complete: 0 findings",
     {(BASE_B, B_HEAD): SAME, (MOVED, A_HEAD): OTHER}, {(BASE_B, A_HEAD): MOVED},
     'stale'),
    ("base-less report whose merge-base will not resolve is stale, never a "
     "carry-forward",
     f"review-lane report: {A_HEAD}\nreport-complete: 0 findings",
     {(BASE_B, B_HEAD): SAME}, {}, 'stale'),
    ("a carried segment's OWN open blocking still gates — the second "
     "instrument is for the SAME pin, not a weaker one",
     f"review-lane report: {A_HEAD}\nreview-base: {BASE_B}\n"
     "finding: blocking open [harm: the gate would pass an unresolved defect]  x\n"
     "report-complete: 1 findings",
     {(BASE_B, B_HEAD): SAME, (BASE_B, A_HEAD): SAME}, {}, 'blocked'),
    ("a carried segment that is a FRAGMENT still counts as nothing",
     f"review-lane report: {A_HEAD}\nreview-base: {BASE_B}\n"
     "report-complete: 4 findings",
     {(BASE_B, B_HEAD): SAME, (BASE_B, A_HEAD): SAME}, {}, 'incomplete'),
    ("a report already naming THIS head needs no carry-forward and is not "
     "compared against itself",
     f"review-lane report: {B_HEAD}\nreport-complete: 0 findings",
     {}, {}, 'present'),
]
carry_bad = []
for name, bodies, diffs, mbases, want in CARRY:
    state_fx, _ = find_report(bodies, B_HEAD)
    carried_fx, record_fx = [], []
    if state_fx == 'stale':
        carried_fx, record_fx = carry_forward(
            bodies, B_HEAD, BASE_B, _reader(diffs), _reader(mbases),
            segments)
        state_fx, _ = find_report(bodies, B_HEAD, carried_fx)
    if state_fx != want:
        carry_bad.append(f"{name}: got {state_fx!r}, want {want!r}")
    # AC 2: a carry-forward that leaves no record is the silent re-derivation
    # clause 7 forbids. Asserting the outcome while never asserting the
    # disclosure is the habit kogaki#76 was filed over.
    if carried_fx and not any('IDENTICAL' in l for l in record_fx):
        carry_bad.append(f"{name}: carried forward but named no comparison")
    if carried_fx and not any(BASE_B[:7] in l and B_HEAD[:7] in l
                              for l in record_fx):
        carry_bad.append(f"{name}: the record does not name THIS head's diff")

# AC 5: a carry-forward is not a round and consumes none. The round bound is
# enforced in tools/review-sweep.sh's MAX_ROUNDS over review CYCLES grouped by
# head (kogaki#190 — the earlier "over segments" wording here was the fifth
# stale record of that falsified count, found by kogaki#290), and OBSERVED at
# this gate by `_rounds_observation` over distinct heads with counted
# segments; nothing here writes a report, so neither count moves across the
# carry-forward. Asserted rather than assumed.
_carry_bodies = (f"review-lane report: {A_HEAD}\nreview-base: {BASE_B}\n"
                 "report-complete: 0 findings")
_before = len(segments(_carry_bodies))
_carried, _ = carry_forward(_carry_bodies, B_HEAD, BASE_B,
                            _reader({(BASE_B, B_HEAD): SAME,
                                     (BASE_B, A_HEAD): SAME}), _reader({}),
                            segments)
if not _carried or len(segments(_carry_bodies)) != _before:
    carry_bad.append("a carry-forward changed the segment count a round "
                     "counter reads (AC 5: it is not a round)")

if base_bad or carry_bad:
    print("FAIL fixture pass — the recorded base and the carry-forward do not "
          "behave as §4 clause 7 states:")
    for f in base_bad + carry_bad:
        print(f"  {f}")
    sys.exit(1)

# --- THE ADJUDICATION FIXTURE (§4 clause 12, kogaki#269) -------------------
#
# THE TWO CASES #269 MEASURED ARE THE FIRST TWO ROWS, and they are the reason
# the obvious statement of this defect is false. A downgrade at an UNCHANGED
# head already gated before this clause — `head_segments()` returns EVERY
# segment naming the head and `open_blocking()` iterates all of them — so a
# fixture asserting only "a downgrade is caught" would pass against the
# UNREPAIRED script and evidence nothing. The defect needs a HEAD MOVE, and
# the head move need not touch the downgraded finding.
#
# THE THREE-WAY DISTINCTION IS ASSERTED WHERE THE CLAUSE PUTS IT: `resolved`,
# `adjudicated-down` and `re-declared` all PASS, and the fourth state — the
# silent re-grade — is the absence of all three and is what the deny names.
# Rows 3-5 are those three, and they differ ONLY in the adjudicating finding's
# severity, which is precisely the field the predicate must not read.
_OLD, _NEW = "dec255e7" + "0" * 8, "4ba9f974" + "0" * 8
_MID_A, _MID_B = "aaaaaaa1" + "0" * 8, "bbbbbbb2" + "0" * 8
_J = "[harm: the gate would pass an unresolved defect]"


def _seg(sha, *lines, complete=None):
    n = len([l for l in lines if l.startswith('finding:')]) \
        if complete is None else complete
    return "\n".join([f"review-lane report: {sha}", *lines,
                      f"report-complete: {n} findings"])


ADJ = [
    ("THE #269 SPECIMEN — a blocking at an earlier head, restated `should` at "
     "the new head with nothing fixed and no adjudication line: the state "
     "that read CLEAN before this clause",
     _seg(_OLD, f"finding: blocking open {_J}  the markdown claim is false")
     + "\n" + _seg(_NEW, "finding: should open  the SAME claim, downgraded"),
     1),
    ("the CONTROL for that specimen — the same two findings at ONE head "
     "already gated through open_blocking(), so a fixture that only asserted "
     "'a downgrade is caught' would pass against the unrepaired script",
     _seg(_NEW, f"finding: blocking open {_J}  the markdown claim is false",
          "finding: should open  the SAME claim, downgraded"),
     0),
    ("RESOLVED — the adjudicating finding is `blocking resolved`",
     _seg(_OLD, f"finding: blocking open {_J}  x")
     + "\n" + _seg(_NEW, "finding: blocking resolved  fixed in this push",
                   f"adjudicates: {_OLD} finding 1  the fix landed in this push"),
     0),
    ("ADJUDICATED-DOWN — the same line at `should`, which passes for the same "
     "reason: the predicate reads WHICH finding is answered, never how it was "
     "graded (kogaki#72 untouched)",
     _seg(_OLD, f"finding: blocking open {_J}  x")
     + "\n" + _seg(_NEW, "finding: should open  re-graded",
                   f"adjudicates: {_OLD} finding 1  measured, and the harm is smaller than declared"),
     0),
    ("RE-DECLARED — still `blocking open` at the new head; the adjudication "
     "discharges the EARLIER finding and this one gates on its own through "
     "open_blocking(), which is a different state and a different message",
     _seg(_OLD, f"finding: blocking open {_J}  x")
     + "\n" + _seg(_NEW, f"finding: blocking open {_J}  still broken",
                   f"adjudicates: {_OLD} finding 1  re-declared at the same severity"),
     0),
    ("AN UNJUSTIFIED earlier blocking is NOT held here — it already failed "
     "toward merge as a `should` at its own head (kogaki#72), and admitting "
     "it would let it gate by the back door one head later",
     _seg(_OLD, "finding: blocking open  no justification")
     + "\n" + _seg(_NEW, "finding: should open  downgraded"),
     0),
    ("A FRAGMENT at the earlier head counts as nothing here too (clause 6) — "
     "a half-posted round-1 report cannot hold a later head red",
     _seg(_OLD, f"finding: blocking open {_J}  x", complete=4)
     + "\n" + _seg(_NEW, "finding: should open  downgraded"),
     0),
    ("An adjudication in a FRAGMENT discharges nothing — the segment that "
     "answers must count, or a report could clear the gate by not finishing",
     _seg(_OLD, f"finding: blocking open {_J}  x")
     + "\n" + _seg(_NEW, "finding: should open  downgraded",
                   f"adjudicates: {_OLD} finding 1  measured false", complete=9),
     1),
    ("THE ORDINAL IS PART OF THE JOIN — adjudicating finding 1 leaves finding "
     "2 unanswered, and the gate names the one still open",
     _seg(_OLD, f"finding: blocking open {_J}  first",
          f"finding: blocking open {_J}  second")
     + "\n" + _seg(_NEW, "finding: should open  the first, downgraded",
                   f"adjudicates: {_OLD} finding 1  measured false"),
     1),
    ("TWO ordinals adjudicated by one segment, ONE FINDING EACH — the line "
     "binds to the finding above it, so answering two earlier findings takes "
     "two findings here. The earlier form of this row stacked both lines "
     "under one finding and expected both to bind, which the per-finding "
     "first-wins rule correctly refuses.",
     _seg(_OLD, f"finding: blocking open {_J}  first",
          f"finding: blocking open {_J}  second")
     + "\n" + _seg(_NEW,
                   "finding: should open  the first, downgraded",
                   f"adjudicates: {_OLD} finding 1  measured false",
                   "finding: nit open  the second, downgraded",
                   f"adjudicates: {_OLD} finding 2  cosmetic after the fix"),
     0),
    ("TWO adjudication lines under ONE finding — FIRST DECLARATION WINS, so "
     "the second binds to nothing and the finding it named stays open",
     _seg(_OLD, f"finding: blocking open {_J}  first",
          f"finding: blocking open {_J}  second")
     + "\n" + _seg(_NEW, "finding: should open  downgraded",
                   f"adjudicates: {_OLD} finding 1  measured false",
                   f"adjudicates: {_OLD} finding 2  also measured false"),
     1),
    ("GROUNDS ARE REQUIRED — a groundless line declares NOTHING and the gate "
     "stays red (clause 12: 'grounds required and non-empty ... a malformed "
     "line declares nothing'). This is the round-1 blocking finding on PR "
     "#405: the first form of this act parsed the groundless line, joined on "
     "it, AND PRINTED IT as the paste-ready remedy.",
     _seg(_OLD, f"finding: blocking open {_J}  x")
     + "\n" + _seg(_NEW, "finding: should open  downgraded",
                   f"adjudicates: {_OLD} finding 1"),
     1),
    ("GROUNDS OF WHITESPACE ONLY are the same as none — `non-empty` is about "
     "content, and a line padded to look complete is the case a bare "
     "presence test admits",
     _seg(_OLD, f"finding: blocking open {_J}  x")
     + "\n" + _seg(_NEW, "finding: should open  downgraded",
                   f"adjudicates: {_OLD} finding 1   "),
     1),
    ("A line BEFORE ANY FINDING in its segment binds to nothing — the same "
     "shape a declaration written before any report line already has",
     _seg(_OLD, f"finding: blocking open {_J}  x")
     + "\n" + _seg(_NEW, f"adjudicates: {_OLD} finding 1  measured false",
                   "finding: should open  downgraded"),
     1),
    ("THE SHA IS PART OF THE JOIN — an adjudication naming a DIFFERENT "
     "segment answers nothing",
     _seg(_OLD, f"finding: blocking open {_J}  x")
     + "\n" + _seg(_NEW, "finding: should open  downgraded",
                   "adjudicates: 9999999 finding 1  measured false"),
     1),
    ("ABBREVIATED shas join — the writer copies the ordinal out of the gate's "
     "own output, which prints seven characters",
     _seg(_OLD, f"finding: blocking open {_J}  x")
     + "\n" + _seg(_NEW, "finding: should open  downgraded",
                   f"adjudicates: {_OLD[:7]} finding 1  measured false"),
     0),
    ("A LEADING-ZERO ordinal names the same finding — the int conversion is "
     "the join, not the digits",
     _seg(_OLD, f"finding: blocking open {_J}  x")
     + "\n" + _seg(_NEW, "finding: should open  downgraded",
                   f"adjudicates: {_OLD} finding 01  measured false"),
     0),
    ("DIRECTION — an EARLIER segment cannot adjudicate a LATER one's finding, "
     "or round 1 could discharge round 2's blocking before it was written. "
     "THREE segments are needed to test this and two are not: with the "
     "adjudication and the finding in the same pair, a predicate scanning "
     "ALL segments still answers correctly, because the adjudication names a "
     "sha that is not its own segment's. The earlier form of this row did "
     "exactly that and the direction mutant survived it.",
     _seg(_MID_A, "finding: nit open  something else entirely",
          f"adjudicates: {_MID_B} finding 1  measured false")
     + "\n" + _seg(_MID_B, f"finding: blocking open {_J}  x")
     + "\n" + _seg(_NEW, "finding: should open  downgraded"),
     1),
    ("A blocking at THIS head is not an earlier-head finding at all — it is "
     "open_blocking()'s, and this predicate must not double-report it",
     _seg(_NEW, f"finding: blocking open {_J}  x"),
     0),
    ("A JUSTIFIED `should` at the earlier head is not held — part 3 reads the "
     "severity, and without this row a predicate that dropped the severity "
     "test entirely would pass every other case here (found by mutation, and "
     "the mutant survived until this row existed)",
     _seg(_OLD, "finding: should open [harm: worth saying]  x")
     + "\n" + _seg(_NEW, "finding: nit open  unrelated"),
     0),
    ("A JUSTIFIED `blocking resolved` at the earlier head is not held either "
     "— part 3 reads the STATE as well as the severity, and a resolved "
     "finding is the outcome this clause exists to make expressible",
     _seg(_OLD, f"finding: blocking resolved {_J}  fixed at its own head")
     + "\n" + _seg(_NEW, "finding: nit open  unrelated"),
     0),
    ("USE-VS-MENTION — a finding's prose quoting the token is not a "
     "declaration; the line is anchored whole",
     _seg(_OLD, f"finding: blocking open {_J}  x")
     + "\n" + _seg(_NEW,
                   "finding: should open  the fix would be to write "
                   "`adjudicates: " + _OLD + " finding 1` here"),
     1),
]
adj_bad = []
for name, bodies_fx, want in ADJ:
    got = unadjudicated_blocking(bodies_fx, _NEW)
    if len(got) != want:
        adj_bad.append(f"{name}: got {len(got)} unadjudicated, want {want}")
# THE SUGGESTION IS ASSERTED, not trusted: the gate prints it paste-ready and
# a suggestion naming the wrong ordinal would send the reader to discharge a
# finding they were not asked about.
_sug = unadjudicated_blocking(
    _seg(_OLD, f"finding: blocking open {_J}  first",
         f"finding: blocking open {_J}  second")
    + "\n" + _seg(_NEW, "finding: should open  downgraded"), _NEW)
_want_sug = [f"adjudicates: {_OLD} finding 1  <why this severity is being revised>",
             f"adjudicates: {_OLD} finding 2  <why this severity is being revised>"]
if [s for _, _, _, s in _sug] != _want_sug:
    adj_bad.append("the paste-ready discharge lines do not name each "
                   "finding's own sha and ordinal WITH a grounds slot")
# AND THE SUGGESTION ROUND-TRIPS: pasting what the gate printed must clear the
# gate. A remedy the tool prints and its own predicate does not accept is the
# unbound-claim shape one level up (kogaki#243), and nothing else here catches
# it — every row above writes its adjudication line BY HAND.
_rt_lines = []
for _s in [s for _, _, _, s in _sug]:
    _rt_lines += ["finding: should open  downgraded", _s]
_rt = _seg(_OLD, f"finding: blocking open {_J}  first",
           f"finding: blocking open {_J}  second") + "\n" + _seg(_NEW, *_rt_lines)
if unadjudicated_blocking(_rt, _NEW):
    adj_bad.append("pasting the gate's OWN suggested lines does not clear the "
                   "gate — the remedy it prints is not one it accepts")
# THE WIRING IS ASSERTED FROM THE SOURCE, because no fixture reaches it. The
# rows above exercise the PREDICATE; the live pass that consumes it needs a
# real pull request, so a predicate that is correct and never called would
# pass every row here — and mutating the call site to `if False:` survived the
# whole table until this block existed. This is the same move `AC8 pass` and
# the disposition-unit pass make: read the file rather than trust the comment.
try:
    _self_src = open(__file__ if __file__.endswith('.py')
                     else 'checks/check-review-report.sh').read()
except OSError as _e:
    adj_bad.append(f"could not read this file to assert the wiring: {_e}")
else:
    # ANCHORED ON THE CALL SITE'S OWN LINE SHAPE, never on a bare substring.
    # The first form split on the bare text and matched THIS BLOCK's mention
    # of it, so the assertion read its own source and reported a defect that
    # was its own — the self-reference shape, in the one place least able to
    # afford it. A `\n    ` prefix is a statement at the `present` branch's
    # indent, which no string literal in this file has.
    _call = re.search(r"\n    _unadj = unadjudicated_blocking\("
                      r"bodies, head, carried\)\n    if _unadj:\n", _self_src)
    if not _call:
        adj_bad.append("the `present` branch does not call "
                       "unadjudicated_blocking() and branch on its result — "
                       "the predicate would be correct and unreachable")
    else:
        _body = _self_src[_call.end():].split('\n    print(f"ok:', 1)[0]
        if 'sys.exit(1)' not in _body:
            adj_bad.append("the clause-12 branch does not EXIT before the "
                           "`ok:` line — a deny that prints and returns 0 is "
                           "a report, and clause 12 declined report-only with "
                           "grounds")
if adj_bad:
    print("FAIL fixture pass — the adjudication join does not behave as §4 "
          "clause 12 states:")
    for f in adj_bad:
        print(f"  {f}")
    sys.exit(1)
# THE THREE-WAY DISTINCTION IS ASSERTED, not merely computable. Clause 12
# requires it to be RENDERABLE from the record, and a renderer nothing
# exercises is the shape this file's own registry record now carries a
# paragraph about: `unadjudicated_blocking()` was correct and unreachable until
# its call site was asserted, and `adjudication_states()` would have shipped
# in exactly that state. The served line is the screen this block was written
# against — "ask of each plan step what defect it would catch, and rewrite any
# step whose honest answer is only total absence of the output"
# (`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0
# gloss/lessons/testing.md:113`).
_states = adjudication_states(
    _seg(_OLD, f"finding: blocking open {_J}  a",
         f"finding: blocking open {_J}  b",
         f"finding: blocking open {_J}  c")
    + "\n" + _seg(_NEW,
                  "finding: blocking resolved  fixed",
                  f"adjudicates: {_OLD} finding 1  the fix landed",
                  "finding: should open  smaller than declared",
                  f"adjudicates: {_OLD} finding 2  measured, harm is smaller",
                  f"finding: blocking open {_J}  still broken",
                  f"adjudicates: {_OLD} finding 3  unchanged at this head"),
    _NEW)
_want_states = [(_OLD, 1, 'resolved', 'the fix landed'),
                (_OLD, 2, 'adjudicated-down', 'measured, harm is smaller'),
                (_OLD, 3, 're-declared', 'unchanged at this head')]
if _states != _want_states:
    adj_bad.append(f"the three-way distinction does not render from the "
                   f"record: got {_states}, want {_want_states}")
# The FOURTH state is the absence of all three and is NOT a value here — it is
# the record saying nothing, which is what the deny names. Asserted so the
# renderer cannot start inventing it.
if adjudication_states(
        _seg(_OLD, f"finding: blocking open {_J}  a")
        + "\n" + _seg(_NEW, "finding: should open  silently re-graded"), _NEW):
    adj_bad.append("the renderer invented a state for a silently re-graded "
                   "finding — the fourth state is an ABSENCE, not a value")
print(f"adjudication pass: {len(ADJ)}/{len(ADJ)} clause-12 cases (THE #269 "
      "SPECIMEN and its same-head control, which is what makes the rest "
      "evidence; GROUNDS required and non-empty, whitespace-only refused, a "
      "groundless line declaring NOTHING; the line BINDING to the finding "
      "above it, first-declaration-per-finding winning, and a line before any "
      "finding binding to nothing; all three renderable states passing while "
      "differing ONLY in the severity the predicate must not read; unjustified "
      "and fragment exclusions; sha, ordinal and DIRECTION each asserted as "
      "part of the join; use-vs-mention), plus the three-way distinction "
      "asserted through adjudication_states() and the paste-ready discharge "
      "lines ROUND-TRIPPED through the predicate that prints them")

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
_HR_OTHER = "tools/review-sweep.sh"
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
print("head-resolution agreement: the unit is reached by one path from both "
      "consumers, neither redefines it, and it answers identically on "
      "sha-identity, carried-segment, digest, diff-form AND RECORD "
      "vectors — the last covering an unresolvable base and an "
      "unreadable diff, so a consumer that stops DISCLOSING an "
      "uncomputable comparison fails here (§4 clause 7 v2, kogaki#323)")

print(f"base pass: {len(BASE_FIX)}/{len(BASE_FIX)} review-base cases "
      "(read / absent-is-None / first-declaration-wins / use-vs-mention / "
      "malformed / before-any-report / per-segment)")
print(f"carry-forward pass: {len(CARRY)}/{len(CARRY)} clause-7 cases "
      "(identical-diff / changed-diff / moved-base-changed / "
      "moved-base-identical / uncomputable either side / base-less fallback "
      "and its two refusals / blocked and fragment still bind / self), plus "
      "the record-is-written and not-a-round assertions")

# --- the blocked dimension (§4's third conduct clause, kogaki#100) ----------
# REPORTED, NEVER GATED. Every case asserts the state AND the dimensions read,
# because the risk this line carries is the inverse of the one the gated
# declarations carry: not that it fails to parse, but that it acquires gating
# force it must not have. A `cannot-determine:` that could turn a report red
# would make a refused capability delete the review — which is the defect
# kogaki#100 exists to end, reintroduced by its own remedy.
CD = [
    ("a blocked dimension is read, and the report stays PRESENT",
     f"review-lane report: {HEAD}\n"
     "cannot-determine: CI status — `gh run view` is not granted\n"
     "report-complete: 0 findings", HEAD, 'present',
     ["CI status — `gh run view` is not granted"]),
    ("SEVERAL blocked dimensions are all kept — a first-wins rule here would "
     "silently drop the second disclosure",
     f"review-lane report: {HEAD}\n"
     "cannot-determine: CI status — ungranted\n"
     "cannot-determine: the registry diff — ungranted\n"
     "report-complete: 0 findings", HEAD, 'present',
     ["CI status — ungranted", "the registry diff — ungranted"]),
    ("a blocked dimension does NOT count toward report-complete equality "
     "(AC 2) — one finding, two blocked dimensions, declares 1",
     f"review-lane report: {HEAD}\nfinding: should open  x\n"
     "cannot-determine: CI status — ungranted\n"
     "cannot-determine: the registry diff — ungranted\n"
     "report-complete: 1 findings", HEAD, 'present',
     ["CI status — ungranted", "the registry diff — ungranted"]),
    ("a blocked dimension NEVER blocks, whatever its prose says",
     f"review-lane report: {HEAD}\n"
     "cannot-determine: security — blocking, open, and I could not check it\n"
     "report-complete: 0 findings", HEAD, 'present',
     ["security — blocking, open, and I could not check it"]),
    ("a payload without the em-dash is still read — the line is reported, so "
     "refusing a shape would be gating the one declaration that cannot gate",
     f"review-lane report: {HEAD}\ncannot-determine: CI status",
     HEAD, 'present', ["CI status"]),
    ("an EMPTY payload is not a declaration",
     f"review-lane report: {HEAD}\ncannot-determine:   ", HEAD, 'present', []),
    ("MENTIONING cannot-determine in a finding's prose declares nothing",
     f"review-lane report: {HEAD}\n"
     "finding: nit open  write a cannot-determine: line here instead\n"
     "report-complete: 1 findings", HEAD, 'present', []),
    ("a blocked dimension before any report belongs to no segment",
     f"cannot-determine: CI status — ungranted\n"
     f"review-lane report: {HEAD}", HEAD, 'present', []),
    ("a blocked dimension under a STALE report is not this head's disclosure",
     "review-lane report: 9999999\ncannot-determine: CI status — ungranted\n"
     f"review-lane report: {HEAD}", HEAD, 'present', []),
    ("a real open blocking still gates beside a blocked dimension — the line "
     "excuses nothing else in the report",
     f"review-lane report: {HEAD}\n"
     "cannot-determine: CI status — ungranted\n"
     "finding: blocking open [harm: the pin serves a wrong line]  x\n"
     "report-complete: 1 findings", HEAD, 'blocked',
     ["CI status — ungranted"]),
    ("a FRAGMENT is still a fragment beside a blocked dimension",
     f"review-lane report: {HEAD}\n"
     "cannot-determine: CI status — ungranted\n"
     "report-complete: 4 findings", HEAD, 'incomplete',
     ["CI status — ungranted"]),
]
cd_bad = []
for name, bodies, head_fx, want_state, want_cd in CD:
    got_state, _ = find_report(bodies, head_fx)
    got_cd = head_cannot(bodies, head_fx)
    if got_state != want_state or got_cd != want_cd:
        cd_bad.append(f"{name}: got ({got_state!r}, {got_cd}), "
                      f"want ({want_state!r}, {want_cd})")
# AC 2 asserted DIRECTLY rather than only through the cases above: the declared
# count is compared against the finding lines alone, so adding blocked
# dimensions to a counted report must not move it off `present` — and removing
# them must not either.
_cd_base = (f"review-lane report: {HEAD}\nfinding: should open  x\n"
            "report-complete: 1 findings")
_cd_more = (f"review-lane report: {HEAD}\nfinding: should open  x\n"
            "cannot-determine: a — b\ncannot-determine: c — d\n"
            "report-complete: 1 findings")
if find_report(_cd_base, HEAD)[0] != find_report(_cd_more, HEAD)[0]:
    cd_bad.append("blocked dimensions changed count equality (AC 2: they are "
                  "not findings and do not count)")
if cd_bad:
    print("FAIL fixture pass — the blocked-dimension line is not reported-and-"
          "never-gated:")
    for f in cd_bad:
        print(f"  {f}")
    sys.exit(1)
print(f"blocked-dimension pass: {len(CD)}/{len(CD)} cannot-determine cases "
      "(read / several kept / not counted / never blocks / no-em-dash / empty "
      "/ use-vs-mention / before-any-report / stale-segment / a real blocking "
      "still gates / a fragment is still a fragment), plus the count-equality "
      "invariance assertion")

# --- the boundary-vs-receipt record (kogaki#258) ----------------------------
# The fifth declaration, asserted on the same two axes every declaration before
# it was: the record PARSES as declared, and reading it DISTURBS NOTHING — the
# state this check reaches must be byte-identical with and without the lines,
# because a reported-never-gated declaration that moved a verdict would be the
# widened-token failure one field over.
#
# Each case is a MUTANT DERIVED FROM THIS DIFF (specs/SPEC.md §4): the token
# literal, each verdict in the alternation, the `none` arm, the
# receipt-required-for-`covered` downgrade, the entry's digit class, the
# every-line-kept choice, the whole-line anchor, and the segment binding. The
# mutation table in the PR record names which case catches each.
BOUNDARY_FIX = [
    ("an uncovered boundary is read: entry, verdict, no downgrade",
     f"review-lane report: {HEAD}\n"
     "boundary: 1 uncovered  checks/check-review-report.sh — entry 1, "
     "Check/CI infrastructure", HEAD, 'present',
     [('1', 'uncovered', False)]),
    ("a covered boundary NAMING ITS RECEIPT is read as covered",
     f"review-lane report: {HEAD}\n"
     "boundary: 3 covered [receipt: product-lab@dec0d56 LESSONS.md:122]  "
     "the disposition copy", HEAD, 'present', [('3', 'covered', False)]),
    ("a `covered` naming NO receipt is DOWNGRADED to cannot-determine and the "
     "downgrade is recorded, never silent",
     f"review-lane report: {HEAD}\nboundary: 3 covered  trust me", HEAD,
     'present', [('3', 'cannot-determine', True)]),
    ("an explicit cannot-determine verdict is read as itself, undowngraded",
     f"review-lane report: {HEAD}\nboundary: 2 cannot-determine  no CI run",
     HEAD, 'present', [('2', 'cannot-determine', False)]),
    ("the DECLARED ZERO parses, and is not the same record as no line at all",
     f"review-lane report: {HEAD}\nboundary: none", HEAD, 'present',
     [(None, 'none', False)]),
    ("the declared zero carries its reason and still parses",
     f"review-lane report: {HEAD}\nboundary: none  no trigger term fired",
     HEAD, 'present', [(None, 'none', False)]),
    ("an ABSENT record is EMPTY — the undeclared state story 1.41's AC1a "
     "reports, never inferred as `none`",
     f"review-lane report: {HEAD}\nfinding: nit open  x", HEAD, 'present', []),
    ("EVERY line is kept, in order — not the first (several boundaries can be "
     "touched, and a first-wins rule would drop the rest)",
     f"review-lane report: {HEAD}\nboundary: 1 uncovered  a\n"
     "boundary: 2 covered [receipt: p@1 f:1]  b\n"
     "boundary: 3 uncovered  c", HEAD, 'present',
     [('1', 'uncovered', False), ('2', 'covered', False),
      ('3', 'uncovered', False)]),
    ("MENTIONING boundary: inside a finding's prose declares nothing "
     "(use-vs-mention, kogaki#41)",
     f"review-lane report: {HEAD}\n"
     "finding: nit open  the boundary: 1 uncovered line is missing here",
     HEAD, 'present', []),
    ("a non-numeric entry is not a declaration — the entry is the map's own "
     "heading number",
     f"review-lane report: {HEAD}\nboundary: entry-one uncovered  x", HEAD,
     'present', []),
    ("an unknown verdict token is not a declaration",
     f"review-lane report: {HEAD}\nboundary: 1 maybe  x", HEAD, 'present', []),
    ("a boundary line before any report belongs to no segment",
     f"boundary: 1 uncovered  x\nreview-lane report: {HEAD}", HEAD,
     'present', []),
    ("the record is SEGMENT-BOUND: a stale segment's boundaries are that "
     "round's record and never this head's",
     "review-lane report: 9999999\nboundary: 1 uncovered  old round\n"
     f"review-lane report: {HEAD}\nboundary: 2 covered [receipt: p@1 f:1]  new",
     HEAD, 'present', [('2', 'covered', False)]),
    ("an uncovered boundary NEVER gates — a clean report stays present",
     f"review-lane report: {HEAD}\nboundary: 1 uncovered  x\n"
     "report-complete: 0 findings", HEAD, 'present',
     [('1', 'uncovered', False)]),
    ("a boundary line is NOT a finding and does not count toward "
     "report-complete equality",
     f"review-lane report: {HEAD}\nboundary: 1 uncovered  x\n"
     "finding: nit open  y\nreport-complete: 1 findings", HEAD, 'present',
     [('1', 'uncovered', False)]),
    ("a real blocking finding still gates with a boundary record present",
     f"review-lane report: {HEAD}\nboundary: none\n"
     "finding: blocking open [harm: it breaks the gate]  x", HEAD, 'blocked',
     [(None, 'none', False)]),
]
bound_bad = []
for name, bodies, head_fx, want_state, want_rows in BOUNDARY_FIX:
    got_state, _ = find_report(bodies, head_fx)
    got_rows = [(e, v, d) for e, v, d, _raw in head_boundaries(bodies, head_fx)]
    if got_state != want_state or got_rows != want_rows:
        bound_bad.append(f"{name}: got ({got_state!r}, {got_rows}), "
                         f"want ({want_state!r}, {want_rows})")
# THE INVARIANCE ASSERTION, and it is the load-bearing half: stripping every
# `boundary:` line must leave this check's verdict unchanged on every case
# above. That is what "reported, never gated" MEANS, and asserting it is the
# only way a later widening of the token cannot quietly acquire a deny.
for name, bodies, head_fx, want_state, _rows in BOUNDARY_FIX:
    stripped = "\n".join(l for l in bodies.splitlines()
                         if not l.lstrip().startswith('boundary:'))
    got_state, _ = find_report(stripped, head_fx)
    if got_state != want_state:
        bound_bad.append(f"invariance[{name}]: stripping the boundary lines "
                         f"changed the verdict to {got_state!r} from "
                         f"{want_state!r} — the record is not gate-neutral")
if bound_bad:
    print("FAIL fixture pass — the boundary-vs-receipt record does not "
          "discriminate (kogaki#258):")
    for f in bound_bad:
        print(f"  {f}")
    sys.exit(1)
print(f"boundary pass: {len(BOUNDARY_FIX)}/{len(BOUNDARY_FIX)} "
      "boundary-vs-receipt cases (each verdict / receipt-required downgrade / "
      "declared zero / absent-is-undeclared / several kept / use-vs-mention / "
      "entry and verdict token classes / before-any-report / segment-bound / "
      "never gates / not a finding), plus the gate-neutrality invariance "
      f"assertion re-run over all {len(BOUNDARY_FIX)}")

# --- trust assembly fixtures (kogaki#56): author-filtering, both directions.
OWN = 'repo-owner'
TRUST_FIX = [
    ("a foreign-author report is not presence",
     [{'author': {'login': 'hostile-bot'}, 'body': f"review-lane report: {HEAD}"}],
     {OWN}, HEAD, 'absent', ['hostile-bot']),
    ("a trusted-author report is presence",
     [{'author': {'login': OWN}, 'body': f"review-lane report: {HEAD}"}],
     {OWN}, HEAD, 'present', []),
    ("a foreign blocking finding cannot hold a trusted clean report hostage",
     [{'author': {'login': OWN}, 'body': f"review-lane report: {HEAD}"},
      {'author': {'login': 'hostile-bot'},
       'body': f"review-lane report: {HEAD}\nfinding: blocking open  fake"}],
     {OWN}, HEAD, 'present', ['hostile-bot']),
    ("an allowlisted author counts like the owner",
     [{'author': {'login': 'teammate'}, 'body': f"review-lane report: {HEAD}"}],
     {OWN, 'teammate'}, HEAD, 'present', []),
    ("a foreign chatty comment is neither counted nor flagged",
     [{'author': {'login': 'passerby'}, 'body': "nice work!"}],
     {OWN}, HEAD, 'absent', []),
]
trust_bad = []
for name, comments, allowed, head_fx, want_state, want_spoof in TRUST_FIX:
    bodies_fx, spoof_fx = trusted_bodies(comments, allowed)
    got_state, _ = find_report(bodies_fx, head_fx)
    if got_state != want_state or spoof_fx != want_spoof:
        trust_bad.append(f"{name}: got ({got_state!r}, {spoof_fx}), "
                         f"want ({want_state!r}, {want_spoof})")
if trust_bad:
    print("FAIL fixture pass — the trust assembly does not discriminate:")
    for f in trust_bad:
        print(f"  {f}")
    sys.exit(1)
print(f"trust pass: {len(TRUST_FIX)}/{len(TRUST_FIX)} author-filter cases "
      "(foreign-report-spoof / trusted / hostage-inverse / allowlist / chatty)")


# ── §4 clause 11's fixtures (kogaki#357, story 1.59 AC5)
#
# SIX properties, each with a case that FIRES. A property whose check has no
# firing case is how `catch_all_share` measured the wrong quantity through two
# stories and a review round, and two of these six — the evaporating carrier and
# the procedural block — are stated as NEGATIVE or OUTLIVING properties, which
# is exactly the shape a check written from the positive criterion passes
# without implementing. Each of those two therefore gets BOTH directions.
_BH = "b" * 40          # the blocked PR's final head
_OLD, _NEW = "1" * 40, "2" * 40


def _anc(a, b):
    """Ancestry for the fixtures: _OLD precedes _NEW and nothing else relates."""
    return True if (a, b) == (_OLD, _NEW) else False


def _blocked(*findings):
    return ("review-lane report: " + _BH + "\n" + "\n".join(findings)
            + f"\nreport-complete: {len(findings)} findings")


_STRUCT = _blocked("finding: blocking open [harm: the split is wrong]  x")
_PROC = _blocked("finding: should resolved  x")

CLAUSE11 = [
    # AC7 — a non-successor is untouched. First, because it is the property that
    # keeps every other row off every ordinary PR.
    ("AC7 a PR declaring no `supersedes:` owes NOTHING and returns no rows",
     "an ordinary PR body\ncarried: #1 in prose, not a declaration",
     _STRUCT, {}, {}, []),
    # AC1
    ("AC1 a successor's `supersedes:` is read from its declaration text",
     "supersedes: #99\ncarried: #500", _STRUCT,
     {99: _OLD, 'successor': _NEW}, {99: "d1", 'successor': "d2"},
     [('supersedes', 'ok'), ('disposition', 'ok'),
      ('base-advanced', 'ok'), ('falsification', 'ok')]),
    # AC2 — the count, both directions
    ("AC2 FIRES: two inherited open findings, one disposition declared",
     "supersedes: #99\ncarried: #500",
     _blocked("finding: blocking open [harm: a]  x",
              "finding: should open  y"),
     {99: _OLD, 'successor': _NEW}, {99: "d1", 'successor': "d2"},
     [('supersedes', 'ok'), ('disposition', 'unmet'),
      ('base-advanced', 'ok'), ('falsification', 'ok')]),
    ("AC2 passes when every inherited open finding has one",
     "supersedes: #99\ncarried: #500\ndeclined: superseded by the re-cut",
     _blocked("finding: blocking open [harm: a]  x",
              "finding: should open  y"),
     {99: _OLD, 'successor': _NEW}, {99: "d1", 'successor': "d2"},
     [('supersedes', 'ok'), ('disposition', 'ok'),
      ('base-advanced', 'ok'), ('falsification', 'ok')]),
    # AC2a — THE criterion the natural check misses. A disposition is present,
    # well-formed, and counts — and the merge that reads it closes its carrier.
    ("AC2a FIRES: `carried: #500` while THIS merge closes #500",
     "supersedes: #99\ncarried: #500\nCloses #500", _STRUCT,
     {99: _OLD, 'successor': _NEW}, {99: "d1", 'successor': "d2"},
     [('supersedes', 'ok'), ('disposition', 'unmet'),
      ('disposition-evaporates', 'unmet'),
      ('base-advanced', 'ok'), ('falsification', 'ok')]),
    ("AC2a does NOT fire when the carrier outlives the merge",
     "supersedes: #99\ncarried: #500\nCloses #357", _STRUCT,
     {99: _OLD, 'successor': _NEW}, {99: "d1", 'successor': "d2"},
     [('supersedes', 'ok'), ('disposition', 'ok'),
      ('base-advanced', 'ok'), ('falsification', 'ok')]),
    ("a malformed disposition is REPORTED, never read as absent",
     "supersedes: #99\ncarried: soon", _STRUCT,
     {99: _OLD, 'successor': _NEW}, {99: "d1", 'successor': "d2"},
     [('supersedes', 'ok'), ('disposition', 'unmet'),
      ('disposition-malformed', 'unmet'),
      ('base-advanced', 'ok'), ('falsification', 'ok')]),
    # AC3 — the unmoved base, which is kogaki#335's own shape
    ("AC3 FIRES: the successor branched from the blocked PR's own base",
     "supersedes: #99\ncarried: #500", _STRUCT,
     {99: _OLD, 'successor': _OLD}, {99: "d1", 'successor': "d2"},
     [('supersedes', 'ok'), ('disposition', 'ok'),
      ('base-unmoved', 'unmet'), ('falsification', 'ok')]),
    ("a base that does NOT descend is a different row from an unmoved one",
     "supersedes: #99\ncarried: #500", _STRUCT,
     {99: _NEW, 'successor': _OLD}, {99: "d1", 'successor': "d2"},
     [('supersedes', 'ok'), ('disposition', 'ok'),
      ('base-advanced', 'unmet'), ('falsification', 'ok')]),
    ("AC3 cannot-determines rather than guessing when a base does not resolve",
     "supersedes: #99\ncarried: #500", _STRUCT,
     {'successor': _NEW}, {99: "d1", 'successor': "d2"},
     [('supersedes', 'ok'), ('disposition', 'ok'),
      ('base-advanced', 'cannot-determine'), ('falsification', 'ok')]),
    # AC4 / AC4a — the falsification member and its narrowing
    ("AC4 FIRES: identical diff under a STRUCTURAL block",
     "supersedes: #99\ncarried: #500", _STRUCT,
     {99: _OLD, 'successor': _NEW}, {99: "same", 'successor': "same"},
     [('supersedes', 'ok'), ('disposition', 'ok'),
      ('base-advanced', 'ok'), ('falsification', 'unmet')]),
    ("AC4a does NOT fire: identical diff under a PROCEDURAL block — the "
     "kogaki#335 shape, and the spurious falsification this narrowing exists "
     "to prevent",
     "supersedes: #99\ncarried: #500", _PROC,
     {99: _OLD, 'successor': _NEW}, {99: "same", 'successor': "same"},
     [('supersedes', 'ok'), ('disposition', 'ok'),
      ('base-advanced', 'ok'), ('falsification', 'ok')]),
    ("an identical diff with an UNREADABLE record is cannot-determine on both "
     "rows, never a falsification",
     "supersedes: #99\ncarried: #500", None,
     {99: _OLD, 'successor': _NEW}, {99: "same", 'successor': "same"},
     [('supersedes', 'ok'), ('disposition', 'cannot-determine'),
      ('base-advanced', 'ok'), ('falsification', 'cannot-determine')]),
    # A record that IS readable and carries no COUNTED segment for the blocked
    # head — a FRAGMENT. Distinct from the unreadable case above and reached by
    # a different branch: the earlier fixture coerced its empty string to None
    # and so only ever exercised the unreadable path, which is exactly why the
    # disposition row could report `ok` here while its twin below said
    # cannot-determine. "I could not look" is not "there was nothing to see".
    ("a READABLE record with no counted segment for the blocked head is "
     "cannot-determine on the disposition row too, not `0 of 0`",
     "supersedes: #99\ncarried: #500",
     "review-lane report: " + _BH + "\nfinding: blocking open [harm: a]  x"
     "\nreport-complete: 5 findings",
     {99: _OLD, 'successor': _NEW}, {99: "d1", 'successor': "d2"},
     [('supersedes', 'ok'), ('disposition', 'cannot-determine'),
      ('base-advanced', 'ok'), ('falsification', 'ok')]),
]
# The trust filter on the SUPERSEDED PR's record has its own fixture, because a
# call site is not a test — PR #359 round 1 found the filter missing entirely,
# and the mutation that "proved" the repair turned out to have been killed by a
# syntax error in the mutation itself rather than by any assertion.
#
# THE DIRECTION IS INFLATION, NOT SUPPRESSION, and that is worth stating because
# round 1's finding named the other one. A stranger's empty report CANNOT empty
# `inherited_open` or silence `structural_block`: segments UNION, so the owner's
# real report still counts and both readers still see it. What a stranger CAN do
# is ADD — a foreign `finding: blocking open` on the superseded PR inflates the
# inherited count, so a successor that dispositioned everything it actually owed
# reads `unmet`, and it makes `structural_block` true, so an unchanged diff
# reports a FALSIFICATION of a diagnosis no reviewer made. That is the same
# hostage vector this file already names for its own PR (kogaki#56), reached
# through the one record that was not filtered.
_SPOOF = [
    {"author": {"login": "owner"},
     "body": _blocked("finding: should resolved  x")},
    {"author": {"login": "drive-by"},
     "body": _blocked("finding: blocking open [harm: injected]  x")},
]
_trust_bad = []
_kept, _spoofed = blocked_record_from(_SPOOF, {"owner"})
if _spoofed != ["drive-by"]:
    _trust_bad.append(f"the spoof-shaped untrusted comment was not reported: "
                      f"{_spoofed}")


def _c11_rows(record):
    return [(p_, v) for p_, v, _ in successor_obligations(
        "supersedes: #99", record, _BH,
        {99: _OLD, 'successor': _NEW}, _anc, {99: "same", 'successor': "same"})]


_filtered = _c11_rows(_kept)
_blind = _c11_rows("\n".join(c["body"] for c in _SPOOF))
# FILTERED: the owner's only finding is `resolved`, so nothing is inherited, the
# block was PROCEDURAL, and an identical diff falsifies nothing. BLIND: the
# stranger's injected `blocking open` is inherited AND makes the block read
# structural, so a successor owing nothing is told it owes a disposition and the
# identical diff reports a falsification. Both rows flip.
if ('disposition', 'ok') not in _filtered or \
        ('falsification', 'ok') not in _filtered:
    _trust_bad.append(f"filtered read is not clean: {_filtered}")
if ('disposition', 'unmet') not in _blind or \
        ('falsification', 'unmet') not in _blind:
    _trust_bad.append(f"author-blind read did not inflate as expected — the "
                      f"fixture no longer demonstrates the exposure: {_blind}")
if _trust_bad:
    print("FAIL clause-11 pass — the superseded PR's record is not "
          "author-filtered (kogaki#56):")
    for f in _trust_bad:
        print(f"  {f}")
    sys.exit(1)
print("clause-11 trust pass: the superseded PR's record is filtered by the "
      "SAME kogaki#56 rule this file applies to its own — asserted by showing "
      "an author-blind read of the same comments FLIPS both the disposition "
      "and the falsification row, not by the call site's presence")

c11_bad = []
for name, decl, bb, bases, diffs, want in CLAUSE11:
    # `bb` is passed THROUGH, never coerced: a readable-but-illegible record and
    # an unreadable one are different inputs reaching different branches, and
    # the coercion that used to stand here collapsed them (PR #359 round 1).
    got = [(p, v) for p, v, _ in successor_obligations(
        decl, bb, _BH, bases, _anc, diffs)]
    if got != want:
        c11_bad.append(f"{name}:\n      got  {got}\n      want {want}")
if c11_bad:
    print("FAIL clause-11 pass — the successor-obligation reader does not "
          "discriminate:")
    for f in c11_bad:
        print(f"  {f}")
    sys.exit(1)
print(f"clause-11 pass: {len(CLAUSE11)}/{len(CLAUSE11)} successor-obligation "
      "cases — AC7's non-successor returns NO rows, and the two criteria a "
      "natural implementation misses are asserted in BOTH directions: the "
      "evaporating carrier (`carried: #N` while the merge closes #N) fires and "
      "its outliving twin does not, and the falsification fires on a STRUCTURAL "
      "block and stays silent on a PROCEDURAL one (the kogaki#335 shape). The "
      "grammar is clause 8's, loaded from lib/disposition.py and not restated")

# The lend is asserted MECHANICALLY, not by the comment above it. A consumer
# that loads the unit and then re-derives the same answer its own way has the
# divergence back — which is the whole failure lib/head_resolution.py was
# created for, and its own agreement fixture makes the same assertion.
for _src in ("checks/check-review-report.sh", "tools/review-sweep.sh"):
    _t = open(_src, encoding="utf-8").read()
    if not re.search(r'^DISPOSITION_PATH = "lib/disposition\.py"$', _t, re.M):
        print(f"FAIL clause-11 pass: {_src} does not LOAD the disposition unit")
        sys.exit(1)
    if re.search(r'^DISPOSITION = re\.compile', _t, re.M):
        print(f"FAIL clause-11 pass: {_src} re-declares the disposition "
              "grammar instead of loading it — §4 clause 8's vocabulary is "
              "LENT, and a second copy is the synonym-in-a-join-key defect "
              "clause 11 names by name")
        sys.exit(1)
# AC8's comment repair gets a GUARD, because round 1 found it UNBUILT while the
# commit message and the PR table both said it was built. A prose repair with no
# check is a claim, and the claim is what failed — so the stale sentence is
# asserted absent rather than assumed edited. One regex, and it is the cheapest
# possible answer to "the record says it was repaired".
# USE VERSUS MENTION, and the guard needs it because the REPAIR ITSELF QUOTES
# THE SENTENCE IT RETIRES — recording what the file used to say is the right
# move and a blunt substring match calls it a regression. Same shape story 1.58
# met with `--all-groups`: discriminate the live claim from the note that it is
# gone. A line carrying the sentence passes only when it is marked historical.
_stale = "kogaki#306 stays its own carrier: it owns the"
_live = [l for l in open("tools/review-sweep.sh",
                         encoding="utf-8").read().splitlines()
         if _stale in l and "used to read" not in l]
if _live:
    print("FAIL clause-11 pass: tools/review-sweep.sh still states the "
          "kogaki#306 division that moved on 2026-08-11 — the REFUSAL surface "
          "folded into kogaki#305 and the successor's obligations became §4 "
          "clause 11. Story 1.59 AC8.")
    sys.exit(1)
print("AC8 pass: the superseded division comment is gone from "
      "tools/review-sweep.sh — asserted, not claimed")

print("disposition-unit pass: one definition (lib/disposition.py), both "
      "consumers load it, and neither re-declares the pattern — asserted by "
      "reading both files rather than by the comment that says so")


def _declared_round_bound():
    """§4 clause 3's bound, READ from its single declaration (kogaki#305).

    This function used to be the place a second numeric copy of the bound
    lived — a `bound=2` default, called argument-less by the live pass, in a
    REGISTERED CHECK, while clause 3 declared the number single-sourced. The
    clause's own closing sentence names this observation as "the backstop that
    sees a crossed bound whoever produced it", so a private copy here would
    have meant raising `review_rounds_max` to 3 leaves the declared backstop
    still observing at 2 and reporting a crossing on every legal round 3.
    Found by the review lane on PR #307, round 1.

    Returns None rather than raising when the declaration is absent or
    unreadable. This is the opposite direction from `tools/review-sweep.sh`'s
    `_round_bound()`, which exits, and the asymmetry is the report-vs-gate
    split rather than an inconsistency: the sweep is about to SPEND a round
    and must not do so unbounded, while this line only OBSERVES and "never
    gates" — so an unresolvable bound here makes the observation
    cannot-determine and says so, and never fails a PR for a config read.
    """
    try:
        declared = json.loads(
            open(".claude/review-lane.json").read())["review_rounds_max"]
    except (OSError, KeyError, ValueError):
        return None
    if not isinstance(declared, int) or isinstance(declared, bool) or declared < 1:
        return None
    return declared


def _rounds_observation(bodies, bound=None):
    """kogaki#290: the §4 clause 3 bound, OBSERVED at the record. Never gates.

    `bound` is SUPPLIED BY THE CALLER and defaults to `None` — the live pass
    reads the declared value and passes it in, and this function never resolves
    it (kogaki#305). Said that way because the docstring used to claim the
    default WAS the declared value, which the signature has never done: a
    reader trusting it would expect an argument-less call to bind the bound,
    and an argument-less call binds nothing. The fixture pass
    below passes its own explicit bound and stays hermetic — it exercises the
    counting's DISCRIMINATION, which is not a property of what this repository
    happens to declare, and a fixture reading repo config would go green or
    red with an edit to a file it is not testing.

    Returns the lines to print (empty when the record is inside the bound), so
    the fixture pass below asserts on them and the live pass prints them.

    THE UNIT IS DISCLOSED AND IS NOT THE SWEEP'S: this counts DISTINCT HEADS
    NAMED BY COUNTED REPORT SEGMENTS in the trusted comments — data this gate
    already parses for presence and staleness — not `rounds_used()`'s cycle
    resolution in tools/review-sweep.sh. Re-implementing that resolution here
    is the two-implementations defect kogaki#52 names and the trade PR #287
    declined in the mirror direction (kogaki#288); a coarser count with its
    unit stated beats a finer count maintained twice. Abbreviated and full
    spellings of one sha are merged; a fragment counts as nothing here exactly
    as it does everywhere else (§4 clause 6); a carry-forward writes no
    segment and so adds no head.

    WHICH WAY THE DISAGREEMENT RUNS — BOTH WAYS (kogaki#292, carried from PR
    #291 round 1). Stating that the unit differs is not enough for a reader
    who is being told to stop and escalate: a bare "not the sweep's count"
    leaves them unable to tell whether this line is the cautious side or the
    permissive one, and it is BOTH, depending on what happened.

    · It OVER-counts. No sha resolution happens here, so a segment citing a
      fabricated head is a head to this function. `performed()` in
      tools/review-sweep.sh excludes exactly that (kogaki#91, the PR #67
      specimen: a real prefix with an invented tail), so a record this line
      calls a crossing may be one the sweep never charged.

    · It UNDER-counts, by two separate mechanisms rather than one.
      `rounds_used()` is `len(heads) + len(unattested)`, so a
      `review-round-unverified:` mark whose head carries no performed report
      is a spent round to the sweep — a session spawned and paid for that left
      no readable artifact — and it writes no segment, so it is invisible
      here. And a FRAGMENT is charged a round by the sweep while counting as
      nothing here. `park_class()` in tools/review-sweep.sh says so twice, in
      as many words: "a fragment is performed, so it is charged a round
      (deliberately, see `decide()`)", and, in the scope-boundary paragraph
      that keeps the point from being over-read, "`rally_cycles()`'s charging
      is UNTOUCHED. A fragment spent a round and is still counted as one."

    So a reader who finds this line silent has NOT established that the bound
    is intact, and a reader who finds it printing has not established that it
    was crossed. What the line establishes is that the RECORD shows N distinct
    reviewed heads, which is worth printing precisely because it is the half
    no session hook can reach — and is worth bounding, in the reader's head,
    by the two directions above.

    REPORT, NOT DENY, decided rather than defaulted (kogaki#290 acceptance):
    producer identity is instrument-none at this record — an owner-authorized
    third round (claude-toolkit#283's approval flow) is indistinguishable
    here from an unauthorized one, and a deny would hold every authorized
    round hostage to an adjudication carrier clause 3 does not have. The deny
    lives at the layer where authorization IS readable: the session boundary,
    where claude-toolkit#283's PreToolUse carrier refuses any reviewer spawn
    without a single-use owner grant naming the PR and round. This line is
    the other half of that seam: it makes a crossing VISIBLE whoever produced
    it, including producers no session hook can reach.
    """
    heads = []
    for seg in segments(bodies):
        if not counted(seg):
            continue
        sha = seg['sha']
        for i, h in enumerate(heads):
            if h.startswith(sha) or sha.startswith(h):
                heads[i] = max(h, sha, key=len)
                break
        else:
            heads.append(sha)
    if len(heads) <= bound:
        return []
    return [
        f"NOTE: rounds observed at the record, reported and never gated "
        f"(kogaki#290): {len(heads)} distinct heads carry counted report "
        f"segments — {', '.join(h[:7] for h in heads)} — against the §4 "
        f"clause 3 bound of {bound} (\"Two rounds, then a parked owner "
        f"decision. Never a third.\").",
        f"  The unit here is distinct-heads-with-counted-segments, not the "
        f"sweep's cycle count; whether any round past the bound was "
        f"authorized is not readable at the record (producer identity: "
        f"instrument-none). Authorization is checked where it exists: a "
        f"reviewer session requires a single-use owner approval naming the "
        f"PR and round (claude-toolkit#283). A crossing with no such grant "
        f"is the abnormal condition the owner ruled on 2026-08-08 — stop, "
        f"do not spawn, escalate.",
    ]


# The observation must discriminate (kogaki#290 acceptance: a PR carrying
# performed segments at three distinct heads must not read the same as one
# carrying two), stay silent inside the bound, merge abbreviated spellings,
# and give fragments no weight.
#
# MUTATION TABLE (kogaki#230; carried from PR #291 round 1 as kogaki#292).
# The four cases below shipped with their discrimination asserted by a
# reviewer's presence read and never demonstrated. Demonstrated now: each
# mutation was applied to `_rounds_observation` above, the check run, and the
# file restored — every one killed, and each by a DIFFERENT case, which is what
# makes the four cases four rather than one case written four ways.
#
#   mutation applied to `_rounds_observation`      case that killed it
#   ------------------------------------------     -------------------
#   prefix match -> equality (`h == sha`)          an abbreviated respelling
#                                                  is one head, not two
#   drop the completeness filter (`if False:`)     a third head that is only
#                                                  a fragment adds nothing
#   `len(heads) <= bound` -> `< bound`             two heads stay silent
#                                                  (also the other two silent
#                                                  cases — an off-by-one on the
#                                                  bound is caught three ways)
#   drop `{len(heads)}` from the printed line      three heads are named
#
# ONE NEAR-MISS IS RECORDED BECAUSE IT ALMOST BECAME A FALSE ROW. The
# completeness mutation was first applied by string replacement, which hit the
# FIRST `if not counted(seg):` in this file — at the top of the module, in a
# different function — and left `_rounds_observation` untouched. The check
# passed, which reads exactly like a surviving mutation and would have been
# recorded as an uncovered case. It was caught by grepping for the pattern
# rather than trusting the edit. The transferable half: a mutation asserted at
# a STRING is applied wherever that string first occurs, so in a file that
# reuses a guard idiom, target the LINE and assert what you are replacing —
# and a mutation that appears to survive is a claim about the harness before
# it is a claim about the coverage.
_R1, _R2, _R3 = 'ccccccc', 'ddddddd', 'eeeeeee'
_seg = lambda sha: (f"review-lane report: {sha}\nfinding: should open  x\n"
                    "report-complete: 1 findings")
_frag = lambda sha: (f"review-lane report: {sha}\nfinding: should open  x\n"
                     "report-complete: 5 findings")
rounds_bad = []
for name, fx_bodies, want_lines in [
    ("two heads stay silent", "\n".join([_seg(_R1), _seg(_R2)]), 0),
    ("three heads are named", "\n".join([_seg(_R1), _seg(_R2), _seg(_R3)]), 2),
    ("an abbreviated respelling is one head, not two",
     "\n".join([_seg(_R1), _seg(_R2), _seg(_R1 + 'fffffff'[:5])]), 0),
    ("a third head that is only a fragment adds nothing",
     "\n".join([_seg(_R1), _seg(_R2), _frag(_R3)]), 0),
]:
    got = _rounds_observation(fx_bodies, bound=2)
    if len(got) != want_lines:
        rounds_bad.append(f"{name}: {len(got)} line(s), want {want_lines}")
    if want_lines and "3 distinct heads" not in got[0]:
        rounds_bad.append(f"{name}: the count is not on the line: {got[0]}")
if rounds_bad:
    print("FAIL fixture pass — the rounds observation does not discriminate:")
    for f in rounds_bad:
        print(f"  {f}")
    sys.exit(1)
print("rounds pass: 4/4 record-side bound cases "
      "(silent-in-bound / crossing-named / respelling-merged / fragment-weightless)")

# ---------------------------------------------------------------------------
# The live pass.
# ---------------------------------------------------------------------------
pr = os.environ.get("REVIEW_PR", "")
head = os.environ.get("REVIEW_HEAD", "")
note = os.environ.get("REVIEW_NOTE", "")

substrate = os.environ.get("REVIEW_SUBSTRATE", "ok")

if substrate == 'no-pr':
    print(f"CANNOT-DETERMINE: {note} — this check asserts a report's presence "
          "ON A PULL REQUEST, and the lookup succeeded and established there "
          "is none. Not a pass and not a failure.")
    sys.exit(0)

if substrate == 'unestablished':
    print(f"FAIL could not establish the substrate: {note}. This is reported "
          "as a FAILURE rather than as cannot-determine on purpose: a gate "
          "that exits 0 whenever its own instrument is unavailable disappears "
          "silently in exactly the condition where it matters, and 'I could "
          "not look' is not evidence that there was nothing to see.")
    sys.exit(1)

def _trusted_authors():
    """WHO IS TRUSTED — repo owner + `merge_author_allowlist`. ONE DEFINITION,
    read by every consumer in this file (kogaki#360).

    The merge-eligibility rule's SOURCES, copied as sources rather than as a
    login (the PR #46 lesson).

    IT IS SITED HERE, ABOVE THE MODULE-LEVEL ASSEMBLY, FOR ONE REASON: that
    assembly runs at exec time, so a `def` below it is not yet bound when it
    needs one. Position is the only thing that was ever in the way, and a copy
    is what stood in its place — this file assembled the set twice, once for
    THIS PR's comments and once for a superseded PR's, and the two agreed only
    because nobody had changed either yet.

    WHY A SECOND COPY MATTERS HERE MORE THAN ELSEWHERE: a third source, or a
    rename of `merge_author_allowlist`, updates one copy — and the copy that
    keeps the old set was the blocked-PR read, which is reported-never-gated
    and so fails INVISIBLY. That read was author-blind entirely until PR #359
    round 1 found it.

    THIS IS GUARDED BY BEING ONE FUNCTION AND BY NOTHING ELSE — deliberately
    (owner decision 2026-08-11, PR #361 round 1). A mechanical assertion
    counting the trust literals was written here and REMOVED: the served
    position the licensing verdict cited names "a check suite growing at
    roughly one member per incident" as the tell for being on the DETECT side,
    and a counter added because a copy happened once is precisely that member.
    THE EXTRACTION IS THE CONSTRAINT. Someone who re-copies this set is writing
    a new second definition rather than slipping past a guard that used to be
    here — and the file's disposition-unit assertion is NOT precedent for
    adding one back: that unit spans two files with no single owner, where this
    one has an owner and is four lines long.

      consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17
      LESSONS.md:61
    """
    allowed = {os.environ.get("REVIEW_OWNER", "")} - {""}
    try:
        with open(".claude/pipeline.json") as f:
            allowed.update(json.load(f).get("merge_author_allowlist", []))
    except (FileNotFoundError, json.JSONDecodeError):
        pass
    return allowed


# Assemble the trusted bodies (kogaki#56): authored comments filtered to the
# repo owner + pipeline.json's merge_author_allowlist; the REVIEW_BODIES
# injection route stays as pre-trusted test input.
bodies = os.environ.get("REVIEW_BODIES", "")
raw_json = os.environ.get("REVIEW_COMMENTS_JSON", "")
if raw_json.strip():
    allowed = _trusted_authors()
    try:
        comments = json.loads(raw_json).get("comments", [])
    except json.JSONDecodeError:
        print("FAIL could not establish the substrate: the comments payload "
              "did not parse — not treated as 'no comments'.")
        sys.exit(1)
    trusted, spoof_shaped = trusted_bodies(comments, allowed)
    bodies = (bodies + "\n" + trusted) if bodies else trusted
    for login in spoof_shaped:
        print(f"NOTE: a report/finding-shaped comment from untrusted author "
              f"{login!r} was excluded — spoof-shaped, reported not counted "
              "(kogaki#56; trust = repo owner + merge_author_allowlist).")

def _git(*args):
    """A git read, or None. Never raises: an unavailable or unexecutable git,
    an unknown revision and a non-zero exit are all 'could not read', which is
    AC 3's fail-toward-the-reviewed-side input rather than a check failure."""
    try:
        r = subprocess.run(["git", *args], stdin=subprocess.DEVNULL,
                           capture_output=True, text=True, check=False)
    except OSError:
        return None
    return r.stdout if r.returncode == 0 else None


# The diff FORM comes from the shared unit (§4 clause 7 v2, kogaki#308); only
# the RUNNER is this file's. `--no-color` and the fixed context are exactly as
# load-bearing as they were when they lived here — the comparison is BYTE
# equality — but they are no longer a fact only this file knows.
_diff_at, _merge_base = make_git_readers(_git)


carried = []
state, shas = find_report(bodies, head)

# kogaki#290: the record-side rounds observation prints on EVERY terminal
# state — a crossed bound is exactly as worth seeing on a red PR as on a
# green one, and the specimen (PR #287) was red for a different reason when
# its third round landed unobserved.
_declared_bound = _declared_round_bound()
if _declared_bound is None:
    print("rounds observation: CANNOT-DETERMINE — §4 clause 3's bound is not "
          "readable at its declaration (.claude/review-lane.json, "
          "`review_rounds_max`), so a crossing cannot be observed here. "
          "Reported, never gated (kogaki#290, kogaki#305).")
else:
    for _line in _rounds_observation(bodies, bound=_declared_bound):
        print(_line)


def _report_blocked_dimensions():
    """Print this head's `cannot-determine:` lines. REPORTED, NEVER GATED.

    Called on every terminal branch that has a report for this head rather
    than only on the passing one: a dimension the reviewer could not obtain is
    exactly as worth knowing when the report is blocked or a fragment, and a
    disclosure printed only on success is one nobody sees on the runs that
    needed it.
    """
    for dim in head_cannot(bodies, head, carried):
        print(f"NOTE: the reviewer declared a BLOCKED DIMENSION, reported and "
              f"never gated (kogaki#100): cannot-determine: {dim}")


def _report_successor_obligations():
    """Print this PR's §4 clause 11 obligations. REPORTED, NEVER GATED.

    Called beside `_report_blocked_dimensions` and `_report_boundary_record` on
    every terminal branch that has a report, and for the same reason: what a
    successor owes the PR it supersedes is exactly as worth knowing on a blocked
    or fragment run as on a passing one.

    A PR that declares no `supersedes:` prints NOTHING — clause 11's trigger is
    the supersession state and nothing wider, and the reader returns no rows for
    it by construction.
    """
    decl = os.environ.get("REVIEW_DECL", "")
    blocked = supersedes_of(decl)
    if blocked is None:
        return
    # Each `gh` fact is fetched ONCE and threaded. The previous shape called
    # `_pr_base` and `_blocked_pr_head` directly and then again inside
    # `_pr_diff`: five round trips where three do, on the check whose own
    # runtime note names the `gh` lookup as its dominant cost.
    bodies_b = _blocked_pr_record(blocked)
    head_b = _blocked_pr_head(blocked)
    base_b = _pr_base(blocked)
    base_s = os.environ.get("REVIEW_BASE") or None
    rows = successor_obligations(
        decl, bodies_b, head_b,
        {blocked: base_b, 'successor': base_s},
        _is_ancestor,
        {blocked: _diff_at(base_b, head_b) if base_b and head_b else None,
         'successor': _diff_at(base_s or "", head)})
    print(f"successor obligations (§4 clause 11, kogaki#306) for a PR "
          f"declaring `supersedes: #{blocked}` — REPORTED, NEVER GATED:")
    for prop, verdict, detail in rows:
        print(f"  clause-11 {prop}: {verdict.upper()} — {detail}")
    if any(v == 'unmet' for _, v, _ in rows):
        print("  the base-postdates property above is A CHECK STANDING IN FOR "
              "A GATE. Clause 11 rules it a PROHIBITION whose layer is "
              "actor-level (~/.claude/hooks/lint-pr-merge.py, "
              "tim-nish/claude-toolkit) and unreachable from this repository, "
              "so a green run of this file is NOT the prohibition being in "
              "force — `deferred-slot: cross-repo-merge-gate`.")


def _blocked_pr_record(n):
    """The blocked PR's TRUSTED comment bodies, or None if not readable.

    FILTERED BY AUTHOR, exactly as this file filters its own PR's comments
    (kogaki#56). An author-blind read here would be the same spoof this file
    already refuses one function over, aimed at a softer target: any commenter
    on the blocked PR could post a report-shaped comment naming its head with
    `report-complete: 0 findings`, which empties `inherited_open` — so the
    disposition row reads OK — and makes `structural_block` return False — so
    the falsification row stays silent. Those are the two clause-11 rows a
    successor most owes, and nothing would have turned red.
    """
    out = _gh("pr", "view", str(n), "--json", "comments")
    if out is None:
        return None
    try:
        comments = json.loads(out).get("comments", [])
    except (ValueError, AttributeError):
        return None
    trusted, spoof_shaped = blocked_record_from(comments, _trusted_authors())
    for login in spoof_shaped:
        print(f"NOTE: a report/finding-shaped comment from untrusted author "
              f"{login!r} on superseded PR #{n} was excluded from the "
              f"clause-11 read — spoof-shaped, reported not counted "
              f"(kogaki#56).")
    return trusted


def _blocked_pr_head(n):
    return (_gh("pr", "view", str(n), "--json", "headRefOid",
                "-q", ".headRefOid") or "").strip() or None


def _pr_base(n):
    return (_gh("pr", "view", str(n), "--json", "baseRefOid",
                "-q", ".baseRefOid") or "").strip() or None


def _is_ancestor(a, b):
    """Is a an ancestor of b? True / False / None when git cannot answer."""
    if not a or not b:
        return None
    try:
        r = subprocess.run(["git", "merge-base", "--is-ancestor", a, b],
                           stdin=subprocess.DEVNULL, capture_output=True,
                           check=False)
    except OSError:
        return None
    return True if r.returncode == 0 else (False if r.returncode == 1 else None)


def _gh(*args):
    """A gh read, or None. Never raises — every failure is cannot-determine."""
    try:
        r = subprocess.run(["gh", *args], stdin=subprocess.DEVNULL,
                           capture_output=True, text=True, check=False)
    except OSError:
        return None
    return r.stdout if r.returncode == 0 else None


def _report_boundary_record():
    """Print this head's boundary-vs-receipt record. REPORTED, NEVER GATED.

    Called beside `_report_blocked_dimensions` on every terminal branch that
    has a report, and for the same reason: which boundaries a diff touched and
    which of them nothing answered is exactly as worth knowing when the report
    is blocked or a fragment.

    An ABSENT record is printed as absent. Every report already in this
    repository's history predates the token, so this NOTE is the expected
    output until the shape is in use — and it is the honest one: "no boundary
    line" and "no boundary touched" are different facts, told apart by the
    `boundary: none` declaration and by nothing else.
    """
    rows = head_boundaries(bodies, head, carried)
    if not rows:
        print("NOTE: this report declares NO boundary-vs-receipt record "
              "(kogaki#258) — reported, never gated. An absent record is "
              "UNDECLARED, which is not the same fact as no boundary having "
              "been touched; the declared zero is `boundary: none`.")
        return
    uncovered = 0
    for entry, verdict, downgraded, raw in rows:
        if verdict == 'uncovered':
            uncovered += 1
        print(f"NOTE: boundary-vs-receipt record, reported and never gated "
              f"(kogaki#258): {raw}")
        if downgraded:
            print(f"  entry {entry}: `covered` naming no receipt is read as "
                  "cannot-determine — a coverage claim with no `[receipt: "
                  "<pin>]` is not falsifiable, and the read fails toward the "
                  "honest side.")
    if uncovered:
        print(f"the lane recorded {uncovered} TOUCHED consultation-map "
              "boundary/boundaries with no covering receipt. This is a "
              "finding-side judgment and is not gated here (kogaki#72: an "
              "uncovered boundary is in none of the three blocking classes).")
if state == 'stale':
    # §4 clause 7: the sha is the instrument, the content is the subject. Only
    # attempted on the stale branch — a report already naming this head needs
    # no second instrument, and the git reads are not spent where they cannot
    # change the answer.
    base = os.environ.get("REVIEW_BASE", "").strip()
    carried, record = carry_forward(bodies, head, base or None,
                                    _diff_at, _merge_base, segments)
    for line in record:
        print(f"clause-7 {line}")
    if carried:
        state, shas = find_report(bodies, head, carried)
        print(f"CARRY-FORWARD: the report naming "
              f"{', '.join(c[:7] for c in carried)} reviewed content "
              f"byte-identical to head {head[:7]}'s, so it is presence for this "
              "head (specs/SPEC.md §4 clause 7, kogaki#96). The comparison is "
              "recorded above and is re-runnable; it is NOT a round and "
              "consumes none of the two-round bound.")
if state == 'head-unknown':
    print(f"FAIL: PR #{pr} carries a review-lane report, but this run could "
          "not establish which head it should name. The head is part of "
          "presence, so an unknown head is not a pass.")
    sys.exit(1)
if state == 'blocked':
    _report_blocked_dimensions()
    _report_boundary_record()
    _report_successor_obligations()
    blocking, downgraded = open_blocking(bodies, head, carried)
    for d in downgraded:
        print(f"NOTE: unjustified blocking downgraded to should, non-gating "
              f"(kogaki#72 — justify with [policy: <pin>] or [harm: ...] or "
              f"re-grade): {d}")
    print(f"FAIL: PR #{pr} has a review-lane report for head {head[:7]}, but "
          f"{len(blocking)} finding(s) are declared blocking and still open. "
          "The property is CONVERGED or escalated, not reviewed-once "
          "(specs/SPEC.md §4): resolve them, or escalate to a parked owner "
          "decision after the second round. A round past the bound requires "
          "a single-use owner approval naming this PR and round "
          "(claude-toolkit#283); this gate observes the bound in its rounds "
          "line (kogaki#290) and does not enforce it — non-convergence in "
          "one round is an abnormal condition, not a spawn trigger.")
    for b in blocking:
        print(f"  {b}")
    sys.exit(1)
if state == 'incomplete':
    _report_blocked_dimensions()
    _report_boundary_record()
    _report_successor_obligations()
    print(f"FAIL: PR #{pr} carries a review-lane report for head {head[:7]}, "
          "but it is a FRAGMENT and a fragment counts as nothing "
          "(specs/SPEC.md §4 clause 6, kogaki#74). A partial report turns "
          "nothing green, and a split report holds the gate red until its "
          "last part lands — which is the merge PR #71 should not have had.")
    for declared, actual in fragments(bodies, head, carried):
        print(f"  declares `report-complete: {declared} findings` but carries "
              f"{actual} finding line(s)")
    print("  Post the report whole, in ONE comment, with its terminal "
          "`report-complete: <N> findings` line last and N equal to the "
          "number of `finding:` lines above it.")
    sys.exit(1)
if state == 'present':
    # WHAT THE REPORT ATTESTS TO IS ON THE PASSING LINE (§4 clause 5). Clause
    # 1's mechanical half reads presence and open-blocking identically whatever
    # the round, so without this the gate's own output cannot tell a full
    # review from a delta one — which is the narrower assurance in a full
    # review's clothes the clause was written against. It is REPORTED, never
    # enforced: whether a declared `delta` was honest is judgment, and clause 5
    # is carrier-less by design with a named reopen trigger.
    _report_blocked_dimensions()
    _report_boundary_record()
    _report_successor_obligations()
    scope, declared = head_scope(bodies, head, carried)
    # §4 clause 12 (kogaki#269) — LAST, because the clause says "after every
    # existing state is clean". A PR that is stale, blocked, fragmentary or
    # report-less already has its own verdict, and firing this one over any of
    # them would replace a precise diagnosis with a vaguer one.
    _unadj = unadjudicated_blocking(bodies, head, carried)
    if _unadj:
        print(f"FAIL: PR #{pr}'s report for head {head[:7]} carries no open "
              f"blocking finding, but {len(_unadj)} justified `blocking open` "
              "finding(s) at an EARLIER head are adjudicated by nothing. A "
              "head move discards no severity: an earlier declaration is "
              "superseded by an ACT, never by ceasing to be read "
              "(specs/SPEC.md §4 clause 12).")
        for sha, ordinal, line, suggestion in _unadj:
            print(f"  {sha[:7]} finding {ordinal}: {line}")
            print(f"    discharge with: {suggestion}")
        print("  Add the line(s) above to a finding in a counted segment at "
              "this head. THIS GATES THE SILENCE, NEVER THE SEVERITY "
              "(kogaki#72 untouched): the adjudicating finding may be "
              "`blocking resolved` (resolved by a fix), `should`/`nit` "
              "(adjudicated down, with your grounds beside it), or `blocking "
              "open` (re-declared) — the gate reads which finding you are "
              "answering and never how you graded it. Costs no round: "
              "kogaki#190 counts cycles by head.")
        sys.exit(1)
    print(f"ok: review-lane report present on PR #{pr} for head {head[:7]}, "
          "no open blocking findings, and every earlier-head blocking finding "
          "is adjudicated (§4 clause 12)")
    print(f"scope: {scope}" + ("" if declared else
          " — DECLARED BY NOBODY, read as `full` on the compatibility "
          "direction §4 clause 5 states (the reports already in this "
          "repository's history are full reviews)"))
    if scope == 'delta' and declared:
        print("a DELTA review is a narrower assurance than a full one: its "
              "subject is the previous round's findings × the fix commits. "
              "Whether that scope was the honest one is the lane's judgment "
              "and is not verified here (§4 clause 5, carrier-less; reopen "
              "trigger: one PR whose round-2 report declared `delta` and "
              "missed a defect inside the fix commits it claimed to cover).")
elif state == 'stale':
    print(f"FAIL: PR #{pr} carries a review-lane report, but it names "
          f"{', '.join(s[:7] for s in shas)} and this head is {head[:7]} — a "
          "report reviewed the code it names, so a later push is unreviewed.")
    sys.exit(1)
else:
    print(f"FAIL: no review-lane report on PR #{pr}. Every PR receives a "
          "report authored outside the authoring session before merge "
          "(specs/SPEC.md §4). Emit one as a PR comment whose first line is "
          "`review-lane report: <head sha>`.")
    sys.exit(1)

print("not carried here, stated rather than implied: whether the report's "
      "author differs from the work's author. Session identity is in neither "
      "git nor GitHub metadata, so the isolation half is an OBLIGATION in "
      ".claude/skills/review-lane/SKILL.md and is ADVICE, not enforcement. "
      "A pass above is not a claim that the review was independent.")
print("also not carried here: whether the report's findings are any good — "
      "that is judgment and stays in the review lane.")
EOF
