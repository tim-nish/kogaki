<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-20
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1478 put one rule in passages/FORMAT.md and in the Extractor's instruction; review round 1 on PR #1481 found the two worded differently where it mattered, and the check, matching only a shared prefix, could not see it

## The learning

When the same rule must appear in two places, such as a format document and the model instruction built from it, write it in exactly the same sentences and have the check look for each whole sentence in both places. A check that looks only for a few key words in one copy passes when the other copy says something different, and the part that differs is usually the part that matters.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
