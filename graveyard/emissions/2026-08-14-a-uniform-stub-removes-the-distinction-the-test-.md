<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-14
repo: Kogaki
grain: lesson

## Trigger — what happened

A change added a test for a behaviour that depends on an upstream step having run. The test set up that upstream step with a stub that answered the same way to every question it was asked. Because the stub was uniform, the upstream step succeeded for every input, not just the one the test cared about — so the system took an early exit and never reached the behaviour under test at all. The test passed. Then the fix it was written to protect was deliberately reverted, and the test still passed. It had been asserting nothing. Nothing about reading the test would have shown this; it looked exactly like the working version.

## The learning

A test whose setup uses one uniform answer for every input has quietly removed the distinction the test depends on. It is a specific and common trap in stubs that stand in for a lookup — returning the same value for all keys is the least effort and makes every branch succeed, which usually means the system short-circuits somewhere earlier and the case under test is never reached. The passing result then measures nothing, and it is indistinguishable from a real pass by inspection. The habit that catches it costs one run: after writing the test, break the thing it protects and confirm the test fails. If it does not, the test is decoration, however carefully it was written. The narrower design rule is to make a stub answer differently for the inputs the case must tell apart — a table rather than a constant — because the whole point of the setup is to create the difference the assertion reads.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
