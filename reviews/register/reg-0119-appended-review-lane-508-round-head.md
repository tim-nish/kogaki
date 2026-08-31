---
id: reg-0119
status: pending
observed_at_pr: 508
observed_at_head: 23f2fd5
class:
recorded: 2026-08-18
source_comment: 5324974040
---
Appended from the review lane, PR #508 round 1 (head `23f2fd5`). **Both rows are instance-class** — their value is the defect each names, not a count — so neither counts toward rule 3's three-of-a-class widening trigger, which reads `out-of-dimension:` rows only. That PR carried no `out-of-dimension:` observation.

Both are non-gating in-diff findings taking the `carried: register` floor under kogaki#433: **auto-merge is armed on #508** (read, not inferred), so a disposition presuming a later round would read the fix is unavailable even though the round counter shows one remaining.

**Row 1 — instance-class.** `policy/kit/bin/emit.mjs:218`, `--date` is unvalidated while the §4.7 backlog read's membership rule requires `\d{4}-\d{2}-\d{2}`. The emission is written as `${date}-${slug(title)}.md`, so a malformed `--date` (e.g. `2026-8-18`) writes a file the read cannot see, and the render site's stated invariant ("1 or more here by construction", `emit.mjs:237-240`) fails: the disclosure renders `0 candidate(s) awaiting the hub's gate, oldest null (null day(s) old)` at the very act that grew the backlog. It is also the only path on which the render site meets `emissionBacklog`'s zero return, which was designed for a site that never renders it. Reachability, stated so a reader can argue with it: no caller in this repository passes a malformed `--date` — `install-test.sh` passes well-formed dates and every other invocation takes the ISO default — so the defect is latent rather than live. Remedy: one guard against the pattern the membership rule already declares.

**Row 2 — instance-class.** kogaki#505's acceptance item 4 ("the zero case renders explicitly rather than being omitted") was discharged on PR #508 by making the zero **unreachable at the render site** rather than by rendering it, and that reading is recorded in the PR body and a code comment rather than on the licensing issue. The reading is defensible and disclosed; what is missing is the record living where the decision was licensed.
