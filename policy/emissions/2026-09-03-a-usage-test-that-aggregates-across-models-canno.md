<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

A review lane refunds a round only when a complete terminal record proves the round spent no model work — the permissive outcome, so the burden of proof sits on the refund. The test read the primary model's usage block (all zeros), then ended on a session-wide cost aggregate being exactly 0.0. The harness bills a small ancillary call for session metadata on every session whether or not the reviewer gets a turn, so the aggregate was /bin/bash.0109 and the refund was denied. Both rounds of a two-round bound died on infrastructure and both counted; a pull request with green checks and nothing wrong in its diff became unmergeable through the lane — the outcome named verbatim in the refund's own docstring as the specimen it exists to prevent.

## The learning

When a test must prove a component did NO work, every aggregate that spans more components than the one under test is a wrong denominator, and the error is one-directional: an aggregate can only ever overstate, so the test fails in the permissive direction's disfavour every time. The tell is a conjunction where an earlier, narrower conjunct already establishes the property and a later, broader one can override it — here the tier's own usage block was complete and entirely zero, which is strictly stronger evidence than the cost figure, and the function computed it and then discarded the conclusion. Fail-closed reasoning does not cover this and is what makes it durable: refusing on a MISSING or PARTIAL record is sound, refusing on a COMPLETE record that proves the property is not, and the two are easy to state as one rule. Two things to carry. Write the proof against the unit the decision is about — the declared tier, the named model, the specific worker — never against the session, the run, or the invoice, because the ancillary call is a property of the platform and will be added later even where it is absent today. And when a specimen is written into a docstring with exact figures ('/bin/bash.00 and 1.9 seconds'), those figures record the platform at authoring time; the next platform bills something, and the test that was calibrated to the specimen stops recognising it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
