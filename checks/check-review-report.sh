#!/usr/bin/env bash
# Review-report presence at the merge layer (specs/SPEC.md §4 PR-gate clause,
# kogaki#34; story 1.12, licensed by kogaki#36).
#
# WHAT THIS ENFORCES, AND WHAT IT ONLY STATES. The distinction is the point of
# the check, not a caveat on it.
#
#   ENFORCED — a review-lane report EXISTS for this PR's CURRENT head. That is
#   a computable fact about the PR, and its absence fails.
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
# It never reads the report's FINDINGS. Presence is mechanical, content is
# judgment, and a check that read the findings would be the
# judgment-in-the-mechanical-half defect §4 already refuses for the
# boundary-receipt binding.
#
# THE HEAD SHA IS PART OF PRESENCE, not decoration. A report written against
# an earlier push reviewed different code, so it is recorded as STALE rather
# than counted — `proposals-carry-the-state-they-were-computed-against` applied
# to the reviewing act.
#
# THREE-VALUED. No PR, no `gh`, or no network is CANNOT-DETERMINE and exits 0,
# never FAIL: a checker reporting absence without establishing that it looked
# in a real place gives an unfounded answer rather than a wrong one, and an
# unfounded answer agrees with everything (`establish-the-substrate-before-
# reporting`). CANNOT-DETERMINE is rendered separately from FAIL so a missing
# substrate is never spent as a positive finding.
#
# Tier is `ci` rather than `pre-push`: the substrate is a pull request, which
# does not exist at push time, and a check's position in the loop is a cost
# decision (`a-checks-runtime-multiplies-by-its-loop-position`).
set -euo pipefail
cd "$(dirname "$0")/.."

PR_NUMBER="${REVIEW_PR_NUMBER:-}"
HEAD_SHA="${REVIEW_HEAD_SHA:-}"
COMMENTS="${REVIEW_PR_COMMENTS:-}"

# Resolve from `gh` only when the caller did not supply the substrate. Every
# failure here is CANNOT-DETERMINE, never FAIL.
substrate_note=""
if [ -z "$PR_NUMBER" ]; then
  if command -v gh >/dev/null 2>&1; then
    PR_NUMBER="$(gh pr view --json number -q .number 2>/dev/null || true)"
  else
    substrate_note="gh is not available"
  fi
fi
if [ -n "$PR_NUMBER" ] && [ -z "$COMMENTS" ]; then
  COMMENTS="$(gh pr view "$PR_NUMBER" --json comments \
              -q '.comments[].body' 2>/dev/null || true)"
  [ -z "$HEAD_SHA" ] && HEAD_SHA="$(gh pr view "$PR_NUMBER" \
              --json headRefOid -q .headRefOid 2>/dev/null || true)"
fi
[ -z "$PR_NUMBER" ] && [ -z "$substrate_note" ] && \
  substrate_note="no pull request for this branch"

REVIEW_PR="$PR_NUMBER" REVIEW_HEAD="$HEAD_SHA" REVIEW_BODIES="$COMMENTS" \
REVIEW_NOTE="$substrate_note" python3 <<'EOF'
import os, re, sys

# A report's first line, fixed token and fixed position — the same discipline
# the consult receipt carries, and for the same reason: a report announced in
# whatever phrasing the sitting reaches for is invisible to anything looking
# for one.
REPORT = re.compile(r'^\s*review-lane report:\s*([0-9a-f]{7,40})\s*$',
                    re.MULTILINE)


def find_report(bodies, head):
    """Return ('present'|'stale'|'absent', shas_seen).

    `stale` means a report exists but names a different head: it reviewed code
    this PR no longer proposes, so it is not presence for THIS head.
    """
    shas = [m.group(1) for m in REPORT.finditer(bodies or '')]
    if not shas:
        return 'absent', []
    if head and any(head.startswith(s) or s.startswith(head) for s in shas):
        return 'present', shas
    return ('stale', shas) if head else ('present', shas)


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
      "(present / absent / stale-head / token-vs-prose)")

# ---------------------------------------------------------------------------
# The live pass.
# ---------------------------------------------------------------------------
pr = os.environ.get("REVIEW_PR", "")
head = os.environ.get("REVIEW_HEAD", "")
note = os.environ.get("REVIEW_NOTE", "")

if not pr:
    print(f"CANNOT-DETERMINE: {note or 'no substrate'} — this check asserts a "
          "report's presence ON A PULL REQUEST and reports nothing when there "
          "is no pull request to look at. Not a pass and not a failure.")
    sys.exit(0)

state, shas = find_report(os.environ.get("REVIEW_BODIES", ""), head)
if state == 'present':
    print(f"ok: review-lane report present on PR #{pr} for head {head[:7]}")
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
