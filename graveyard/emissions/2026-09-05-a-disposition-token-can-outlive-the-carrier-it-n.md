<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A review report disposed two findings as `carried: register`. The register that token names was deleted from this repository two days earlier by owner ruling, and the ruling's own arm said the disposition is therefore unavailable here. The reports were written after the deletion, by an engine that still offers the token, and nothing at the writing moment or the reading moment said the destination was gone. The finding surfaced only because a later act went looking for the register in order to append to it.

## The learning

Retiring a destination does not retire the vocabulary that points at it. A disposition token is written by one system and resolved by another, so deleting the destination leaves every writer still emitting a pointer that now dangles, and every reader still accepting it. The tell is that nothing fails: the token parses, the report lands, the finding reads as disposed, and the observation is dropped. When a destination is removed, the removal is incomplete until either the writers stop emitting its token or resolving that token refuses by name. A ruling that says the disposition is unavailable is a statement about intent and binds no writer.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
