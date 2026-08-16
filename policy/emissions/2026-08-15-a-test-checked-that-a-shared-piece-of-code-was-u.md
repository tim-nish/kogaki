<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-15
repo: Kogaki
grain: lesson

## Trigger — what happened

A test checked that a shared piece of code was used in two places by counting how many times its name appeared in the file. The count could never be too low: the name also appears in the test's own calls, in the number it compares against, and in the two failure messages. Deleting both real uses left the count comfortably above the threshold, so the check stayed green on exactly the situation it was written to catch.

## The learning

A test that counts occurrences of a name inside the same file that contains the test will count itself. Its own calls, its own error text and the literal it compares against all match, so the total sits far above any threshold you would pick, and the check cannot fail. Two habits close it: count only in the region the property is about rather than the whole file, and before trusting any counting check, delete the thing it guards and confirm the number actually drops below the line. The wider rule is that a check searching a file it lives in is measuring its own text as well as the subject, and the more the check explains itself in prose, the more of its own evidence it manufactures.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
