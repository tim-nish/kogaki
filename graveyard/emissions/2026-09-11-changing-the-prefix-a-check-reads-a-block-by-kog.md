<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-11
repo: Kogaki
grain: lesson

## Trigger — what happened

Changing the prefix a check reads a block by (kogaki#1094) exposed a fixture line that had never matched the old prefix, so the case built on it had been passing without exercising its own premise.

## The learning

A fixture that feeds a reader a line the reader does not match tests nothing about that line, and the case around it can still pass on assertions that hold either way. Here a test Packet declared an extra ground whose text did not start with the prefix the grounds reader keys on, so the reader dropped it: the case whose premise was "this Step declares a second ground carrying a digit" never had a second ground at all, and its assertions - that no comparison line carries a digit, and that findings quoting material carry it in their evidence - were true with or without the line. The absence was only visible when the prefix moved and every fixture line had to be re-read against it. A fixture line is an input only if the code under test accepts it as one, and a case that would pass with its distinguishing input removed is asserting something weaker than it says.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
