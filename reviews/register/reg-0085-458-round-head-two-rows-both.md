---
id: reg-0085
status: pending
observed_at_pr: 458
observed_at_head: d34e728
class:
recorded: 2026-08-14
source_comment: 5296405364
---
From PR #458 round 2 (head `d34e728`). **Two rows, both spent-bound carries under kogaki#374 — INSTANCE-class, not `out-of-dimension:` lines.** Neither counts toward rule 3's three-of-a-class widening trigger.

**Row 1 — instance-class (spent-bound carry).** `policy/consultation-map.md:752` labels entry 4's served line *"quoted whole at its pin rather than paraphrased"* while `:767`, two lines below, declares *"The excerpt is marked at both ends"*. The round-2 repair marked the excerpt and left the label asserting the opposite above it. Same defect class the file names against itself at `:286` — the entry looks quoted-whole and the correction sits below the fold. Entries 1, 2 and 3 (`:581`, `:626`, `:691`) each describe their own quote's shape instead, so no sibling carries this wording. Remedy is one clause. Carried here rather than to a successor because the bound was spent by the report that found it and the defect is in-diff text nothing can currently reach.

**Row 2 — instance-class (spent-bound carry).** `policy/consultation-map.md:789-796` states entry 4's reconstructed question was *"issued against the served surface at this filing, where it discriminated"* and cites `request_id caa74a28-b161-40d1-9767-1a96d9fd369a` with outcome `discriminating`. No receipt on the branch carries that consultation: the two receipts both sit on `09207ce` (`ca7b150e`, `7d303e03`), the fix commit carries none, and CI reports `consultations this branch: 2 (receipt-verified, over 2 commit(s))`. A reader meets a request_id and an outcome token in a policy artifact with nothing receipt-verified behind them — in the one field whose stated purpose (`:511-513`) is letting a reader tell a run query from a composed one. The map's required disclosure is present and conforming; it is the surplus claim that outruns its record. The substance was independently corroborated at review (a near-identical question returned `topics/claude-code-ops.md:20` first), so what is missing is falsifiability, not the fact.

**Why this pair may be worth more than its two rows.** Both are the same shape one field apart — a record whose *stated* form and whose *evidenced* form diverge, with the honest correction present but not where the claim is read. If a third of that shape lands, it is an `out-of-dimension:` class rather than two instances.
