#!/usr/bin/env bash
# The boundary-receipt binding at the merge layer (specs/SPEC.md §4, kogaki#25;
# story 1.11, licensed by kogaki#29).
#
# WHAT THIS GATES. A consultation-map boundary whose trigger terms MATCH this
# branch, with ZERO receipts present, FAILS. That is what converts the map from
# advice an agent may remember into a carrier that binds on every PR: an
# obligation generates no event to hook, but a PR is an event, so
# receipt-absence over a diff is a computable fact rather than an absence with
# nothing to observe (specs/SPEC.md §4; topics/knowledge-architecture.md:36).
#
# IT IS A PRESENCE CHECK OVER TWO DECLARED ENUMERATIONS and adds no judgment
# clause. The two enumerations are the map's entries and the branch's receipts;
# neither is inferred and both are named in the output below, because a
# coverage claim is a fraction OF an enumeration and one that hides its
# denominator cannot be read.
#
# IT NEVER BRANCHES ON THE OUTCOME TOKEN. A receipt satisfies this check
# whichever of the ratified triple it carries — `discriminating`,
# `covered-after-reframing`, `uncovered-after-N-framings` — because the
# obligation is TO ASK and never TO HAVE FOUND (specs/SPEC.md §4, as corrected
# for kogaki#32). A check that passed on some outcomes and failed on others
# would be judging whether the consultation SUCCEEDED, which is the review
# lane's property, not the merge layer's. The parse below cannot branch on it:
# it never reads past line one.
#
# LINE ONE ONLY (kogaki#28, story 1.10). The v2 receipt puts `request_id`,
# `outcome` and `query:` on indented continuation lines and leaves line one
# unchanged from v1. Presence is decidable from the `consulted:` line alone, so
# this check reads nothing else and stays independent of the block's internals
# — a later amendment to what rides inside the block cannot break the boundary
# binding. `check-consult-receipts.sh` is the file that validates the block;
# the split is deliberate and is why that check's contract is not absorbed here.
#
# IT BINDS PRESENCE, NOT ORDER. It asserts a consultation was RECORDED on the
# branch, and asserts nothing about WHEN, relative to the work. A receipt
# written after the code it was supposed to precede satisfies this exactly as
# one written before it. Nothing in this repository observes that ordering —
# not this check, not the read prescription, not the review lane — and it is
# stated here so a later reader does not assume the binding covers it.
# (Observed live: the story-1.10 branch ran entry 1's read prescription AFTER
# writing the check it governs, and the receipt is indistinguishable from one
# emitted before.)
#
# AND THE ATTRIBUTION HALF IS CARRIER-LESS, MARKED RATHER THAN OMITTED. A
# receipt's line one names a PIN (`<repo>@<sha> <file:line>`), never a boundary,
# so nothing mechanically ties receipt R to boundary B. This check therefore
# asserts that the branch carries at least one receipt when any boundary
# matched — N matched boundaries are satisfied by one receipt, and a branch
# touching two boundaries while consulting only one passes. Carrier-less by
# omission is the defect; carrier-less with a reopen trigger is admissible
# (topics/knowledge-architecture.md:52@ed47fbd). Reopen trigger: one PR that
# matched two or more boundaries, carried a receipt for only one of them, and
# shipped a defect the unconsulted boundary would have caught. The honest fix
# then is a receipt that names its boundary, which is a grammar change owned by
# the receipt spec rather than a clause this file can add on its own.
#
# FALSE POSITIVES ARE ACCEPTED AND DISCHARGED, NOT NARROWED AWAY. A trigger
# term appearing incidentally fires the gate, and the remedy is the same act a
# real match asks for: record a receipt. `uncovered-after-N-framings` is a
# conforming answer, so a spurious match costs one consultation rather than a
# false verdict — the map's own ratified accretion polarity, preserved at gate
# severity (owner decision, story 1.11 implementation). Narrowing the match to
# diff paths alone was the considered alternative and was declined: it would
# silently shrink what the map binds.
#
# THAT DECLINE NOW HAS ITS FIRST MEASURED INSTANCE, RECORDED HERE SO THE NEXT
# READER MEETS THE EVIDENCE RATHER THAN RE-DERIVING IT (kogaki#126). Reproduced
# at master `38d47d3` with `BOUNDARY_SKIP_ISSUE_LOOKUP=1`, base `3a352ee`, head
# `da638af` (PR #123, story 1.23), PR #123's body supplied as `CONSULT_PR_BODY`:
#
#   FAIL: 1 mapped boundary/boundaries matched this branch and NO consult
#   receipt is present — #1 Check/CI infrastructure (matched on 'check' in
#   changed text).
#
# The diff over that range is `terrain/terrain.mjs` and nothing else — no check,
# no hook, no registry entry. The cost was exactly one consultation, discharged
# with a genuine receipt on the branch; nothing about PR #123 was shaped to
# avoid the match. Two facts about the instance are worth more than the instance
# itself, because both are invisible from the output line alone:
#
#   - THE MATCHING TEXT WAS THE PR BODY, NOT THE COMMIT PROSE. Neither `da638af`
#     nor `e8a2cef` carries an entry-1 trigger term in its commit message; the
#     same range run with no `CONSULT_PR_BODY` reports `no mapped boundary
#     matched this branch`. The report says `changed text` for both halves of
#     `BOUNDARY_TEXT`, so prose written ABOUT a change after the fact is
#     indistinguishable in the output from prose written AS the change. Any
#     future proposal to weight or scope the sources has to name that split
#     first, because the source it would weight is a compound.
#   - THE MATCH SOURCE IS BASE-DEPENDENT, SO THE CLASS IS INVISIBLE FROM MERGED
#     HISTORY. At master, `git merge-base origin/master da638af` resolves to
#     `7353af8`, whose range pulls in `3a352ee`, which does touch `checks/` —
#     run over THAT range the same check reports `matched on 'check' in diff
#     paths` and passes. Looking for this class after the fact will not find it.
#
# THE DECLINE STANDS ON THAT EVIDENCE (kogaki#126, spec sitting 2026-08-07;
# candidate 1 of three, selected by the owner). Weighting the sources so a
# path-signal match binds while a changed-text-only match merely reports was
# declined again: it is a judgment clause, which `specs/SPEC.md:687-691`
# forecloses in as many words — this is "a presence check over two declared
# enumerations" that "adds no judgment clause". Per-term source scoping was
# declined as adding a per-term field to the map's entry schema, contracted at
# `specs/SPEC.md:47-49`. What carries the decision is the map's own accretion
# polarity — "each entry routes to a judgment rather than encoding one, so a
# member that turns out not to apply costs a consultation rather than a false
# verdict" — which prices a spurious match at exactly one consultation
# deliberately, and one consultation is the entire measured cost so far.
# `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:35`
# Reopen trigger: a spurious match whose discharge cost more than its one
# consultation, or a second instance whose matching text is the COMMIT prose
# rather than the PR body — the latter would falsify the compound-source
# reading above rather than merely add a count to it.
#
# THAT TRIGGER'S SECOND LIMB IS NOT READABLE FROM THIS CHECK'S OUTPUT, so the
# act that reads it is named here rather than left to be invented. Because
# `changed text` is a compound (below), a report of `matched on '<term>' in
# changed text` does not say which half matched. Re-run the same range with
# `CONSULT_PR_BODY` unset: if the match survives, the matching text is the
# COMMIT prose and the limb has fired; if the run reports `no mapped boundary
# matched`, the match came from the PR body and the reading above holds. A
# trigger whose observation needs a step nobody wrote down fires never.
#
# THE SECOND LIMB HAS FIRED — PR #159, recorded here rather than left to the
# next reader to rediscover (kogaki#160 finding 1). Entry 1 matched on `check`;
# with `CONSULT_PR_BODY` unset the match SURVIVED; the commit prose carried the
# term. The limb's own wording is met.
#
# AND IT IS A WEAKER INSTANCE THAN THE LIMB'S WORDING IMPLIES. The match was
# OVER-DETERMINED, not localised: #158's issue body independently carries
# `check-consult-receipts.sh`, and `term_pattern("check")`'s word bound
# (`:327-330`) is satisfied by the hyphen — verified by executing the pattern
# against that string, not by re-reading prose. `match_boundaries` iterates the
# source list in fixed order and `break`s at the first hit (`:342`), and the
# order is `diff paths`, `changed text`, `linked issue body` (`:454-456`), so a
# hit in `changed text` MASKS the linked issue body entirely. The receipt was
# therefore owed unavoidably — no rewording of any commit could have dodged it.
#
# WHAT THE ABLATION ACT ABOVE CAN AND CANNOT SEE, stated so the record does not
# install a false confidence in the instrument. It CAN discriminate commit
# prose from PR body: `changed text` is exactly those two, so ablating one
# separates them validly, and a review report characterising the act as one
# that "provably cannot discriminate" is too strong and is not carried here.
# What it CANNOT see is over-determination by a third source, because the
# `break` has already discarded it. So the limb fired on a match the act reads
# correctly as commit-prose-carrying and cannot establish was commit-prose-ONLY.
# The compound-source reading is not falsified by this instance; it is not
# confirmed by it either, and the count now stands at one.
#
# THE COUNT NOW STANDS AT TWO — PR #421, measured 2026-08-13 by running the
# ablation act above rather than by reading prose (kogaki#187). Over
# `59a04ce..7667ba8`:
#
#   with CONSULT_PR_BODY   #1 matched on 'check' in changed text
#   with CONSULT_PR_BODY=  #1 matched on 'lint'  in changed text   <- SURVIVED
#
# The match survived the ablation, so the matching text is the COMMIT prose and
# the second limb's own wording — "a second instance whose matching text is the
# COMMIT prose rather than the PR body" — is now MET IN FULL. kogaki#187 is
# unparked on this measurement.
#
# AND THE INSTANCE FALSIFIES THE ONE REMEDY STILL ON THE TABLE, which is the
# part worth carrying forward. kogaki#187 offered a mechanical, judgment-free
# narrowing: exclude a term occurrence that is a bare path/filename mention
# inside prose. The surviving term is `lint`, and the prose carrying it is
# `7667ba8`'s commit message declaring that NO lint exists — "§4.6 and §6.9.2
# both exclude lint", "nothing here detects a violation". That is not a path
# and not a filename, so the offered narrowing would not have caught the
# specimen that fired the trigger.
#
# The mention-vs-use gap is therefore SHARPER than the filing framed it:
# **prose declaring a boundary's ABSENCE matches the trigger term for crossing
# it**, and the two other candidate remedies (weighting the sources;
# per-term source scoping) are each declined twice on the record above and are
# NOT reopened here. Choosing among what remains is a design act with no
# obvious mechanical answer, so it is escalated to a spec sitting on kogaki#187
# rather than decided by the run that measured it.
#
# A THIRD INSTANCE, AND ITS SPURIOUSNESS IS CONTESTABLE RATHER THAN OUT OF
# SCOPE. The commit that wrote the paragraph above itself matched entry 3 —
# `#3 Record disposition ... (matched on 'declined' in changed text)` — on its
# own prose, "are each declined twice on the record". That is commit prose and
# not the PR body, so the second limb's wording DOES reach it.
#
# It is recorded here separately rather than folded into the count, and the
# ground is NOT that the limb misses it. The ground is that the match may not
# be spurious at all: entry 3's act class is "adopting one record as the live
# word on what a decision decided", and that commit does adopt a reading of
# what the two prior declines decided and of what the park's limb decided.
# Whether that is a use or a mention is precisely the ambiguity kogaki#187
# exists to name, so this instance cannot be counted without deciding the
# question the count is evidence FOR.
#
# The earlier framing — that the limb was "about commit-prose versus PR body
# and this is a separate observation" — was wrong on its own terms and is
# withdrawn. Recorded because an instance of this very class surviving only in
# a PR body, while the durable comment block omits it, would be the defect
# this block exists to prevent.
#
# THE REMEDY QUESTION IS ANSWERED, AND THE ANSWER IS NO — kogaki#187 ANSWERED
# 2026-08-13 by owner selection at the `/ship-cycle 187` gate, on measurement
# rather than on argument. The close is left to the act that performs it; this
# block records the answer, never the issue's state. Three
# candidate narrowings were put to the specimens; all three failed, and the
# measurements are recorded here so the next sitting inherits them rather than
# re-deriving them.
#
#   CANDIDATE 1 — exclude a bare path/filename mention inside prose.
#     This is the remedy kogaki#187 itself offered. FALSIFIED by the specimen
#     that fired its own trigger: the surviving term was `lint`, carried by
#     "§4.6 and §6.9.2 both exclude lint" — neither a path nor a filename.
#
#   CANDIDATE 2 — strip fenced blocks and inline code spans before matching,
#     mirroring `count_receipts()` below, which is the precedent kogaki#187
#     cites in its own body. MEASURED AND REJECTED: over `59a04ce..7667ba8`
#     the strip changes nothing, because `lint` and `declined` both sit in
#     plain prose. The precedent is real and does not reach this class.
#
#   CANDIDATE 3 — narrow the commit half of `changed text` from `%B` to `%s`,
#     so only the subject line is matched. This one WORKS on the specimens:
#     both false positives vanish over `59a04ce..7667ba8`. THAT specimen run is
#     the whole of the evidence for it.
#
#     The fixtures below also pass 10/10 with the one-word change applied, and
#     that figure is INSENSITIVE rather than confirming: `%B` is read only on
#     the live pass (:532, :536), while the ten cases hand `ftext` straight to
#     `match_boundaries` and never invoke `git log`, so they pass under the
#     change BY CONSTRUCTION. Recorded because the first draft of this block
#     offered the 10/10 as evidence the candidate works — a pass whose only
#     demonstrated failure mode is unrelated to the change discriminates
#     nothing, which is this file's own subject arriving in its own argument.
#
#     IT IS REJECTED ANYWAY, and the reason is the finding.
#
#     Entry 3 matched `declined` in a commit BODY on PR #421, and that match
#     was a TRUE POSITIVE — the round-1 review judged §4.9.1 to be adopting
#     four dispositions into a spec, which is entry 3's act class exactly, and
#     the consultation it forced found a real defect (the clause restated four
#     records it does not own and declared precedence for none). Under
#     candidate 3 that match returns EMPTY. Entry 1 would have survived on
#     `diff paths`; entry 3 has no path-shaped backstop and would simply have
#     gone dark.
#
#     So candidate 3 buys a false positive priced at ONE CONSULTATION by
#     selling a false negative, and a missed consultation is the more
#     expensive half. The three-instruments split says so in as many words —
#     "a stale map costs a missed consultation, a missing receipt costs an
#     unverifiable claim that one happened, and an absent baseline costs an
#     undetectable gap" —
#     `consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/knowledge-architecture.md:68`
#
# WHAT THE ANSWER RESTS ON, so it is not re-opened as a preference. The
# accretion polarity's own survival condition was TESTED here rather than
# re-derived, which is what the served line demands of any sitting that quotes
# it: "the discharging act must be CHEAP and AVAILABLE TO THE PARTY THE GATE
# BLOCKS ... THE CONJUNCT, NEVER THE POLARITY, is what that sitting must test".
# Three fresh specimens — PR #418 round 1, PR #421 rounds 1 and 2 — were each
# discharged by the reviewer's own judgment in a disclosure paragraph, with
# ZERO consultations performed, no owner ruling and no third-party verdict.
# The conjunct holds, so the polarity carries and the pricing stands.
# `consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/knowledge-architecture.md:47`
#
# THE COUNT LIMB STAYS SPENT AND IS NOT RE-ARMED. It fired, it was measured,
# and what it bought was this answer rather than a fix — which is the honest
# outcome of a trigger doing its job. A future sitting that wants to reopen
# needs the OTHER limb: a spurious match whose discharge actually costs a
# consultation, which is the condition the conjunct names.
#
# THE DENOMINATOR, enumerated rather than asserted. FOUR spurious instances are
# recorded in this block: PR #182 (entry 1, PR-body prose, the origin), PR #159
# (entry 1, commit prose, ablation-confirmed), PR #421's `lint` (entry 1,
# commit prose, ablation-confirmed), and the entry-3 self-match recorded above.
# None cost a consultation. PR #421's `declined` body match is NOT a member —
# this block calls it a TRUE POSITIVE — so it is counted in neither figure, and
# the two counts are named apart here rather than left to a reader to separate.
#
# THE SOURCE SET IS DECLARED, AND SO IS WHAT IT COULD NOT READ. Trigger terms
# match against diff paths, changed text (commit messages and the PR body), and
# the linked issue body. Where a source is unavailable the check SAYS SO rather
# than reporting a clean pass over a smaller denominator — an instrument that
# reports absence without establishing it is the defect
# the review lane refuses one layer up — carried by claude-toolkit's engine
# since kogaki#630 retired `check-review-report.sh` with the stack.
#
# THE MIDDLE SOURCE IS A COMPOUND AND THE OUTPUT DOES NOT SAY SO. `changed text`
# is `BOUNDARY_TEXT="$commits\n$body"`, so three DECLARED sources are reported
# as two labels and a match on the PR body is indistinguishable from a match on
# the commit prose. This is stated rather than repaired: reporting the halves
# separately is a change to what the instrument SAYS, which kogaki#126 left
# untouched along with the matcher, and the measured instance recorded above is
# the reason a later reader needs to know the label is lossy.
#
# The linked issue is the one named by a LICENSING KEYWORD (`Closes`, `Fixes`,
# `Resolves`, `License:`), bare or repo-qualified. A loose `#N` anywhere is
# deliberately not followed: this repository's bodies reference issues they are
# not licensed by, and fetching one of those would widen the match surface with
# text the change has no relationship to — a false-positive class that is NOT
# the accepted one, since no act of the author's discharges it.
#
# Tier is `ci`: the PR body and the linked issue are part of the substrate, and
# neither exists at push time. A check's position in the loop is a cost
# decision (`a-checks-runtime-multiplies-by-its-loop-position`).
set -euo pipefail
# Captured BEFORE the cd, because the span fixture's end-to-end arm re-runs
# this same file inside a scratch repository (kogaki#264).
SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
cd "$(dirname "$0")/.."

