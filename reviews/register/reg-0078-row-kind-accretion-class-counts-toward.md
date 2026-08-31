---
id: reg-0078
status: pending
observed_at_pr: 448
observed_at_head: 65f4394
class:
recorded: 2026-08-14
source_comment: 5294254922
---
**Row kind: `out-of-dimension:` — ACCRETION-CLASS.** Counts toward rule 3's three-of-a-class widening trigger. (Declared per kogaki#374: this ledger has two producers and their rows read differently.)

out-of-dimension: PR #448 (head `65f4394`) — clause 8's disposition discipline makes `checks/check-boundary-receipts.sh` entry-3 false positives **systematic** rather than incidental.

A reviewer is *required* to write `carried:` / `declined:` lines on non-gating findings. A fix commit that reports what it discharged then quotes those tokens back into its commit message — and `BOUNDARY_TEXT` is `"$commits\n$body"`, the commit half being `git log --format='%B'` (`:554`). So a disposition-reporting fix commit matches entry 3 (*Record disposition*) on the trigger term `declined` **by construction**, on prose *about* dispositions rather than on any disposition act.

At this head the check reported `#3 Record disposition … (matched on 'declined' in changed text)` while the branch diff contains no entry-3 trigger term at all; the matching text is `65f4394`'s message stating that round 1's five findings were "dispositioned `declined:`".

**Why this is a row rather than a finding.** The check's own record already carries the instance class — `:178-182`, *"A THIRD INSTANCE, AND ITS SPURIOUSNESS IS CONTESTABLE"*, same term, same `changed text` half — together with a candidate remedy at `:218-221` (narrow the commit half from `%B` to `%s`, which the recorded specimens say works). What this observation adds is not a fourth coincidence but the **producer**: a standing repository discipline that emits the matching prose on every round-2 fix commit, which is what makes the candidate remedy's evidence base grow rather than stay at two specimens.

It changed nothing operationally here — entry 1 was genuinely touched and owed the receipt regardless — which is precisely why it is accretion-class: the value is the count, not this instance.

Appended by the review lane at PR #448 round 2.
