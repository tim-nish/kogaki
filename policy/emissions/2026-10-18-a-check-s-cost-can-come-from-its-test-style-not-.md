<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-18
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1425 asked for two slow checks to be sped up by removing waits. Measuring showed that no case waited: terrain-runtime's CI time went from about 5 s to about 30 s when kogaki#1257 moved every case onto the runtime's command line, which takes about 430 separate program starts per run, and terrain-hook-invocation's cost was about 190 Python starts, two per assertion.

## The learning

Before choosing how to speed up a slow check, measure what its time is spent on. A check that drives the program through its command line pays one program start for every case, plus the starts that program makes itself, and no wait-trimming makes that cheaper. The ways out are running groups of cases at the same time, or testing in-process, and either is a design decision to make when the test style is chosen, not a tuning job afterwards.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
