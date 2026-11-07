<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-24
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1571's Acceptance asked for both a grep finding no literal name of a retired key in src and checks, and for that key to be refused naming it

## The learning

When an Issue retires a key and also asks a grep to find the key's name nowhere, the refusal can still name the key without spelling it: let a generic 'this key is not declared' rule report whatever key it finds. The record reader already refused undeclared keys by name, so dropping the key from the declaration was enough, and a tests-side copy of the name can be built from parts. Writing a dedicated refusal message that spells the name would have broken the grep the owner asked for.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
