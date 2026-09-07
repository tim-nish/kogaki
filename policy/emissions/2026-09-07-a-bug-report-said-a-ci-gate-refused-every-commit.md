<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

A bug report said a CI gate refused every commit of one class. Two of the four commits in that class had in fact passed — their prose incidentally contained a number, and the gate's whole test was a bare grep for one. The report's premise was false in its literal form and the real defect was worse: the gate was already passing commits it had never licensed.

## The learning

When a report says an instrument fails on every member of a class, check the members it PASSED before accepting the premise. A uniform failure and a mixed one point at different defects: uniform means the instrument does not handle the class, while mixed means the instrument is keyed on something that varies independently of the class — and the second is worse, because the passes are false positives nobody filed a bug about. The passing cases are the cheaper evidence and are usually left unread, since a report is written from the failures that hurt. Here the fix followed the mixed reading rather than the reported one, and the difference was visible in a single command over four commits.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