MAP="policy/consultation-map.md"

# Commit range: CI supplies the base; locally fall back to the default branch.
# Same resolution as check-consult-receipts.sh, which is deliberate — the two
# checks read the same branch and disagreeing about what "this branch" means
# would be a defect neither could see.
BASE="${CONSULT_BASE_SHA:-}"
HEAD_REF="${CONSULT_HEAD_SHA:-HEAD}"
if [ -z "$BASE" ]; then
  BASE="$(git merge-base origin/master "$HEAD_REF" 2>/dev/null \
          || git merge-base master "$HEAD_REF" 2>/dev/null || true)"
fi

# THE PATH SET IS COMPUTED AT THE FORK POINT, NEVER AT THE BASE BRANCH'S TIP
# (kogaki#264). What CI supplies is `github.event.pull_request.base.sha` —
# master's tip AT EVENT TIME, not the point this branch forked from — and
# `git diff A..B` is not a range: git reads it as plain `git diff A B`, a
# tree-to-tree comparison. So every file that landed on master AFTER this
# branch forked entered the path set as the reverse delta, and the check
# reported a mapped-boundary match, at DENY severity, naming a file the branch
# never touched. The two neighbouring lines read the SAME string as a genuine
# range (`git log`, `git rev-list` both do), which is why the report looked
# credible: it printed a commit count computed as a range beside a path set
# computed as a tree diff, and the count was right.
#
# Observed live: PR #261 (one story file) failed on `check` in DIFF PATHS three
# and a half minutes after PR #254 merged `checks/check-terrain-composition.sh`
# to master. `git diff --name-only 4926043..1a58df3a` yields four files;
# `git diff --name-only 7a441d0..1a58df3a`, at the true fork point, yields the
# one story file the branch changed. The discharge was a rebase, which is
# consistent — after a rebase `base.sha` IS the fork point.
#
# THE REPAIR IS SITED HERE AND NOT IN THE WORKFLOW, stated because the choice
# is not obvious. `base.sha` is a truthful name for a truthful value, and the
# workflow's other consumers of it — `check-consult-receipts.sh` and the
# `license-assertion` job — read it only through `git log` / `git rev-list`,
# where a tip and a fork point produce the SAME commit set and there is nothing
# to fix. Recomputing the variable in YAML would change what a correctly-named
# input means for every reader in order to repair the one reader that misreads
# it, and no fixture in this repository can see a YAML expression. The defect
# is the single line that read a range operator as a diff argument; it is
# repaired where a fixture can watch it, immediately below.
#
# THIS DOES NOT REOPEN THE kogaki#126 DECLINE recorded above. That decline —
# "narrow the match to diff paths alone" — rests on path matches being the
# RELIABLE signal. This defect poisoned exactly that signal, so repairing the
# span strengthens the decline rather than reopening it, and no judgment clause
# is added: the matcher, the sources and the output vocabulary are untouched.
# It is also NOT the base-dependence note at `:91-93`, which is about
# `git merge-base` resolving differently when a MERGED branch is re-run locally
# — a retrospective artifact. This was a live false positive on an OPEN PR.

