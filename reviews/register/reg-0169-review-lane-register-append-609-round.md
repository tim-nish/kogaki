---
id: reg-0169
status: pending
observed_at_pr: 609
observed_at_head: 1c722ba
class:
recorded: 2026-08-22
source_comment: 5378964350
---
Review-lane register append — PR #609 round 2, head `1c722ba`. **Two `instance-class` rows** (kogaki#374's second producer: spent-bound latent non-gating in-diff carries). **Neither counts toward rule 3's three-of-a-class widening trigger**, which reads `out-of-dimension:` lines only.

**instance-class — `act` has a transport producer and still no caller.** PR #609's round-1 finding 5 was discharged on the transport half: `transportArgv` now emits `--act` when supplied (`policy/kit/bin/consult.mjs:460`) and `consult.mjs`'s main passes `act: opt("act")` (line 804), with two fixture cases. The half that reaches a consulting session did not move: `--act` appears nowhere in `.claude/skills/consult-first/SKILL.md` or its kit source — `grep -rn -- '--act' policy/kit/ .claude/skills/consult-first/` returns only `consult.mjs`'s own three sites. `--disposition`, the flag whose forwarding pattern this copies, is named at SKILL.md:23, :116 and :214-226. So every consultation made through the discipline still writes `act: null` to the effectiveness ledger. Latent because nothing yet reads `act`; the row is here rather than on an issue because filing one is outside this lane's grants (`gh issue create` and `story-sync` are not in the review spawn's tool table) and the two-round bound is spent at this head.

**instance-class — a v1-shaped receipt writes no effectiveness row, on the branch that ships the ledger.** The fix commit `1c722ba` carries `consulted: product-lab@c2f4650… topics/claude-code-ops.md:15,17,…` and no continuation lines at all — no `request_id:`, no `outcome:`, no `query:`. `check-consult-receipts.sh` counts it (`consultations this branch: 1 (receipt-verified, over 3 commit(s))`, run 32558232257) because line one is unchanged between the two forms, which is exactly what keeps history valid. Two consequences worth counting: the effectiveness ledger records a row only where `gateway-query.mjs`'s receipt path emits the block, so a consult whose receipt shows no sign of that path contributes nothing to the ledger this very branch introduces; and a reviewer judging boundary coverage has no `query:` line to read, so `covered` becomes a subject-adjacency guess rather than a check. Recorded as an instance, not as a widening.
