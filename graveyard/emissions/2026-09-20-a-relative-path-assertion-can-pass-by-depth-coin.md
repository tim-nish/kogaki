<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-20
repo: Kogaki
grain: lesson

## Trigger — what happened

A review round blocked PR #1169 on a red suite member. The same case failed at master in a fresh worktree and passed in the PR's own worker tree at the same commit, so the variable was the absolute path the suite ran from, not the code. Instrumented, the record under test composed some pointers relative to the process's working directory and others relative to the record's own file, and the working-directory ones only resolved when the climb of ../ happened to land on the directory holding the temp root. A climb longer than the base saturates at the filesystem root instead of erroring, which is what turned a wrong pointer into a passing one.

## The learning

When a test resolves a relative path, its verdict can be a fact about where the checkout sits rather than about the code. Two things make that invisible. A relative climb that runs past the top does not fail; it stops at the root, so an over-long path still resolves to something and a wrong answer reads as a right one. And CI usually runs from one fixed directory depth, so the coincidence is stable: the check is green on every machine that happens to match and red on every one that does not, which reads as flakiness rather than as a defect. Two defences, and they are cheap. Compose a stored pointer relative to the file that stores it, never to whatever directory the process was started in, because the reader of that pointer opens the file and not the process. And assert the path from two working directories of different depth, so the test measures the pointer instead of inheriting the caller's location. When one artifact already mixes both conventions, the consistent half is the evidence for which one was intended.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