# The fork point of HEAD from BASE. Fails (rather than substituting a
# plausible sha) when the two histories have no common ancestor, so the caller
# can SAY it could not establish the span instead of reporting over a wider one.
_fork_point() { git merge-base "$1" "$2" 2>/dev/null; }

# The files THIS BRANCH changed. Equivalent to `git diff A...B` and written the
# long way on purpose: the three-dot form is one keystroke from the two-dot
# form that caused the defect, and the no-merge-base case has to be visible.
_branch_paths() { # base, head
  local _f
  _f="$(_fork_point "$1" "$2")" || _f="$1"
  git diff --name-only "$_f" "$2" 2>/dev/null || true
}

# --- span fixture (kogaki#264) ---------------------------------------------
# THE PROPERTY'S UNIT IS A TWO-BRANCH HISTORY, so the detector's is too
# (`match-the-detectors-unit-to-the-propertys-unit`): no fixture over synthetic
# text can display "the path set contains another branch's file", because the
# thing that produced it is git's reading of an argument. This constructs the
# reproduction in a scratch repository — a fork point, a branch touching one
# story file, and a base branch that then advances with a check-touching commit
# — and asserts BOTH arms: the naive two-dot form MUST still pull the foreign
# file in (if it stops doing so, the premise moved and this fixture says so
# rather than passing quietly), and `_branch_paths` MUST NOT. Reverting the
# repair fails the second arm. Runs on every invocation, needs no network, and
# builds its own repository so it is intact where the surrounding checkout is
# not. Construction failure FAILS rather than skipping: a guard that reports
# nothing when it could not look is the shape this file refuses elsewhere.
_span_fixture() {
  local tmp rc=0
  tmp="$(mktemp -d 2>/dev/null)" || {
    echo "FAIL: the span fixture could not create a scratch directory" >&2
    return 1
  }
  (
    unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE
    cd "$tmp" || exit 1
    git init -q . >/dev/null 2>&1 || exit 1
    git config user.email fixture@example.invalid
    git config user.name 'span fixture'
    mkdir -p docs checks
    echo one > docs/story.md
    echo one > checks/check-other.sh
    git add -A >/dev/null 2>&1
    git commit -qm 'the fork point' >/dev/null 2>&1 || exit 1
    trunk="$(git rev-parse --abbrev-ref HEAD)"

    # The branch under test: one story file, no check touched anywhere.
    git checkout -qb under-test >/dev/null 2>&1 || exit 1
    echo two > docs/story.md
    git commit -qam 'the branch under test: one story file' >/dev/null 2>&1 || exit 1
    head="$(git rev-parse HEAD)"

    # The base branch then advances — ANOTHER branch's check-touching merge.
    git checkout -q "$trunk" >/dev/null 2>&1 || exit 1
    echo two > checks/check-other.sh
    git commit -qam "another branch's check lands on the base branch" \
      >/dev/null 2>&1 || exit 1
    tip="$(git rev-parse HEAD)"

    fail=0
    # Arm 1 — the control. The defect's mechanism must still be present, or
    # this fixture is asserting nothing.
    naive="$(git diff --name-only "$tip..$head" | sort | tr '\n' ' ')"
    case "$naive" in
      *checks/check-other.sh*) : ;;
      *) echo "FAIL span fixture [control]: the two-dot form no longer pulls" \
              "the base branch's own file in — got '$naive'. git's reading of" \
              "A..B changed; re-derive the defect before trusting arm 2." >&2
         fail=1 ;;
    esac
    # Arm 2 — the repair. The branch's set is the branch's own.
    got="$(_branch_paths "$tip" "$head" | sort | tr '\n' ' ')"
    if [ "$got" != "docs/story.md " ]; then
      echo "FAIL span fixture [advanced base]: got '$got', want" \
           "'docs/story.md ' — the path set is being computed at the base" \
           "branch's TIP rather than at the fork point (kogaki#264)." >&2
      fail=1
    fi
    # Arm 3 — no regression when the base IS the fork point, which is the
    # only case the pre-repair form got right and the one a rebase produces.
    fork="$(git rev-parse "$trunk"^)"
    got="$(_branch_paths "$fork" "$head" | sort | tr '\n' ' ')"
    if [ "$got" != "docs/story.md " ]; then
      echo "FAIL span fixture [base == fork point]: got '$got', want" \
           "'docs/story.md '" >&2
      fail=1
    fi
    # Arm 5 — THE LIVE LINE, END TO END, because arms 1-3 exercise
    # `_branch_paths` and NOTHING IN THEM NOTICES IF THE LIVE SITE STOPS
    # CALLING IT. That mutation — the live `paths=` assignment reverting to the
    # two-dot form — reinstates the defect verbatim while every helper-level
    # arm stays green, which is the fixture-tests-the-helper-not-the-product
    # shape this repository has shipped before. So this arm runs THIS FILE, in
    # CI shape (`CONSULT_BASE_SHA` = a base branch tip that has advanced),
    # against the scratch history, and asserts BOTH directions: clean on the
    # branch that touched no check, and FAILING on one that did — an arm never
    # seen to fail is not evidence.
    if [ -z "${BOUNDARY_SPAN_FIXTURE_INNER:-}" ]; then
      mkdir -p checks policy
      cp "$SELF" checks/inner.sh
      {
        echo '### 1. Check/CI infrastructure'
        echo
        echo '- **Trigger terms:** check'
        echo '- **Read prescription:** irrelevant here.'
      } > policy/consultation-map.md
      _inner() { # base, head
        BOUNDARY_SPAN_FIXTURE_INNER=1 BOUNDARY_SKIP_ISSUE_LOOKUP=1 \
        CONSULT_BASE_SHA="$1" CONSULT_HEAD_SHA="$2" CONSULT_PR_BODY= \
          bash checks/inner.sh >/dev/null 2>&1
      }
      # (a) The reproduction. Base has advanced past the fork with a
      # check-touching commit; the branch itself touched one story file and
      # carries no receipt. Before the repair this exited 1 — the live CI
      # false positive, whole.
      if ! _inner "$tip" "$head"; then
        echo "FAIL span fixture [end to end]: the check FAILED on a branch" \
             "that touched no check file — the base branch's own commit is" \
             "still entering the path set at the live site (kogaki#264)" >&2
        fail=1
      fi
      # (b) The instrument fires. A branch that really does touch a check,
      # with no receipt, must still be refused; otherwise (a) passes because
      # the gate stopped working rather than because the span got fixed.
      if _inner "$fork" "$tip"; then
        echo "FAIL span fixture [end to end, negative control]: the check" \
             "PASSED a branch that really does modify a check file with no" \
             "receipt — arm (a) proves nothing" >&2
        fail=1
      fi
    fi

    # Arm 4 — the degradation path is EXERCISED, not merely declared. With no
    # common ancestor there is no fork point, and `_branch_paths` falls back to
    # the base rather than to an empty set: a check that reported no changed
    # paths because it could not find a span would be reporting absence it
    # never established. An orphan branch is the only way to reach the fallback,
    # so without this arm any mutation of it survives the whole suite.
    git checkout -q --orphan unrelated >/dev/null 2>&1 || exit 1
    git rm -rqf . >/dev/null 2>&1 || true
    echo one > unrelated.md
    git add -A >/dev/null 2>&1
    git commit -qm 'an unrelated history' >/dev/null 2>&1 || exit 1
    orphan="$(git rev-parse HEAD)"
    if git merge-base "$orphan" "$head" >/dev/null 2>&1; then
      echo "FAIL span fixture [no merge base]: the orphan branch shares an" \
           "ancestor with the branch under test, so this arm tests nothing" >&2
      fail=1
    fi
    got="$(_branch_paths "$orphan" "$head" | sort | tr '\n' ' ')"
    case "$got" in
      *docs/story.md*) : ;;
      *) echo "FAIL span fixture [no merge base]: got '$got' — with no common" \
              "ancestor the fallback must still report the branch's files" \
              "against the base, never an empty set" >&2
         fail=1 ;;
    esac
    exit "$fail"
  ) || rc=1
  rm -rf "$tmp"
  return "$rc"
}
if [ -n "${BOUNDARY_SPAN_FIXTURE_INNER:-}" ]; then
  # This IS an inner run of arm 5. Its job is the live path below; re-running
  # the arms here would recurse one level and buy nothing.
  echo "span fixture: skipped (this run IS arm 5's inner invocation)"
