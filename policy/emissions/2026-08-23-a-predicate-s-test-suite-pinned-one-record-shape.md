<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-23
repo: Kogaki
grain: lesson

## Trigger — what happened

A predicate's test suite pinned one record shape to 'no', with the stated reason that the runner does not produce that shape and an unexpected shape must not silently grant something. The runner then produced it, and the pin converted a real, diagnosable event into a silent loss of exactly the resource the conservative default was protecting.

## The learning

A test case that pins a shape the system is believed unable to produce is a PREDICTION wearing a fixture's clothes, and its default direction is a bet about which error is worse for a case nobody has seen. That bet is usually made on the safe-sounding side — refuse, deny, do not grant — but safety has a direction only once the shape's meaning is known, and here the shape meant 'this never ran', so refusing to act on it kept a resource spent that nothing had used. The tell is a fixture comment that argues from IMPOSSIBILITY rather than from meaning: 'not a shape the runner produces' is a claim about the world that the fixture cannot check and that no failing run will ever contradict, because the pin makes the failure silent. So when pinning an unreachable shape, record what the pin would COST if the shape did occur, and prefer a pin whose failure is loud over one whose failure is a quiet default; a shape you cannot produce today is a shape you will meet without warning.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
