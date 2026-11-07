<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

A staleness gate reported that an issue had no successor, at a moment when its successor had just been created and both were open. The gate is meant to notice an issue that keeps being worked without resolving, and one of its signals asks whether a replacement has appeared. Writing the pointer as a comment on the original changed nothing; writing it into the original's own text was recognised as valid notation and still reported no successor. Only writing it into the SUCCESSOR's text, naming the original, made the gate see the pair.

## The learning

A link between two records has a direction, and a reader that walks it only one way is satisfied by exactly half the ways people will write it. Both directions look correct to the author and to any check that merely validates the notation, so the wrong one fails silently and the gate reports the healthy answer — which is worse than an error, because the whole point of that gate is to report the unhealthy one. Two things follow. State, next to the notation, which record carries the pointer and which is named by it, because a reader who knows the notation still has a coin flip. And verify a link by re-running the read that consumes it rather than by looking at what you wrote: the writing succeeded all three times here, and only the read distinguished them. The same trap covers comments versus body text — a comment can be the natural place to explain a link and the wrong place to declare one, and nothing says so at the moment of writing.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
