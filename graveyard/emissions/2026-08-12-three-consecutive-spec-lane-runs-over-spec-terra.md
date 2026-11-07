<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-12
repo: Kogaki
grain: lesson

## Trigger — what happened

Three consecutive spec-lane runs over SPEC-terrain §13 produced no implementation and found no defect in it. The first run of the actual subcommand found two, and both were the same shape: a well-formed empty result that is indistinguishable from a legitimate one. The wiring handed candidate ids into a slug key space and every lookup missed; a sibling command sends an argument key the seam does not declare, gets the miss shape back, and composes a survey with zero candidates while exiting zero.

## The learning

When a specification says an empty result is informative, an empty result stops being evidence of anything. Every wrong lookup in that code path now returns something the design says is fine, so the defect has no symptom left to show and no reader downstream can tell the two apart. Specification review cannot reach this: the spec is satisfied in both cases. Running the product is what separates them, because a real corpus makes the legitimate empty rare, so an empty that appears immediately is a defect showing itself. Where a code path can return an empty the design blesses, make it report what it could not resolve rather than only what it found, and run it against real material before believing it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
