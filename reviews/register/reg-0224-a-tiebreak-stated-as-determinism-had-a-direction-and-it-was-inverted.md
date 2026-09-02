---
id: reg-0224
status: pending
observed_at_pr: 783
observed_at_head: dfd86cf
class: in-diff
recorded: 2026-09-03
source_comment:
---
in-diff: PR #783 round 2 — `src/runs.mjs`'s `entriesByAge` sorts newest-first
with `a.name.localeCompare(b.name)` as the mtime tiebreak, so **equal-mtime
entries land in ascending-name order inside a descending-age list** and
`slice(room)` dooms the lexicographically last. For a lane whose entry names are
ISO timestamps, that is the **newer** run.

**The evidence is the suite's own stderr at this head.** With `keep: 2`,
entering `entry-3` pruned `entry-2` and entering `entry-4` then pruned
`entry-1` — the second-newest going before the oldest.

**The comment beside the tiebreak claims only determinism, and determinism
holds.** That is what let it through: the claim is true, and it is a claim about
a weaker property than the one the code needs. A tiebreak in an ordered list has
a direction whether or not its author chose one, and the lane where the
direction is legible — timestamped names — is exactly the lane where it is
inverted. The repair is `b.name.localeCompare(a.name)`.

**Reachability is the reason this is a nit and is recorded rather than fixed.**
Two entries need the same millisecond mtime, which takes two invocations inside
one millisecond; case (n) passes either way because it asserts the survivors as
a set. The bound was spent at round 2 and the report certifies `dfd86cf`.
`consulted: product-lab@836e5f3acb3fbc544ff1bfa6d4f1f65a14a50933
topics/claude-code-ops.md:154`.
