<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

Spawning review round 1 for PR #933 refused: the repository's standing review authorisation names no readable round bound, so no round can be spawned and the merge is held by the review-presence clause with nothing a session can do to clear it.

## The learning

A standing authorisation is not the same thing as a usable one. This repository's review lane was believed to be in standing grant mode — rounds spawn with no question asked — and every earlier sitting that spawned a round confirmed it. What that belief actually rested on was a record minted before the bound became part of the record. When the engine went to read how many rounds the standing grant licensed, it found nothing, and refused rather than treating an unreadable bound as an unlimited one. The failure surfaces only at the spawn, never at the dry run: the dry run said 'spawn-round-1' and the spawn said 'refuse'. So a lane can read as available right up to the moment it is used. The repair is an owner act in a plain terminal, outside any session, and a session cannot perform it or even inspect the record to confirm the diagnosis — it can only report the refusal text verbatim and stop. The general shape: when an authorisation gains a new required field, the records minted before it do not become invalid, they become unreadable, and unreadable is refused at the point of use rather than at the point of check.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
