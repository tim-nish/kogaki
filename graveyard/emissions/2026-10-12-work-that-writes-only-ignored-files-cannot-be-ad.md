<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-12
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1348 --session: an Issue whose whole deliverable is files under the ignored corpus/ directory plus Issue comments was refused at admission because no registered check covers an ignored path

## The learning

Admission requires every plan cell to name the files it changes and requires a registered check to cover them. Work that deliberately changes no tracked file (an experiment under an ignored directory, reported in comments) has no honest plan cell: adding a check is a tracked change the work excludes, and naming a check file it never edits records a false footprint. Such work needs its own admission route, or it should be scoped before filing so admission can carry it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
