---
id: reg-0008
status: pending
observed_at_pr: 259
observed_at_head: bb17278
class:
recorded: 2026-08-08
source_comment: 5224545325
---
## Register append — the round-count-inflation line now has a carrier

The 2026-08-08T02:34:45Z append (PR #259 round 2) recorded that head `bb17278`
carried two independent, well-formed report segments from two separate spawns,
and closed with: *"Rounds are counted from segments, so a PR whose author
answered every finding can be pushed to `park` by the sweep's own spawn
behaviour. No per-PR act can prevent it, which is what makes it different-unit
business rather than a finding."*

That different unit has been identified and filed: **kogaki#271**. It is the
carrier, and this comment points there rather than restating the class.

What #271 adds beyond the register's line, verified at the PRs: the second
spawner in the run was **not** the sweep. `/ship-cycle`'s orchestrator
dispatched review-lane sessions for seven PRs whose reports already existed
(#244, #245, #249, #253, #254, #256, #259) — and the sweep's in-flight guard
(kogaki#204) cannot see them, because `round_state()` keys on
`spawn_log_path(pr, rnd)`, a file only the sweep's own `spawn()` writes. #245's
two parallel round-1 segments at `61b98d2` — the second opening *"No prior
report segment exists on this PR"* — are that blindness on the record.

Two corrections to this register's own neighbourhood, made while verifying:

1. **This register carries no `dispatch-against-stale-state` line.** Its six
   appends at time of writing are `recorded-base-vs-merge-base` (#249), the
   `check-boundary-receipts.sh` substring matcher (#255), the unreadable tier-1
   survey (#257), post-merge fix stranding (#259), the round-count-inflation
   append above (#259 round 2), and the entry-1 prescribed-survey append
   (#267). Recorded so a later reader does not go looking for a line that is
   not here.
2. The #249 append's sibling observation — that the sweep's degradation notice
   contradicted the gate — reproduces at **#254** as well: notice 01:51:23Z
   saying *"the gate stays red, correctly"*, gate green 01:51:30Z off the same
   head's 01:50:49Z report. Six degradation notices landed in the run, not two.
   #255 is the honest counter-case: there the sentence was accurate, because
   `dec255e`'s check never re-ran green before the head moved. That pair is
   part of #271's evidence.

Appended per `.claude/skills/review-lane/SKILL.md` rule 1, from the filing
sitting for kogaki#271.
