<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-18
repo: Kogaki
grain: lesson

## Trigger — what happened

Implementing kogaki#505 added a derived read and the line that prints it. The read's own fixtures covered membership, ordering and the empty cases and all passed. Deleting the printing site entirely left those fixtures green — the function was still correct and still called by nothing a user sees. Only a separate end-to-end assertion against a real run caught it.

## The learning

A fixture that imports a function and asserts over its return value cannot tell you whether anything calls it. That is not a gap in the assertions; it is what unit-level coverage means, and it reads as thorough precisely because every case it does hold is genuine. So when a change adds both a computation and the place its result reaches a reader, ask which layer would fail if the second half vanished — and if the answer is none, the reader-facing half is untested no matter how many cases the first half has. Test the deletion, not just the logic: remove the call site, run the suite, and see which layer goes red. When the answer is 'none of them', you have found the assertion you still owe rather than confirmed the ones you wrote.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
