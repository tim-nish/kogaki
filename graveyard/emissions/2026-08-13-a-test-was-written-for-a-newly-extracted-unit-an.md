<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-13
repo: Kogaki
grain: lesson

## Trigger — what happened

A test was written for a newly extracted unit and its new call site. It passed. Mutation testing was then run before shipping, and two mutants survived: deleting the call to the unit from the call site, and having the call site pass a wrong constant. Both survived because the test invoked the unit directly with the right arguments, which proves the unit works and is equally true of a build where the call site never calls it at all. Rewriting the test to drive the call site killed both. One further mutant — the caller passing a literal instead of the real value — was killed only by asserting the call's own line shape from source.

## The learning

A test that calls a unit directly is testing the unit, and the thing that usually breaks is the wiring. The two are easy to confuse because a unit test written while implementing the wiring FEELS like it covers the wiring — the arguments in the test are the arguments the caller passes, typed from the same mental model minutes apart. The mutation that separates them is not subtle and takes one minute: delete the call from the caller and see whether anything fails. If nothing does, the suite is blind to the integration it was written for. Two practical follow-ons. Drive the outermost real entry point you can afford to, stubbing only what genuinely reaches the network or the filesystem, because every layer you skip is a layer no assertion covers. And where the defect would be a caller passing the WRONG value rather than no value, no behavioural test at that layer can see it — the value is correct from the callee's side — so assert the call's own shape from source; it is the cheapest instrument that binds an argument to its meaning.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
