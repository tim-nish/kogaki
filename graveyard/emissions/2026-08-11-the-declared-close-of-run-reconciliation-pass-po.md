<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-11
repo: Kogaki
grain: lesson

## Trigger — what happened

The declared close-of-run reconciliation pass posts a park-postmortem to any parked PR every time it runs. PR #304 has been parked since 2026-08-09 and now carries fifteen identical park-postmortem comments, nine of them from today alone.

## The learning

A periodic pass that posts its finding as a comment will re-post that finding on every run for as long as the condition holds, because a comment is an append and a condition is a state. The first post informs; the fifteenth buries the thread it was meant to surface something in, and trains every reader to skim the class. A recurring reporter needs to compare against what it already said — post once and update, or check for its own prior post before adding another — otherwise its output volume tracks how long a problem has gone unfixed rather than how important it is.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