else
_span_fixture || { echo "FAIL: the span is not the branch's own" >&2; exit 1; }
echo "span fixture: 5/5 fork-point cases (control: the two-dot form still" \
     "pulls in a foreign file; advanced base excludes it; base == fork point" \
     "unchanged; no merge base falls back rather than reporting empty; and END" \
     "TO END — this file, run in CI shape over that scratch history, is clean" \
     "on a branch that touched no check and still refuses one that did)"
fi

if [ -n "$BASE" ]; then
  if FORK="$(_fork_point "$BASE" "$HEAD_REF")"; then
    _base_sha="$(git rev-parse "$BASE" 2>/dev/null || printf '%s' "$BASE")"
    if [ "$FORK" = "$_base_sha" ]; then
      span_note="fork point $(git rev-parse --short "$FORK") == the supplied base"
    else
      span_note="fork point $(git rev-parse --short "$FORK"); the supplied \
base $(git rev-parse --short "$_base_sha" 2>/dev/null || printf '%s' "$_base_sha") \
has ADVANCED since the fork, so the paths below are this branch's own and not \
the base branch's"
    fi
  else
    FORK="$BASE"
    span_note="NO MERGE BASE with $BASE — the paths below are a tree diff \
against it and MAY NAME FILES THIS BRANCH NEVER TOUCHED"
  fi
  # Paths, commits and count all read the SAME span. Before kogaki#264 the
  # first was a tree diff while the other two were ranges.
  paths="$(_branch_paths "$BASE" "$HEAD_REF")"
  commits="$(git log --format='%B' "$FORK..$HEAD_REF" 2>/dev/null || true)"
  range_desc="$(git rev-list --count "$FORK..$HEAD_REF" 2>/dev/null || echo 0) commit(s) since the $span_note"
