---
id: reg-0086
status: pending
observed_at_pr: 458
observed_at_head:
class:
recorded: 2026-08-14
source_comment: 5296409142
---
**PR #458 round 2 — two `should` findings, both spent-bound carries, both in the diff's own text (kogaki#402, consultation-map entry 4).**

**1. The served-line label contradicts the correction two lines below it.** `policy/consultation-map.md:752` reads *"**Served line (pinned):** quoted whole at its pin rather than paraphrased —"* while `:767` now declares *"The excerpt is marked at both ends"*. Round 1's finding 3 repair marked the excerpt and left the label asserting the opposite. No sibling entry carries this wording — entries 1, 2 and 3 each describe their own quote's shape instead. Remedy is one clause: *"quoted at its pin rather than paraphrased, as a marked excerpt"*.

**2. An `issued at this filing` claim carries no receipt on the branch.** `:789-796` states the reconstructed question was *"issued against the served surface at this filing, where it discriminated"* and cites `request_id caa74a28-b161-40d1-9767-1a96d9fd369a` with `outcome: discriminating`. The branch's two receipts are `ca7b150e` and `7d303e03`, both on `09207ce`; CI reads `consultations this branch: 2`. So a reader meets a request_id and an outcome token in a policy artifact with nothing receipt-verified behind them — in the one field whose stated purpose (`:511-513`) is letting a reader tell a query that was **run** from one **composed** afterwards. The required disclosure is present and conforming; it is the *surplus* claim that outruns its record. Round 2 independently re-issued a near-identical question and confirmed `topics/claude-code-ops.md:20` comes back first, so the fact holds — the falsifiability does not. Remedy: emit the receipt, or drop the request_id and outcome token and let the reconstructed disclosure stand alone.

**Why register and not a successor PR.** The two-round bound was spent when round 2 reported, so nothing can reach these on #458; both are two-line text repairs, far below the cost of a successor submission. Typed instance-class, not counted toward the three-of-a-class trigger.
