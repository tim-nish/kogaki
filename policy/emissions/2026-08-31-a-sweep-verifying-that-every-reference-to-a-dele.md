<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-31
repo: Kogaki
grain: lesson

## Trigger — what happened

A sweep verifying that every reference to a deleted artifact had been annotated tested the property PER FILE: does this file mention a deleted name, and does it contain retirement wording anywhere in it. A spec file passed on retirement wording located elsewhere in its 3700 lines while carrying a live present-tense clause asserting that two deleted files still bind a value. Rebinding the same test per occurrence, with a context window around each matching line, surfaced it immediately.

## The learning

When a property holds per OCCURRENCE but is tested per FILE, one conforming occurrence vouches for every non-conforming one in the same file, and the larger and better-maintained the file the more effectively it hides them. The failure is silent and inverted: the files most likely to contain a stale claim are the long, actively-edited ones, which are also the most likely to contain the conforming wording that makes the file pass. A verification's granularity must match the granularity of the thing being verified, and where the test is a search for corroborating wording, the corroboration has to be bound to a window around the occurrence rather than to the container that holds it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
