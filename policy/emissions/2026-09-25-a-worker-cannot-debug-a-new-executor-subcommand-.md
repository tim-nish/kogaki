<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-25
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1193, 2026-09-25: seven implement-worker dispatches. Two were wedged by a check fixture that opened a live gate in the worker's own session (fixed in 87bcc85). The rest stopped on permission refusals. The last one stopped while debugging why the job-supervise time-limit and stall fixtures never end. The orchestrator re-dispatched twice after telling the owner the cause was solved.

## The learning

When the code under repair can only be run through a path the worker lane refuses (here, any Bash command naming src/terrain.mjs is denied as running the Terrain executor), the worker can only observe that code through the one check file it is allowed to run. When that check fails without saying why, the worker has no admissible way to find out, so it composes debug shells until the refusal bound stops it. Fixing one trap and re-dispatching does not change that. Before a re-dispatch, confirm the worker has an allowed route to observe the failing behaviour. In this case the bug was readable without running anything: classifyDetachedJobState compares against the module constants READER_PATH_JOB_ABSOLUTE_LIMIT_S and READER_PATH_JOB_STALL_S instead of the --absolute-limit-s and --stall-s values the supervisor parses. A 1-second fixture limit is therefore ignored, the supervisor is killed at the fixture's 15-second timeout, and its sleep-forever children are orphaned.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
