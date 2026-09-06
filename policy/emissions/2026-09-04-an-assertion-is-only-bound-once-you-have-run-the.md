<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-04
repo: Kogaki
grain: lesson

## Trigger — what happened

Three times in one sitting, a test asserted something adjacent to the property instead of the property. One matched a caption written by the same change under test. One varied two inputs where only one should have moved, so a wrong implementation would have produced a difference and passed. The third injected a fault through a display path that the change was removing. Every one of them read correctly. Two of the three were found by a reviewer, and the third only by constructing the specific wrong implementation and watching the test stay green - and the second happened after the lesson from the first had already been written down.

## The learning

Reading a test tells you what it says; only running a wrong implementation past it tells you what it binds. The gap between those is where tests quietly stop being evidence, and it does not close by being careful, because the mistake is invisible from the inside - the assertion mentions the right words, sits in the right case, and passes for a reason you never examined. So the check that costs something is the one worth doing: name the specific wrong implementation the assertion exists to reject, build it, and confirm the test goes red. If you cannot state that implementation concretely, the assertion has no defined subject yet. Two shapes recur often enough to look for by name: an assertion that matches text the same change introduced, and a discrimination test that varies more than one input, where a difference proves only that something depended on something. And knowing the pattern does not prevent it - the sitting that recorded it reproduced it twice more the same day - so the protection has to be the mutation, not the knowledge.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
