<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1301 split the Brief's path review into a background job, one unit per Candidate, beside the reader-path job that already ran in the same run directory.

## The learning

The background-job supervisor names every file it writes after one fixed job (its record, its units file, each unit's output, its stop flag, its resume claim). A second job started in the same run directory would overwrite the first one's record, and a stop click would signal the wrong job. Giving the second job a directory of its own beneath the run directory kept the supervisor unchanged and both records intact; the run record names which state's job lives where, so the stop click and the poll find the right one. A generic supervisor that one job used to own also tends to carry that job's shape checks: here it insisted every answer carry a 'legs' list, which a review answer never has, so the required list had to become something the job declares rather than something the supervisor assumes.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
