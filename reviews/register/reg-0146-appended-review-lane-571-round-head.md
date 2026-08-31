---
id: reg-0146
status: pending
observed_at_pr: 571
observed_at_head: 876d9bcd17bb4c6ca79ac186793f7a311a3ea0b8
class:
recorded: 2026-08-20
source_comment: 5356029247
---
Appended by the review lane from PR #571 round 1 (head `876d9bcd17bb4c6ca79ac186793f7a311a3ea0b8`).

**Three rows, each typed per kogaki#374. None is an `out-of-dimension:` line — all
three type into dimension 1 (diff versus license) and none counts toward rule 3's
three-of-a-class widening trigger.**

**Row 1 — instance-class, in-diff, non-gating (`should`).** `brief/brief.mjs:376` and
`:382`: on the **single-strand** settled set, `thesis-1` and `thesis-2` are given the
same `claim` (`claim: p` in both), and `cmdAdopt` now records `hit.claim`
(`brief/brief.mjs:563`). So the two options at the thesis-determination gate produce a
**byte-identical `adopted_thesis`** — the fork the owner is asked to make no longer
reaches the minted Brief, only `adopted_via`. Before this head the two candidates
carried distinct `thesis` text and the choice was recorded. The multi-strand path is
unaffected (each lead differs). Nothing in `checks/check-brief-entry.sh` asserts
distinctness of the adopted text on the single-strand path — case (b2)'s
distinct-thesis assertion reads `c.thesis`, not `c.claim`.

**Row 2 — accretion-class, and the count is the point.** The doubled-period assertion
added at `checks/check-brief-entry.sh` (b2) tests **both** `c.thesis` and
`c.concession`. The concession half can never fail: every concession string in
`composeThesisCandidates` is a composer literal interpolating only a member **count**,
never served text, so it can never carry a served terminal period to double. This is
the **third** recorded instance of a constant-false guard in this one file, and the
first two are recorded in its own comments: the retired `!/—/.test(...)` em-dash test
(PR #543 round 1) and the doubled-period assertion first written in case (b), which
this very head records as a survivor and moved. The file's discipline of recording
survivors is good and is working; what the count says is that the *placement* review —
"can this assertion fail on this path?" — is worth running over every new assertion
rather than over the one that happened to be mutated.

**Row 3 — instance-class, in-diff, non-gating (`nit`).** `brief/brief.mjs:563`,
`const thesis = hit ? (hit.claim || hit.thesis) : answer;`. The `|| hit.thesis`
fallback silently restores the framed gate sentence §5.1.3 exists to strip, for any run
state whose `thesis_candidates` predate this head (written by `enter` at an older
version, read by `adopt` at this one). The eleven-line comment above the line explains
the strip and says nothing about the fallback, so a reader cannot tell compatibility
from defensiveness — and the mutation that asserts the strip ("making adopt record the
framed `thesis`") passes straight through it, because it mutates the assignment rather
than emptying `claim`.
