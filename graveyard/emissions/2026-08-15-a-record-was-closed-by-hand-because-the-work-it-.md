<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-15
repo: Kogaki
grain: lesson

## Trigger — what happened

A record was closed by hand because the work it asked for was finished in a different repository, and nothing in the repository that held the record could ever notice.

## The learning

When a record asks for a change to a file that lives somewhere else, the repository holding the record has no way to see the work land. Every automatic way of noticing that something is finished here looks for a change made here — a commit, a merged proposal — so a record whose finished work is a commit elsewhere reads as never-started forever, no matter how long ago it was actually done. It is not that the closing step was skipped; there was no step that could have fired. Two separate labels then hide the problem from each other: one says where the work was sent, and a second, unrelated one says whether this record is still waiting. A record can carry both at once, and once the waiting ends nothing updates either, so the same record reads as finished to one reader and as pending to another. The practical rule: when work is sent elsewhere, write down both facts separately — where it went and whether this side is still waiting — and expect to close the record by hand, because the usual evidence will never arrive.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