else
  paths="$(git show --name-only --format= "$HEAD_REF" 2>/dev/null || true)"
  commits="$(git log -1 --format='%B' "$HEAD_REF")"
  range_desc="1 commit (no merge base found)"
fi

body="${CONSULT_PR_BODY:-}"
# THE PR BODY IS A DECLARED SOURCE AND ITS ABSENCE IS REPORTED (kogaki#69).
# It arrives only through CONSULT_PR_BODY, which CI supplies on a
# `pull_request` event and which is EMPTY on a push event and on every local
# invocation — there is no `gh pr view` fallback, deliberately, since this
# check runs where `gh` may be absent. What was wrong is not the emptiness but
# the REPORTING of it: an unread source folded silently into
# "no linked issue named in the PR body or commits", which is a claim about the
# world produced by having read nothing. The check already carries the right
# vocabulary for its other two sources ("not supplied", "NOT READ"); the third
# had none, so its unavailability was indistinguishable from a real absence.
# specs/SPEC.md §4's three-valued discipline is the rule being honoured here:
# absence is honest only when the source was consulted.
if [ -n "$body" ]; then
  body_note="supplied"
else
  body_note="NOT SUPPLIED (CONSULT_PR_BODY unset — normal on a push event and on a local run)"
fi

# The linked issue body — the third declared source. Supplied directly when the
# caller has it; otherwise resolved from the licensing issue named in the PR
# body or commits, and only when `gh` can actually look. Unavailability is
# REPORTED below, never silently treated as an empty source.
# --- resolver fixture (kogaki#69) ------------------------------------------
# The keyword resolver is shell, so it gets a shell fixture: the python
# FIXTURES block below covers the binding, and covered NOTHING here — which is
# how a keyword the repository uses 13 times in 25 commits stayed invisible.
# Runs on every invocation, like the python pass, because a fixture behind a
# flag is one nobody runs.
_resolve() {
  printf '%s\n' "$1" \
    | grep -oiE '(closes|fixes|resolves|license|refs):?[[:space:]]*[A-Za-z0-9_.-]*#[0-9]+' \
    | grep -oE '#[0-9]+' | grep -oE '[0-9]+' | head -1 || true
}
_rfail=0
_rcheck() { # text, want, label
  got="$(_resolve "$1")"
  if [ "$got" != "$2" ]; then
    echo "FAIL resolver fixture [$3]: got '${got:-<empty>}', want '${2:-<empty>}'" >&2
    _rfail=1
  fi
}
_rcheck 'Closes #65.'           65 'bare Closes (PR body form)'
_rcheck 'Refs kogaki#65.'       65 'Refs qualified — the form lint-commit-msg drives authors to'
_rcheck 'refs kogaki#7'         7  'Refs lowercase'
_rcheck 'License: kogaki#29'    29 'License qualified'
_rcheck 'Fixes #12'             12 'Fixes'
_rcheck 'Resolves kogaki#3'     3  'Resolves qualified'
_rcheck 'see kogaki#99 for why' "" 'a bare mention is NOT a licensing reference'
_rcheck 'refactored the parser' "" 'refactor must not match refs'
[ "$_rfail" -eq 0 ] || { echo "FAIL: the licensing-reference resolver does not discriminate" >&2; exit 1; }
echo "resolver pass: 8/8 licensing-reference cases (closes/fixes/resolves/license/refs, bare and qualified, mention, word-bound)"

