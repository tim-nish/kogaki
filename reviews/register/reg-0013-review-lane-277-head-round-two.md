---
id: reg-0013
status: pending
observed_at_pr: 277
observed_at_head: f2f1012
class:
recorded: 2026-08-08
source_comment: 5224941593
---
From the review lane, PR #277 (head `f2f1012`), round 1. Two findings left open at
`should` with `carried: register`. Register is OPEN, checked before appending.

**1. A scratch-repository fixture inherits the invoking machine's global git config.**
`checks/check-boundary-receipts.sh`'s new span fixture unsets `GIT_DIR`/`GIT_WORK_TREE`/
`GIT_INDEX_FILE` but not `~/.gitconfig`, so a contributor with `commit.gpgsign = true`
and no usable key, or a global `core.hooksPath` with a failing `pre-commit`, gets a
deny-severity `FAIL: the span is not the branch's own` caused by their own config rather
than by the branch. Invisible in CI, which has no global config. `git init` currently
appears exactly once in `checks/`, so the population is one and there is no convention
to point at — which is why it goes here rather than becoming an issue. **The class to
count: a fixture that builds its own git repository and does not isolate it from the
ambient environment it will be run in.** At a second instance this wants a convention
(`GIT_CONFIG_GLOBAL=/dev/null` inside the fixture subshell) rather than a per-fixture
repair.

**2. Entry #3's `declined` trigger term now collides with a token the pipeline mandates
on every PR.** `boundary-receipts` matched entry #3 (Record disposition) on `declined` in
changed text. On #277 the entry was *genuinely* touched — three prior dispositions
(kogaki#126's decline, kogaki#187's park, the `:91-93` base-dependence note) were adopted
as the live word and written into a gate's admission record — but the PR read the match as
the accepted incidental-match class and discharged it with receipts pinning
`lessons/claude-code-ops` and `lessons/testing`, neither of which answers entry #3's
prescribed `gloss_index("lessons/knowledge-architecture")` read.

The structural half worth counting: since SPEC §4 clause 8 (kogaki#224), **every** report
and every PR discharging one carries `declined:` in its own prose, so entry #3's `declined`
trigger term fires on PRs that merely *record dispositions of their own findings* as well
as on PRs that *adopt a prior record's disposition*. The two are indistinguishable at the
matcher. That makes the incidental reading the cheap default exactly where the real touch
also lives — which is how #277's real touch got read as noise. **The class to count: a map
trigger term that is also a token the pipeline mandates in report prose.** Not proposed as
a map repair here; the map's false-positives-are-discharged-not-narrowed polarity is
ratified and this is not an argument to reopen it.
