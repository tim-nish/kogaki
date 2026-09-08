<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-08
repo: Kogaki
grain: lesson

## Trigger — what happened

Writing the reader for an invariant the repository stated in prose and computed nowhere (kogaki#986). Its self-check arm built its mutants by copying the tree's own declaration and editing it. Run against a tree carrying the real defect, the arm produced two failures that were both false and one of them inverted: it reported that the reader misfires, at the moment the reader was working correctly.

## The learning

A check that asserts it can still detect its defect usually builds the specimen by copying whatever the tree currently holds and editing that copy. This is silently conditional on the tree being healthy. When the tree already carries the defect, every mutation inherits it: removing the thing that is already missing changes nothing, so the detection arm goes quiet; adding a duplicate of something present zero times yields one, so that arm goes quiet too; and the control arm, which exists to prove the check does not cry wolf, re-reports the tree's real defect as evidence that the check itself is broken. So the instrument is least trustworthy and most misleading in exactly the state it exists for, and its own output points the reader at the check rather than at the defect. The fix is not more arms: it is that the baseline a discrimination arm mutates must be well-formed by construction rather than sampled from the subject. Build it from the same live inputs so the specimen stays real - here the case names still come from the actual dispatcher - but assemble them into a known-good arrangement the arm owns. Then the arm reports the same thing about the instrument whether the subject passes or fails, which is the only thing an assertion about an instrument can usefully mean.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
