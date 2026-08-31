---
id: reg-0061
status: pending
observed_at_pr: 411
observed_at_head: 7d4fd0b
class:
recorded: 2026-08-13
source_comment: 5276171615
---
Append from the review lane — PR #411, head `7d4fd0b`, one round.

**Accretion-class (counts toward rule 3's three-of-a-class trigger):**

out-of-dimension: PR #411 — the lane's prescribed fixed opening move, an unscoped tier-1 `gloss_index` survey, returned 76,961 characters on one line, and the entry-2/3 prescribed shard `gloss_index("lessons/knowledge-architecture")` returned 132,108 characters; both exceed a review session's readable tool output, and the SKILL's own rule puts ad-hoc byte-slicing of a large transcript out of scope for a per-PR review. The fixed first move is therefore unperformable from inside a review round today, and the round reported it as `cannot-determine`. Instrument gap — a bounded/headline-only read of the tier-1 index is what would close it.

**Instance-class (kogaki#374 carries, NOT counted toward rule 3):** four non-gating in-diff findings from PR #411's report, carried here at `carried: register` rather than minting an issue apiece. Reachability stated per clause 8.

1. `tools/mine-receipt-absence.sh:103` — `BOUNDARY_NONE` rejects the declared `boundary: none  <why>` form, so a conformant declared-empty record reads as AC1a's `cannot-determine`, inverting AC1a's own control. Fires on any report writing the prose half of `boundary: none`; `checks/check-review-report.sh:438-441` already accepts both forms.
2. `tools/mine-receipt-absence.sh:97-102` — `BOUNDARY` requires non-empty prose, so a `boundary: <N> <verdict>` row with no prose is dropped silently while the canonical parser reads it. Fires on any report omitting the prose half.
3. `tools/mine-receipt-absence.sh:74,204` — the `--pr` path joins every comment body into one record while the derivation source names only the last `review-lane report:` sha, so rows from a superseded segment are mined and attributed to the newest report (AC5 legibility). Fires on any PR carrying two report segments.
4. `tools/mine-receipt-absence.sh:50,383` — the always-on fixture pass hard-codes repo-relative paths, so an invocation from any other working directory exits 1 with an AC3 write-path alarm; a substrate failure presenting as an evidence failure. Fires on any invocation not rooted at the repository.
