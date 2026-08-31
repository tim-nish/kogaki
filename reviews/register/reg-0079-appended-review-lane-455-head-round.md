---
id: reg-0079
status: pending
observed_at_pr: 455
observed_at_head: 6cdbd43
class:
recorded: 2026-08-14
source_comment: 5295719985
---
Appended from the review lane, PR #455 (head `6cdbd43`), round 1.

**Row 1 — `out-of-dimension:`, ACCRETION-CLASS.** Counts toward rule 3's
three-of-a-class widening trigger.

out-of-dimension: PR #455 — the kogaki#230 mutation evidence for a change to `tools/review-sweep.sh`'s state machine rests entirely on fixtures embedded in that file, and `checks/check-review-report.sh`'s own output states the property: *"`tools/review-sweep.sh` is not a registered check and its own fixture pass never runs in CI, so a guard living only there would let the drift land green"*. The four state cases, the `drives_fix()` assertion and the three `park_class` relation assertions PR #455 adds are protected by nothing mechanical. The file already knows this and routes clause-12 agreement to the registered check for exactly that reason; the state-machine block has no equivalent.

**Rows 2–5 — `carried: register` dispositions, INSTANCE-CLASS.** Their value is
the defect each names, not a count. Per rule 1 these must NOT be counted toward
rule 3's trigger, which reads over `out-of-dimension:` lines only. Rows 2 and 3
are in-diff at a bound that is NOT spent — the register row exists so the
finding survives a merge that skips it, and the primary remedy is still this
rally's round 2.

1. **`post_bound_head_move()` drops `decide()`'s carry-forward list** (PR #455 finding 1, `should`). The predicate calls `head_segments(segs, head)` without the third argument `decide()` supplies, at the one call site that routes to supersession — the identical defect the `supersede` arm's own comment names four hundred lines below in the same file. Live path: a fragment carried forward to a moved head with the bound spent elsewhere returns `post-bound-head-move`, inverting AC2b. Remedy: pass `carried` through, reuse the `segs` already in hand, and add the AC2b case run through the carry-forward path rather than through sha identity.

2. **AC3's second half is unbuilt: the post-bound notice names no findings** (PR #455 finding 2, `should`). AC3 asks for the supersession lane *and the findings the successor owes*, "in the shape `supersede` already uses". The `supersede` arm resolves and prints them; the new arm's body says "disposes of this PR's open findings" while naming none. The set is not empty by construction — the earlier reviewed heads carry them.

3. **`decide()`'s docstring roster does not list `post-bound-head-move`** (PR #455 finding 3, `nit`). The docstring enumerates the state machine's whole vocabulary and a new reachable state was not added to it.

4. **The three notice arms have no re-post guard** (PR #455 finding 4, `nit`, LANE-WIDE rather than introduced by that diff). `supersede`, `park` and the new `post-bound-head-move` each post their notice unconditionally on every `--spawn` run, so a PR sitting in one of those states collects a comment per push plus one per manual sweep. `annotate_report()` is this file's own worked answer to the same question — "A re-run over an already-annotated report must not append a second one" — and the notice arms have no equivalent.
