---
id: reg-0021
status: pending
observed_at_pr: 321
observed_at_head: 9612350
class:
recorded: 2026-08-09
source_comment: 5231078249
---
## Append from PR #321 (review-lane round 2, head `9612350`)

Two entries — one making a round-1 `carried: register` real, one a second instance of a class already on this register.

- **`CARRY_FIX` and the sweep-side agreement fixture run in no registered check.** PR #321 sites story 1.46's AC 3, AC 4 and AC 5 demonstration in `tools/review-sweep.sh`'s embedded fixture pass, which none of `checks/registry.json`'s ten members executes. CI run `31308459055` on this head therefore exercised the *gate's* copy of the agreement fixture — which does read `tools/review-sweep.sh`'s source, so a drifted path constant or a re-introduced local definition is caught — and **none of the three moved-head behavioural cases**, which is the case clause 7 v2 exists for. The non-registration is pre-existing; what is new is that a clause's acceptance demonstration now lives there. Value is the count of acceptance demonstrations sited outside CI, not this instance.

- **Second instance: a `carried: register` disposition that never reached the register.** PR #321 round 1 wrote `carried: register` against the finding above; this comment is the first append naming PR #321, posted by round 2. The round-1 spawn's own route notice records `Bash(gh issue comment)` as denied, so the lane could not discharge the disposition it had just written. This is the class recorded here from **PR #298** (2026-08-08T15:15:56Z) — clause 8 reads the presence of the disposition line and never whether the carrier received anything — with a **new mechanical cause**: not an author who forgot to file, but a spawn whose grant set excludes the one command its own register append requires. Class: lane grants vs. clause 8's "file it, then name it" ordering. Corpus for this class now stands at two (PR #298, PR #321).

PR: https://github.com/tim-nish/kogaki/pull/321
