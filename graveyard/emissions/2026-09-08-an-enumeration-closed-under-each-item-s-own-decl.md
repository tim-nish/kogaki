<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-08
repo: Kogaki
grain: lesson

## Trigger — what happened

A repair sweep over src/ enumerated its population by scanning each file for the stable names that file's own names table declares. One file used a name it did not declare, so a site of exactly the class being repaired was invisible to the scan — not misread, unreachable. A reviewer found it; re-running against the union of all declared names closed the population.

## The learning

When a population is enumerated by scanning each container for the identifiers that container itself declares, the scan's blind spot is exactly a container that USES an identifier without declaring it — and that blind spot produces silence, not a wrong answer, so no amount of careful reading of the output recovers it. The completeness claim a per-container scan supports is 'every declared use', which is narrower than the 'every use' the population usually needs. Close the scan over the UNION of declarations across containers, and state which of the two claims the count supports. The same shape appears wherever a per-file, per-module or per-package registry is used as the key set for a repository-wide sweep.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
