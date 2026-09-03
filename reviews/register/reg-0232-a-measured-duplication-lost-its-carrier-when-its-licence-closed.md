---
id: reg-0232
status: pending
observed_at_pr: 797
observed_at_head: 2051f9c
class: residue
recorded: 2026-09-03
source_comment:
---
residue: PR #797 round 2 — kogaki#769's CI-sourced reuse is unreachable for
every PR head, and the PR that landed it discharged #769.

#769's measured target was stated as: *"the duplication is across sites: the
review lane's declared mechanism runs the same suite on the same PR head CI
already ran, once per round."* That specific reuse is exactly what round 1's
in-diff fix gave up. The fix was correct and is not in question — a
`pull_request` run's `head_sha` is the PR head while its checkout is
`refs/pull/N/merge`, so its verdict attests a different tree whenever the base
has moved, and reusing it would have broken the premise the whole key rests on.
`--event push` is the sound direction.

**What survives:** lane-and-local reuse through the shared machine-local store,
plus same-SHA `push` reruns on master (the ~1% #769 measured). **What is
given up:** a PR head reusing CI's verdict, which recovers only when the same
machine also ran the suite locally at that head.

**Why this is a register entry and not a revert or an issue.** The trade is
right and is documented in three places (the runner's header conditions, the
`ci_verdict` docstring, the `checks.yml` comment). What is owed is a home for
the residue, since closing the licence with that half unbuilt is how a measured
duplication quietly stops being anyone's. The shape of any follow-on is a
decision a contributor cannot make alone — record a `pull_request` run's verdict
under its **merge** SHA, or check out the head ref and change what CI actually
tests — so it needs an owner, not an in-diff fix.

**Adjacent observation from the same round, kept with it because it is the same
mechanism:** `checks.yml` triggers on both `pull_request` and
`push: branches: [master]`, so on a PR the suite executes twice per head under
two different checkout trees. The once-per-head key is per-tree by
construction; this is a property of the workflow's trigger pair rather than of
#769's diff.

Not fixed at the head that produced it: the two-round bound was spent, and the
remedy is an owner decision rather than a diff.
