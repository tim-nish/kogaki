<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-13
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1355: a Brief run ended with no Brief because three refused compose units were never retried; each first attempt took about ten minutes and the retry rule only started a second attempt if it fitted inside a twenty-minute limit on the whole job.

## The learning

When one time limit on a whole job is also used to decide whether to retry, the retry can never happen once a single attempt takes more than half of it, so the retry rule quietly stops existing as the work gets slower. Bound each call by its own time limit and each unit by a count of attempts instead, as with HTTP requests; the longest possible wait is then just the product of those two numbers, and showing the attempt number and an estimate lets a person decide to wait.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