issue_body="${BOUNDARY_ISSUE_BODY:-}"
issue_note="not supplied"
if [ -n "$issue_body" ]; then
  issue_note="supplied by the caller"
elif [ "${BOUNDARY_SKIP_ISSUE_LOOKUP:-}" = "1" ]; then
  issue_note="lookup skipped (BOUNDARY_SKIP_ISSUE_LOOKUP=1)"
else
  # The licensing reference is written both bare (`Closes #29`) and
  # repo-qualified (`License: kogaki#29`) in this repository's history, so the
  # owner token between the keyword and the number is optional. Matching only
  # the bare form silently dropped the third declared source on every commit
  # that used the qualified one — a source reported as "not named" when it was
  # named, which is the reporting defect this check refuses elsewhere.
  #
  # `refs` IS IN THE LIST BECAUSE TWO OF THIS REPOSITORY'S CONTROLS DISAGREED
  # WITHOUT IT (kogaki#69). `story-sync lint-commit-msg` DENIES a close keyword
  # not backed by an approved-closes receipt, so authors write `Refs kogaki#N`
  # — measured over the 25 commits before this one, `Refs` appears 13 times
  # against `Closes` 4 and `License:` 6, making it the MOST COMMON licensing
  # reference in the repository and the one form this check could not see. One
  # control drove the convention while another refused to recognise it, and
  # neither could observe the disagreement: the lint passes, the check reports
  # "no linked issue named", and both are behaving as written.
  _n="$(printf '%s\n%s\n' "$body" "$commits" \
        | grep -oiE '(closes|fixes|resolves|license|refs):?[[:space:]]*[A-Za-z0-9_.-]*#[0-9]+' \
        | grep -oE '#[0-9]+' | grep -oE '[0-9]+' | head -1 || true)"
  if [ -z "$_n" ]; then
    # The note names WHAT WAS SEARCHED, never more. Saying "in the PR body or
    # commits" while the body was never supplied is the world-claim this issue
    # was filed over, one field down from the body note above.
    if [ -n "$body" ]; then
      issue_note="no linked issue named in the PR body or commits"
    else
      issue_note="no linked issue named in the commits (PR body NOT SUPPLIED, so not searched)"
    fi
  elif ! command -v gh >/dev/null 2>&1; then
    issue_note="issue #$_n named but gh is not available — NOT READ"
  elif issue_body="$(gh issue view "$_n" --json body -q .body 2>/dev/null)"; then
    issue_note="issue #$_n"
  else
    issue_body=""
    issue_note="issue #$_n named but the gh lookup FAILED — NOT READ"
  fi
