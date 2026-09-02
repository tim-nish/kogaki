---
id: reg-0218
status: pending
observed_at_pr: 780
observed_at_head: 2b9f876
class: in-diff
recorded: 2026-09-03
source_comment:
---
in-diff: PR #780 round 2 — `packet` run **before** `resolve` writes a `run.json`
holding only `packets`, with no `brief_sha`. The next `resolve` then evaluates
`prev.brief_sha === sha256(brief.text)` as **false** and drops those entries —
although the Brief has not moved and the Packet files on disk are current.

**The comment states the wrong cause.** `cmdResolve` says the drop happens
*"where the Brief HAS moved … they describe Packets rendered from a Brief that
no longer exists."* That is true of the case the guard was written for and false
of the case it also fires on: an **absent** sha and a **changed** sha are the
same value to `!==`, and only one of them means what the comment says.

**Narrow, and recorded for the shape rather than the impact.** The documented
flow resolves first, so the state is reachable only by driving `packet` against
a fresh workspace. Nothing is lost that a re-render does not restore.

**The shape worth keeping.** A guard whose condition is an equality against
prior state has **three** cases, not two — match, mismatch, and *nothing to
compare* — and the third is silently folded into the second by the operator
itself. The comment names the second because that is the case the author had in
mind, which is exactly when the third goes unnoticed: the justification is
written from the motivating scenario and the operator covers a wider one.

It is also this PR's own class one turn later. Round 1 found the recording
absent; the fix added it; the fix's own guard then had a case its comment did
not describe.

**Not fixed at the head that produced it.** The two-round bound was spent and
the round-2 report certified `2b9f876`, which the Review presence condition
requires — `consulted: product-lab@836e5f3acb3fbc544ff1bfa6d4f1f65a14a50933
topics/claude-code-ops.md:154`. Its sibling finding went to kogaki#749 instead,
which stays OPEN for the deletion half, so that one lands on a live carrier.

Twelfth instance in this sitting of that composition; see reg-0206 to reg-0217.
