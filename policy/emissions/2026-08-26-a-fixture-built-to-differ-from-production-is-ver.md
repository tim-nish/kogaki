<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-26
repo: Kogaki
grain: lesson

## Trigger — what happened

A check was written to prove a runtime reads its sequencing from a table rather than from hard-coded position. The fixture table deliberately moved a handoff so that its first stop was its FIRST state, where the production table's first stop is its third. The assertion read the stop's NAME. Mutating the fixture to un-move the handoff — putting a compute back in front of the wait — left the stop's name unchanged, so the mutation passed and the check proved nothing about position. The repair asserted that nothing had completed at the moment of that first stop, which is what the moved handoff actually means.

## The learning

A fixture that exists to DIFFER from the production artifact carries its difference in a specific dimension, and the assertion over it must be written in that same dimension or it tests a coincidence. The failure is easy to miss because the assertion passes, the fixture really is different, and the difference really is the one intended — all three are true while the test binds none of them. What went wrong is that the fixture's identity (a distinctive state name) was available and cheap, and the fixture's PROPERTY (nothing precedes the handoff) needed a second read to observe.

The diagnostic is to state what the fixture would look like if its difference were undone, and check whether the assertion still passes. If it does, the assertion is reading identity rather than difference. This is cheaper than it sounds because such a fixture is authored by someone who has just written down what makes it different — the comment above it usually states the property in words the assertion could have used.

The class is worth separating from ordinary proxy-binding because of where it recurs. A fixture built to be different is exactly the artifact whose author is most confident the test is meaningful, since they constructed the meaning themselves; and the assertion is usually written immediately after the fixture, when the difference is most obvious and therefore least likely to be spelled out. Confidence and under-specification arrive together.

The general form: when a test's subject is a CONTRAST, the assertion must be false under the contrast's absence. Anything weaker measures that the fixture exists, which nobody doubted.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
