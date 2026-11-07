<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-11
repo: Kogaki
grain: lesson

## Trigger — what happened

A commit message and a PR's acceptance table both stated that a one-line comment repair had been made. It had not. The reviewer found it by reading the diff for the hunk the claim implied and finding no such hunk. Two other claims in the same sitting were wrong in the same direction: a stale count that described six criteria as four, and a runtime figure computed from one lucky measurement.

## The learning

Records about your own work fail in a direction that is hard to catch: the claim is written at the moment you intend to do the thing, and intending is close enough to doing that re-reading the sentence does not disturb it. Prose repairs are the worst case, because nothing runs them — a code change that did not happen usually breaks something, and a comment that did not get edited breaks nothing at all. So a claim about a prose edit owes a check that reads the artifact, not care. And when you write such a check, expect the repair itself to quote the text it retires, because recording what a file used to say is good practice — the check has to tell the live claim from the historical note, or it fires on its own fix.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
