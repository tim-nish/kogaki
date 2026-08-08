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

REVIEW_PR="$PR_NUMBER" REVIEW_HEAD="$HEAD_SHA" REVIEW_BODIES="$COMMENTS" \
REVIEW_BASE="$BASE_SHA" \
REVIEW_COMMENTS_JSON="$COMMENTS_JSON" REVIEW_OWNER="$TRUSTED_OWNER" \
REVIEW_NOTE="$substrate_note" REVIEW_SUBSTRATE="$substrate" python3 <<'EOF'
import hashlib, json, os, re, subprocess, sys

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


def head_segments(segs, head, carried=()):
    """The segments naming THIS head — abbreviated shas match either way.

    `carried` holds the shas of segments PROVEN to have reviewed this head's
    content (§4 clause 7): a carried segment is this head's segment for every
    purpose below — presence, open-blocking, completeness and scope — because
    the clause admits a second instrument for the same pin, not a second class
    of report. Default empty, so nothing that does not ask for a carry-forward
    behaves differently by one line.
    """
    return [s for s in segs
            if (head and (head.startswith(s['sha']) or s['sha'].startswith(head)))
            or s['sha'] in carried]


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
                       'boundaries': [],
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


def carry_forward(bodies, head, base_b, diff_at, merge_base):
    """§4 clause 7: which segments PROVABLY reviewed this head's content.

    Returns (carried, record) — the shas that carry forward, and the lines that
    NAME what was compared. The equality is RECOMPUTED AND RECORDED, never
    assumed: `record` carries each `base..rev` range and its digest for both
    sides, so a later reader re-runs the comparison instead of trusting it (AC
    2). A carry-forward that left no record is the silent re-derivation clause 7
    forbids at its pin.

    Both git reads are INJECTED rather than called here — `diff_at(base, rev)`
    returning the diff text or None, `merge_base(a, b)` returning a sha or None
    — so the fixture pass exercises every branch with no repository and no
    network, on the same ground the rest of this file's fixtures rest on.

    A's base is READ from its `review-base:` line whenever it recorded one
    (resolution (c)). A base-less report — every report written before the field
    shipped — falls back to the MERGE-BASE at A (resolution (b)) and never to
    the PR's current base (resolution (a)): (a) takes both diffs against one
    base, which makes a base move invisible, and a fallback that fails open on
    this clause's own counter-example is worse than no carry-forward at all.
    The fallback is transitional and keyed on the line's absence alone.

    Anything uncomputable — an unresolvable base, an unreadable revision — is
    NOT a carry-forward (AC 3). It leaves `carried` empty, the caller keeps the
    existing `stale` state, and the reason is still named in `record`.
    """
    record, carried = [], []
    diff_b = diff_at(base_b, head) if base_b else None
    if base_b is None:
        record.append("carry-forward NOT computed: the PR's current base could "
                      "not be resolved, so there is nothing to compare against "
                      "— stale, failing toward the reviewed side")
        return carried, record
    if diff_b is None:
        record.append(f"carry-forward NOT computed: the diff "
                      f"{base_b[:7]}..{head[:7]} could not be read — stale, "
                      "failing toward the reviewed side")
        return carried, record
    record.append(f"carry-forward candidate: this head's diff is "
                  f"{base_b[:7]}..{head[:7]} [{digest(diff_b)}]")
    for seg in segments(bodies):
        a = seg['sha']
        if head.startswith(a) or a.startswith(head):
            continue                      # already this head's own segment
        if seg['base'] is not None:
            base_a, how = seg['base'], "recorded `review-base:` (resolution c)"
        else:
            base_a = merge_base(base_b, a)
            how = ("merge-base at A — the report records no base, so clause 7's "
                   "TRANSITIONAL fallback (resolution b)")
            if base_a is None:
                record.append(f"  {a[:7]}: no carry-forward — the report records "
                              "no base and the merge-base could not be resolved")
                continue
        diff_a = diff_at(base_a, a)
        if diff_a is None:
            record.append(f"  {a[:7]}: no carry-forward — the diff "
                          f"{base_a[:7]}..{a[:7]} could not be read ({how})")
            continue
        same = diff_a == diff_b
        record.append(f"  {a[:7]}: reviewed {base_a[:7]}..{a[:7]} "
                      f"[{digest(diff_a)}] via {how} — "
                      f"{'IDENTICAL, carries forward' if same else 'DIFFERS, stale'}")
        if same:
            carried.append(a)
    return carried, record


def digest(text):
    """A short, re-computable name for a diff — `sha256:<12 hex>`.

    The record names the RANGES and this digest rather than pasting two diffs
    into a gate's output: the ranges are what a reader re-runs, and the digest
    is what they compare their own result against. `sha256(git diff output)` is
    reproducible by anyone holding the repository.
    """
    return "sha256:" + hashlib.sha256(text.encode('utf-8')).hexdigest()[:12]


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
            bodies, B_HEAD, BASE_B, _reader(diffs), _reader(mbases))
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
                                     (BASE_B, A_HEAD): SAME}), _reader({}))
if not _carried or len(segments(_carry_bodies)) != _before:
    carry_bad.append("a carry-forward changed the segment count a round "
                     "counter reads (AC 5: it is not a round)")

if base_bad or carry_bad:
    print("FAIL fixture pass — the recorded base and the carry-forward do not "
          "behave as §4 clause 7 states:")
    for f in base_bad + carry_bad:
        print(f"  {f}")
    sys.exit(1)
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


def _rounds_observation(bodies, bound=2):
    """kogaki#290: the §4 clause 3 bound, OBSERVED at the record. Never gates.

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
    got = _rounds_observation(fx_bodies)
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

# Assemble the trusted bodies (kogaki#56): authored comments filtered to the
# repo owner + pipeline.json's merge_author_allowlist; the REVIEW_BODIES
# injection route stays as pre-trusted test input.
bodies = os.environ.get("REVIEW_BODIES", "")
raw_json = os.environ.get("REVIEW_COMMENTS_JSON", "")
if raw_json.strip():
    allowed = {os.environ.get("REVIEW_OWNER", "")} - {""}
    try:
        with open(".claude/pipeline.json") as f:
            allowed.update(json.load(f).get("merge_author_allowlist", []))
    except (FileNotFoundError, json.JSONDecodeError):
        pass
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


def _diff_at(base, rev):
    """The diff a review at `rev` proposed against `base` — the three-dot form,
    which is what a PR diff IS: the changes on rev since it diverged from base,
    never base's own later commits. `--no-color` and a fixed context are named
    rather than inherited, because the comparison is BYTE equality and a diff
    rendered under someone's git config is a different string for the same
    content."""
    return _git("diff", "--no-color", "--unified=3", f"{base}...{rev}")


def _merge_base(base, rev):
    out = _git("merge-base", base, rev)
    return out.strip() if out and out.strip() else None


carried = []
state, shas = find_report(bodies, head)

# kogaki#290: the record-side rounds observation prints on EVERY terminal
# state — a crossed bound is exactly as worth seeing on a red PR as on a
# green one, and the specimen (PR #287) was red for a different reason when
# its third round landed unobserved.
for _line in _rounds_observation(bodies):
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
                                    _diff_at, _merge_base)
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
    scope, declared = head_scope(bodies, head, carried)
    print(f"ok: review-lane report present on PR #{pr} for head {head[:7]}, "
          "no open blocking findings")
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
