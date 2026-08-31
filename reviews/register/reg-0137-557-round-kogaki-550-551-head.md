---
id: reg-0137
status: pending
observed_at_pr: 557
observed_at_head: a590fac
class:
recorded: 2026-08-19
source_comment: 5344401836
---
**From PR #557 round 2 (kogaki#550/#551, head `a590fac`) — two findings carried at a spent bound.** The PR converged (gate green, no blocking) and merged; both are non-blocking leftovers.

**should — the retirement left two dead imports.** `brief/compose.mjs:30` imports `readFileSync`/`writeFileSync` and neither is used; `cmdFill()` was their only consumer. Node does not error on an unused import, so nothing in the suite says so. This is the PR's own subject one layer down, against the line the PR quoted: removing a route, then its function, and leaving its imports is the retirement stopping short twice.

**should — the mutation roll-up's tally may disagree with its enumeration.** The roll-up declares FIFTEEN. The prior tally was THIRTEEN and #551 added two; whether the earlier thirteen still enumerate to thirteen was not re-derived, and one was retired at an earlier head. The roll-up is what the check registry's `efficacy` pointer resolves against, so an overstated tally is the same class as listing a mutation nobody ran.

Successor: **kogaki#559**, carrying both with the remedy for the first and an explicit instruction to count rather than trust either number for the second.
