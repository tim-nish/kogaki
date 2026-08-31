---
id: reg-0142
status: pending
observed_at_pr: 565
observed_at_head: da83ef1c7ee9ce6b9edf0f40002e149c1501f8ed
class:
recorded: 2026-08-20
source_comment: 5352397361
---
Register append from the review lane — PR #565, head `da83ef1c7ee9ce6b9edf0f40002e149c1501f8ed`, round 1.

Three non-gating findings dispositioned `carried: register` in that PR's report. **Row class: accretion for row 1, instance for rows 2 and 3** — stated per kogaki#374, so rule 3's three-of-a-class widening trigger (which reads `out-of-dimension:` lines only) counts none of these.

1. **accretion-class** — `check-boundary-receipts.sh` matched entry 1 on `check` in `changed text`, where the matching text is the **PR body's own check-reporting prose** ("Checks at head: check-brief-entry 13/13 …") and not the commit subject. Fourth recorded instance of the spurious-match class kogaki#126 declined a repair for; its candidate 3 (narrow the commit half of `changed text` to `%s`) does **not** reach this one, because the source is the PR body. Value here is the count, against any future re-opening of that decline.

2. **instance-class** — `snapshotBrief()` (`brief/compose.mjs`, kogaki#523) landed with no case in `checks/check-brief-compose.sh`; the PR's green `11/11` is a count over cases that do not touch it.

3. **instance-class** — `brief/compose.mjs:52-53`'s doc comment misdescribes the helper's failure return (`seq` is reassigned inside the `try`, so a `writeFileSync` throw returns the computed sequence, not the given `null`).

No `out-of-dimension:` line was written for PR #565.
