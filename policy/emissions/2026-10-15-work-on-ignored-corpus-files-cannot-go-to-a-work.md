<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-15
repo: Kogaki
grain: lesson

## Trigger — what happened

Starting /ship-cycle 1386, the Proof Sheet rebuild, whose Acceptance asks for rows in corpus/p1329/PROVENANCE.md and whose test passage sits in corpus/p1329/inputs.

## The learning

Everything under corpus/ is ignored by git, so a worker's separate working copy never contains it and nothing the worker writes there can be committed. An Issue whose Acceptance asks for a change under corpus/ can therefore only be finished in the owner's own session (the --session launch), or after the file it names is moved to a tracked path. Check this before admission, not after a worker has been sent.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
