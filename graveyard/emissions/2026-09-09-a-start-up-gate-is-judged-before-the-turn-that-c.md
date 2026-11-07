<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

A skill whose start line opens an approval gate wedged two sessions: the harness ran that line during the prompt's expansion, then judged the same prompt against the gate it had just opened, refused it as typed text, and ended the turn with no model call at all. Recovery was from outside the session, deleting the gate's marker file by hand.

## The learning

When a mechanism opens a gate as a side effect of starting, check the order in which the surrounding system runs things: the act that opens the gate can run before the event that would be judged against it, and then the gate refuses the very request that created it. The refusal looks correct at every step, and what it removes is the only cheap way through, so the remaining path is an outside repair nobody in the session can perform. The fix is not a wider refusal but a mark on the gate saying no turn has run for it yet, spent at the first evidence one has. Record who opened a gate rather than only that one is open: a gate cannot tell whether it is being asked too early unless it knows what opened it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
