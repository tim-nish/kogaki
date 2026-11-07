<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-11
repo: Kogaki
grain: lesson

## Trigger — what happened

An issue was parked with the trigger 'awaiting cross-repo issue #296 reaching a terminal state'. That issue closed, but the condition the park actually stood for — that some grant is refused somewhere — did not become true for another two days, because the fix was merged and not installed. The trigger and the property it proxied diverged.

## The learning

A park or a wait keyed to another ticket's status is keyed to a proxy, and the gap between a fix being merged and the fix being in force is exactly where that proxy lies to you. The issue closing is evidence someone did the work; it is not evidence the work is running where you need it. When you write a waiting condition, write the property you are actually waiting for — the behaviour you could go and observe — and if the only cheap trigger is a ticket state, say in the park that it is a proxy and name the observation that would confirm the real thing.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
