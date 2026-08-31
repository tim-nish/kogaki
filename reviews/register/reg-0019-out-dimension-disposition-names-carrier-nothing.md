---
id: reg-0019
status: pending
observed_at_pr: 298
observed_at_head:
class: out-of-dimension
recorded: 2026-08-08
source_comment: 5226720289
---
out-of-dimension: a `carried: #<N>` disposition names a carrier but nothing establishes that the carrier ever receives the finding — `specs/SPEC.md` §4 clause 8 reads the presence of the line, and an issue number that was never written to is indistinguishable at the gate from one that was.

Observed on **PR #298 round 1** (report at `24f5d68`). The round-1 report wrote `carried: #289` against its third finding — the Thesis declared a required input that no part of §13's mechanical layer consumes. kogaki#289 carried exactly **one** comment at the time of round 2: the 13:05 policy check, written **two hours before** the report. The finding existed only in the PR comment it was supposed to be leaving.

Why it types as out-of-dimension rather than as a finding on the PR: the defect is in the lane's own disposition clause, not in PR #298's diff or its consultation coverage. Round 2 discharged the instance by filing it (kogaki#289 `issuecomment-5226715816`), so the specimen is repaired and the class is what is recorded here.

The class, stated for the count: clause 8 is deliberately reported-never-gated, and its own text says "file it, then name it" — the ordering is the whole obligation and nothing observes it. The sweep's `done` state lists open non-gating findings carrying **no** disposition line; a disposition line pointing at an empty carrier is counted as satisfied. This is the same evaporation clause 8 exists to stop, one indirection later: the finding is not lost in a comment nobody re-reads, it is lost behind an issue number nobody follows.

PR: https://github.com/tim-nish/kogaki/pull/298
