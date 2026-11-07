<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-13
repo: Kogaki
grain: lesson

## Trigger — what happened

An item was put on hold behind a named precondition, and the hold recorded three declarations honestly: what would observe the precondition, what to count, and what query would return empty until it was met. The observer field was typed as an explicit absence, because nothing in the system read the artifact in question. Later the precondition landed, and the person who noticed edited the hold's own record to say so — the query now returns non-empty, the assertion is falsified at this head. Nothing acted on that for five days. Every sweep in between read the item as blocked work, because the banner saying blocked was still at the top.

## The learning

A hold that declares its own release condition and declares that NOTHING OBSERVES IT is two different pieces of news, and the second one is the one that decides how long the hold lasts. The honest typed absence is worth keeping — it is what makes the stall diagnosable in a single read instead of an investigation — but it should be read as a scheduling fact and not merely a disclosure: an unobserved trigger means the item is released by someone remembering, so its expected latency is the interval between people who happen to look, which is unbounded. Two things follow. When a hold has no observer, the release act belongs to whoever most recently touched the precondition, at the moment they touch it, because that is the only actor who is provably in position to know. And a record that has been EDITED to say its own condition is met is strictly stronger evidence than the condition itself — it means a human already did the observation and the only thing that did not happen was the act it implies, so treat such an edit as an unexecuted instruction rather than as a note.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
