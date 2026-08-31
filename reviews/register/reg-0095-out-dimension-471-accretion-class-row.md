---
id: reg-0095
status: pending
observed_at_pr: 471
observed_at_head:
class: out-of-dimension
recorded: 2026-08-16
source_comment: 5306209063
---
out-of-dimension: PR #471 — **accretion-class row** (an `out-of-dimension:` observation, countable toward rule 3's three-of-a-class trigger; not a spent-bound carry).

A PR whose base branch moved after the branch was cut leaves `gh pr view <n> --json baseRefOid` and the branch's own merge-base disagreeing — here `97981ad` (master's tip, not contained in the branch) versus `f563364`. A reviewer that follows the composition constraint literally and diffs two-dot against the declared base reviews the intervening merges *in reverse*: on this PR that was 540 deleted lines across three files for a diff whose actual content is +51 lines in one. The three-dot `gh pr diff <n>` is the honest read, and `review-base:` then records the merge-base rather than `baseRefOid` — which is also the value that survives the mandated post-squash rebase, since the recomputed diffs are byte-identical only against the base the review was actually taken at.

The lane's instructions and the spawn's composition constraint both point at `baseRefOid` for `review-base:` without naming this case, so the failure mode is a reviewer confidently reporting on a diff nobody wrote.
