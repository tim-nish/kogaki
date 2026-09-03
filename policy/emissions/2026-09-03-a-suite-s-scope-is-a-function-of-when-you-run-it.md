<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

A registered check suite passed 18/18 in a clean worktree immediately before committing. The commit was made, pushed, and CI failed one member — a receipt validator that reads COMMIT MESSAGES and had found none to read, because at the moment the local suite ran the work was still uncommitted. The defect it caught was real and in the commit message: a consultation receipt carrying continuation lines but no request_id. Re-running the identical suite after the commit reproduced the failure locally in twelve seconds. Nothing was wrong with the check, the suite runner, or CI; the local run and the CI run had different inputs because they happened at different points in the change's life.

## The learning

Treat a check suite as having an implicit INPUT SET that is not the working tree alone. Members that read commit messages, a diff against a fork point, a PR body, or a branch's history see an artifact that does not exist yet during an uncommitted run — so those members pass VACUOUSLY rather than passing, and the pass line reads identically either way. The general form: whenever a verification's subject is produced later in the pipeline than the verification is run, a green result is a statement about the absence of the subject, and absence of a subject is not conformance of one. Two things follow. Run the suite at least once at the state you actually ship — after the commit, with the base the remote will use — because that is the only run whose input set matches CI's; a pre-commit run is a fast filter and never the evidence. And when a member reports its own denominator (this one printed 'over 0 commit(s) since the fork point'), read it: the zero was on screen in the passing run and said exactly what had not been checked. A suite that reports its denominators lets you catch this by reading; one that does not makes the vacuous pass indistinguishable from a real one, which is the property worth demanding of the members you add.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
