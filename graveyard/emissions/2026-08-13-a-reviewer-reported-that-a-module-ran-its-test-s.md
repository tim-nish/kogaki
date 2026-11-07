<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-13
repo: Kogaki
grain: lesson

## Trigger — what happened

A reviewer reported that a module ran its test suite at load time, so importing any of its exported functions produced output and could terminate the importing process. The repair added an entry-point test and skipped the suite on the import path — but left the early return that followed it as a process exit. Importing the module now killed the importer immediately instead of merely printing. The repair was verified by reading the diff, which looked right; it was caught only by actually importing the module in a one-line command, whose output was nothing at all.

## The learning

A defect in what a module does AT LOAD cannot be repaired by reading, because the thing being fixed is a side effect and a diff shows only the code that causes it. The reading is especially convincing here: an entry-point guard is a familiar idiom and its presence looks like the fix, so review attention stops at the guard and never reaches the statements after it. Run the import. It is one line, it takes a second, and it distinguishes the three outcomes a reading cannot — clean, noisy, and fatal — which is more than the diff can show. The general form is that a fix to a side effect must be verified through the SAME channel the side effect travels: load-time behaviour by importing, output by capturing stdout, exit status by checking it. And note the specific trap this instance carries: SILENCE IS THE SYMPTOM. An import that prints nothing looks like the clean case and is also what a process that exited before printing looks like, so the check must assert the positive — that the expected value came back — never merely that nothing bad appeared.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
