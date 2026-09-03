---
id: reg-0231
status: pending
observed_at_pr: 797
observed_at_head: 2051f9c
class: downstream
recorded: 2026-09-03
source_comment:
---
downstream: PR #797 rounds 1 and 2 — the review lane's declared mechanism
(`bash tools/run-registered-checks.sh`) can now exit 0 without executing a
member, because #769 gives the runner a reuse path. The lane records only the
exit code, so an execution and a reuse are indistinguishable in its result.

**Round 2 narrowed this rather than closing it, and the narrowing made it
sharper.** After `--event push` a lane at a PR head can only ever reuse the
machine-local store — which on this PR is written by a local run of the very
code under review. So the mechanism attesting the runner may be a verdict the
runner recorded about itself, and nothing in the lane's result says which.

**It lives downstream of the diff**, in the engine's `mechanism_result_path`
layer (`~/.claude/tools/review-lane`), not in the runner's text. The runner
already prints the `reused:` line a lane could read; what is missing is the
lane reading it and carrying the distinction into its own result.

**The pointer the PR body gave for that layer does not resolve here.** It named
`#722`, which is the engine's own issue number in claude-toolkit; in this
repository #722 is a closed issue about deleting `.local/stories`. Recorded
against the layer rather than against a wrong number — the cross-repo pointer
is `tim-nish/claude-toolkit`, and naming it as a kogaki issue would have been
the ungrounded-echo shape.

Both rounds raised it independently, at different heads, which is why it is
recorded rather than dismissed as a round-1 artefact.

Not fixed at the head that produced it: the two-round bound was spent, and the
defect is not in this diff's text.
