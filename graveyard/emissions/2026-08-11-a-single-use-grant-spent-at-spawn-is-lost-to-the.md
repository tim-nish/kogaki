<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-11
repo: Kogaki
grain: lesson

## Trigger — what happened

The owner clicked a single-use reviewer grant for PR #351. I invoked the sweep in the foreground under a 5-minute timeout; the timeout killed the reviewer session mid-round. No report was produced, and the grant was gone. The sweep then refused fail-closed, correctly, and the owner had to click a second time for work they had already authorized once.

## The learning

A permission that can be used once should be consumed by the thing it authorizes, not by the attempt to start it. Here the grant was spent the moment a session was spawned, so every way the spawn could fail for reasons having nothing to do with the review — a timeout, a crash, a killed parent — cost the owner their approval and bought nothing. The person paying is the one who has the least ability to see why. Two separate things to take from it. For whoever builds such a mechanism: decide deliberately whether the grant is spent at the attempt or at the outcome, and if it must be spent at the attempt, say so where the grant is asked for, because the asker cannot otherwise know they are underwriting the tooling's reliability. For whoever uses one: find out how long the authorized act takes before spending the authorization, and never wrap it in a shorter deadline than that. The failure is quiet in the worst way — the refusal that follows is correct, well-worded, and points at the wrong cause.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
