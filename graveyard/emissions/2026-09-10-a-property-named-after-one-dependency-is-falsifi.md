<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-10
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1079 removed a fixture's dependency on the policy gateway and declared the member 'SEAM-FREE BY CONSTRUCTION'. PR #1080 round 1 found CI still red at that head: a second machine-local dependency — a judge binary resolved over PATH, which a CI runner has not got — stood in exactly the same place and produced exactly the same reading. The new claim was false the day it was written.

## The learning

When a fix removes an environmental dependency, the property to declare is the general one — this depends on nothing outside the repository — with the removed dependencies as its evidence rather than its definition. A claim named after the one dependency you happened to find reads as settled and is falsified by the next one, and it is worse than no claim because a later reader trusts it. The same discipline applies to a re-measurement note that names its environment: 'measured with the seam down, which is the condition CI runs in' was false while the machine still carried a binary CI has not got. State every absence the reproduction carries, or the reproduction is not the condition you say it is.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
