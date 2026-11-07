<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-01
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki #1238 listed which self-tests nothing ran, but one it listed was still run by a registered check; an earlier admission accepted the list without checking and the work failed

## The learning

Before a cleanup removes test code that its issue calls unused, look for every caller under the checks folder. The issue's own table is not proof. Here a check still ran a self-test the issue called dead, so deleting it would have broken the check suite. Admission has to send that back to the owner and not let the session pick a fix.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
