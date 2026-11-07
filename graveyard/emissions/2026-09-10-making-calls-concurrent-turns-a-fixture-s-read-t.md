<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-10
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1073 made eleven per-group judge calls run concurrently under a declared cap. Two existing check stubs picked their 'target' by reading a marker file and writing their own name if it was empty. Sequentially exactly one call ever found it empty; concurrently both did, both named themselves, and the case that asserts exactly one refusal saw two. The check went red intermittently, and the failure text described the SUBJECT rather than the fixture.

## The learning

A fixture that records 'whichever call got here first' with a read-then-write is correct only while the calls are serialized, and nothing in it says so. When the change under test is what removes the serialization, the fixture breaks in the same commit that fixes the defect, and its failure text points at the subject rather than at itself -- so the first reading is that the repair is wrong. The tell is a fixture whose state file is shared across calls the change is about to run at once; the fix is an exclusive claim (create-if-absent, or write-a-temp-then-link), which is race-free and leaves the fixture's stated property -- that exactly one call is the target -- true under both widths. Worth separating from the subject's own concurrency review: the subject may be correct and the suite still red.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
