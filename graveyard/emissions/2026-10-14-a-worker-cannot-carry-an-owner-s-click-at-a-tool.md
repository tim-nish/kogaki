<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-14
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1365 admitted an Issue whose act is the owner answering accept/decline at the ingest tool, routed it to a worker, and the worker stopped with no change; its result line still read 'implemented' because the supervisor's receipt commit made the branch one ahead.

## The learning

When the act an Issue asks for is a person's choice at a tool's own question, a background worker cannot carry it: it has no way to ask, no recorded answers to replay, and here was not even allowed to run the tool or read the source files. Admission still sends such an Issue to a worker, and the worker's result reads 'implemented' because the receipt commit the supervisor adds moves the branch. So 'implemented' with only that commit means nothing was done, and the honest route for this kind of Issue is the owner running the tool themselves, outside a run.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