fi

BOUNDARY_MAP="$MAP" \
BOUNDARY_PATHS="$paths" \
BOUNDARY_TEXT="$commits
$body" \
BOUNDARY_ISSUE="$issue_body" \
BOUNDARY_ISSUE_NOTE="$issue_note" \
BOUNDARY_BODY_NOTE="$body_note" \
BOUNDARY_RANGE="$range_desc" \
python3 <<'EOF'
import os, re, sys

# --- the map's declared enumeration -----------------------------------------
# An entry is `### <n>. <title>` plus a `- **Trigger terms:** ...` field, whose
# value may wrap across lines until the next `- **Field:**` bullet.
ENTRY = re.compile(r'^###\s+(\d+)\.\s+(.+?)\s*$', re.MULTILINE)
TRIGGER = re.compile(
    r'^-\s+\*\*Trigger terms:\*\*\s*(.*?)(?=^\s*-\s+\*\*|\Z)',
    re.MULTILINE | re.DOTALL)

# --- the branch's receipts ---------------------------------------------------
# LINE ONE ONLY. Nothing below reads a continuation line, which is what makes
# the outcome-invariance clause structural rather than a promise.
RECEIPT = re.compile(r'^\s*consulted:\s*\S+@[0-9a-f]{7,40}\s+\S', re.MULTILINE)
# A fenced block is quotation (mention), never emission (use) — kogaki#41, the
# PR #40 false positive. Same rule as check-consult-receipts.sh: a spec or PR
# body documenting the grammar is the one text guaranteed to contain
# non-receipt matches. An unclosed fence strips to end of text.
FENCE = re.compile(r'^[ \t]*(`{3,}|~{3,}).*?(?:^[ \t]*\1[ \t]*$|\Z)',
                   re.MULTILINE | re.DOTALL)


def parse_map(text):
    """Return [(number, title, [terms])] — the declared boundary enumeration."""
    entries = []
    marks = list(ENTRY.finditer(text))
    for i, m in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
        section = text[m.start():end]
        t = TRIGGER.search(section)
        if not t:
            continue
        raw = ' '.join(t.group(1).split())
        terms = [x.strip() for x in raw.split(',') if x.strip()]
        entries.append((m.group(1), m.group(2), terms))
    return entries


def term_pattern(term):
    """Word-bounded, case-insensitive, whitespace-tolerant.

    Bounded on both ends because a bare substring match makes short terms
    ('CI', 'gate') fire on 'specific' and 'delegate' — a false-positive class
    that is not the accepted one. The accepted class is a term genuinely
    present but incidental; a term that is not present at all must never match.
    """
    return re.compile(
        r'(?<![A-Za-z0-9_])' + r'\s+'.join(re.escape(w) for w in term.split())
        + r'(?![A-Za-z0-9_])', re.IGNORECASE)


def match_boundaries(entries, sources):
    """Return [(number, title, [(term, source_name)])] for matched entries."""
    matched = []
    for number, title, terms in entries:
        hits = []
        for term in terms:
            pat = term_pattern(term)
            for name, text in sources:
                if text and pat.search(text):
                    hits.append((term, name))
                    break
        if hits:
            matched.append((number, title, hits))
    return matched


def count_receipts(text):
    """Receipts present on the branch, mentions excluded."""
    return len(RECEIPT.findall(FENCE.sub('', text or '')))


# ---------------------------------------------------------------------------
# Fixture pass — the discrimination evidence, run every invocation and needing
# no network. BOTH discriminating cases are exercised: a matched boundary with
# a receipt (passes) and a matched boundary with none (fails). A gate whose
# failing path is never fired is the orphan-guard shape kogaki#6 was filed to
# end. The fixture map is synthetic so the fixtures do not move when the real
# map gains an entry.
# ---------------------------------------------------------------------------
FIXTURE_MAP = """
### 1. Check/CI infrastructure

- **Trigger terms:** check, registry, gate script
- **Read prescription:** irrelevant here.

### 2. Reading substrate state

- **Trigger terms:** access log, consult evidence
- **Read prescription:** irrelevant here.
"""
RECEIPT_LINE = "consulted: product-lab@0123abc topics/example.md:1"
V2_RECEIPT = (RECEIPT_LINE + "\n  request_id: r\n"
              "  outcome: uncovered-after-2-framings\n"
              "  query: first\n  query: second\n")
