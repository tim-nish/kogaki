---
id: reg-0074
status: pending
observed_at_pr: 439
observed_at_head: b74b098
class:
recorded: 2026-08-14
source_comment: 5292091553
---
From the review lane, PR #439 (round 1, head `b74b098`). Three rows, each with its class stated (kogaki#374) — the first is instance-class and must not be counted toward rule 3's three-of-a-class widening.

**INSTANCE-CLASS — a defect, not a count.** The `checks/` half of a spawned round's executable grant is still derived from the sweep's own checkout. `CHECK_TOOLS` is built by `python3` in the shell prologue (`tools/review-sweep.sh:771`) and PR #439 leaves it untouched, while `specs/SPEC.md` §4 clause 4 states its rule over "a spawned round's executable grant", not over `tools/` alone. So a PR adding `checks/check-<new>.sh` still hands the round reviewing it a grant computed in a different tree — PR #411's death one directory over. It is correctly outside #437's scope; story 1.64 owns the `control` finding ("the guard is sited only in the sweep, which is not a registered check"), which is a different property from the tree `CHECK_TOOLS` reads. It wants its own issue rather than a ledger row — routed here because the review session holds no `story-sync file-issue` grant.

**out-of-dimension (accretion-class):** a PR's mutation record named five mutants and bound two of them to a fixture section; the other three were covered but left the join to the reader. PR #439.

**out-of-dimension (accretion-class):** the lane's mandated first move — the unscoped tier-1 `gloss_index` survey — returned 76,961 characters on a **single line**, over the tool-result bound, spilling to a file whose lines are too long for `Read`'s offset/limit chunking. The survey was performed and read only in part, by character slice. This is a property of the lane's instruments (a bounded reader for the tier-1 index is what is missing), not of the PR under review. PR #439.
