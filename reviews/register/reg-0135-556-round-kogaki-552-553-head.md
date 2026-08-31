---
id: reg-0135
status: pending
observed_at_pr: 556
observed_at_head: f8e08c6
class:
recorded: 2026-08-19
source_comment: 5344120389
---
**From PR #556 round 2 (kogaki#552/#553, head `f8e08c6`) — one finding carried at a spent bound.**

Round 2 resolved all five of round 1's findings, including two blocking ones that had made #553's remedy unreachable. It raised one new non-blocking finding, and the bound was spent (round 2 of 2, `autoMergeRequest` null), so no round could read a fix.

**should — `restore_grant()`'s tag is PR-scoped, and its docstring claims otherwise.** The match is `(repo, pr, tag in consumed_by)` with the tag `f"review-{n}"`, so two passes on the same PR are indistinguishable; the docstring asserts "a grant consumed by an earlier run … is never touched". The cross-PR half of that claim is true and the same-PR half is not.

Successor: **kogaki#558**, filed with the two candidate remedies (a pass-scoped tag, or matching on the round `PASS_CONSUMES` already records) and the impact bound stated.

**Also recorded, because it is the third instance of one class and no single instance has been worth an issue.** Both of #556's rounds landed **degraded** reports — round 1 on `Bash(cat > …)`, round 2 on `Bash(grep -n \)`. #552's fix addressed the redirect, and the skill already documents shell `grep` as unreliable, so in both cases the reviewer reached for a shape the instrument had already warned it about. The durable question is not which shape: it is that **one denied command degrades the whole report** rather than costing the one dimension it blocked, which is what `cannot-determine:` exists to price. Both reports were substantively complete and neither counted cleanly. No issue filed — recorded here so a fourth instance meets a count rather than a fresh diagnosis.