FENCED_ONLY = "```\nconsulted: <repo>@<sha> <file:line>\n```\n"

FIXTURE_ENTRIES = parse_map(FIXTURE_MAP)

# (name, paths, text, issue, want_matched_numbers, want_receipts)
FIXTURES = [
    ("no boundary matched: clean branch, no receipt needed",
     "docs/readme.md", "prose about nothing mapped", "", [], 0),
    ("matched by diff path + receipt present: passes",
     "checks/check-thing.sh", RECEIPT_LINE, "", ["1"], 1),
    ("matched by diff path, ZERO receipts: this is the failing case",
     "checks/check-thing.sh", "implement the thing", "", ["1"], 0),
    ("matched by changed text alone (no path signal) still binds",
     "docs/readme.md", "touches the registry shape", "", ["1"], 0),
    ("matched by the linked issue body alone still binds",
     "docs/readme.md", "prose", "we should read the access log", ["2"], 0),
    ("outcome is never read: an `uncovered` receipt satisfies exactly as any",
     "checks/check-thing.sh", V2_RECEIPT, "", ["1"], 1),
    ("line one only: the continuation block is not required for presence",
     "checks/check-thing.sh", RECEIPT_LINE, "", ["1"], 1),
    ("a fenced receipt is a MENTION: matched boundary, zero receipts",
     "checks/check-thing.sh", FENCED_ONLY, "", ["1"], 0),
    ("two boundaries can match at once",
     "checks/check-thing.sh", "and the access log", "", ["1", "2"], 0),
    ("word-bounded: 'specific' does not fire the 'CI' class of substring hit",
     "docs/specific-notes.md", "a specification, delegated", "", [], 0),
]

failures = []
for name, fpaths, ftext, fissue, want_nums, want_receipts in FIXTURES:
    got = match_boundaries(FIXTURE_ENTRIES,
                           [("diff paths", fpaths), ("changed text", ftext),
                            ("linked issue body", fissue)])
    got_nums = [n for n, _, _ in got]
    got_receipts = count_receipts(ftext)
    if got_nums != want_nums or got_receipts != want_receipts:
        failures.append(f"{name}: got (boundaries={got_nums}, "
                        f"receipts={got_receipts}), want "
                        f"({want_nums}, {want_receipts})")

if failures:
    print("FAIL fixture pass — the binding does not discriminate:")
    for f in failures:
        print(f"  - {f}")
    sys.exit(1)
print(f"fixture pass: {len(FIXTURES)}/{len(FIXTURES)} discrimination cases "
      "(matched+receipt / matched+none, both fired; path, text and issue-body "
      "sources; outcome-invariance; line-one-only; use-vs-mention; word bounds)")

# ---------------------------------------------------------------------------
# The live pass.
# ---------------------------------------------------------------------------
map_path = os.environ["BOUNDARY_MAP"]
try:
    with open(map_path, encoding="utf-8") as fh:
        map_text = fh.read()
except OSError as exc:
    # COULD NOT ESTABLISH. The map is this check's own denominator, so a
    # missing one is not "no boundaries matched" — it is an instrument that
    # cannot look, and it does not get to report absence.
    print(f"FAIL could not establish the substrate: {map_path} unreadable "
          f"({exc}). A boundary set that cannot be read is not an empty one.")
    sys.exit(1)

entries = parse_map(map_text)
if not entries:
    print(f"FAIL could not establish the substrate: {map_path} declares no "
          "parseable entries. An empty parse of a non-empty map is a schema "
          "drift, not a clean branch.")
    sys.exit(1)

paths = os.environ.get("BOUNDARY_PATHS", "")
text = os.environ.get("BOUNDARY_TEXT", "")
issue = os.environ.get("BOUNDARY_ISSUE", "")
issue_note = os.environ.get("BOUNDARY_ISSUE_NOTE", "not supplied")
body_note = os.environ.get("BOUNDARY_BODY_NOTE", "not supplied")
rng = os.environ.get("BOUNDARY_RANGE", "unknown range")

matched = match_boundaries(entries, [("diff paths", paths),
                                     ("changed text", text),
                                     ("linked issue body", issue)])
receipts = count_receipts(text)

print(f"sources read: diff paths + changed text (commit messages) over {rng}; "
      f"PR body: {body_note}; linked issue body: {issue_note}")
print(f"boundaries declared: {len(entries)} in {map_path}")

if not matched:
    print(f"ok: no mapped boundary matched this branch; "
          f"{receipts} receipt(s) present (not required)")
    sys.exit(0)

names = "; ".join(
    f"#{n} {title} (matched on '{hits[0][0]}' in {hits[0][1]})"
    for n, title, hits in matched)

if receipts == 0:
    print(f"FAIL: {len(matched)} mapped boundary/boundaries matched this "
          f"branch and NO consult receipt is present — {names}.")
    print("The map binds at the merge layer: a touched boundary owes a "
          "consultation (specs/SPEC.md §4, kogaki#25). Record a receipt on "
          "the branch — line one is enough for this check:")
    print("  consulted: <repo>@<sha> <file:line>")
    print("Any ratified outcome satisfies it, `uncovered-after-N-framings` "
          "included: the obligation is to ask, never to have found. If the "
          "match is incidental, the receipt recording that you looked is "
          "still the discharge — that is the accepted cost of binding at "
          "gate severity.")
    sys.exit(1)

print(f"ok: {len(matched)} mapped boundary/boundaries matched and "
      f"{receipts} receipt(s) present — {names}")
print("not carried here, stated rather than implied: WHICH boundary each "
      "receipt covers. Line one names a pin, never a boundary, so one receipt "
      "satisfies every matched boundary on the branch; a PR touching two "
      "boundaries and consulting one passes. Reopen trigger in the header.")
print("also not carried here: whether the RIGHT question was asked — that is "
      "judgment and stays in the review lane.")
EOF
