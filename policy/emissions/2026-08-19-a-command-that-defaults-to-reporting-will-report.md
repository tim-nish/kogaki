<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-19
repo: Kogaki
grain: lesson

## Trigger — what happened

A reviewer had to be summoned for a pull request. The tool that summons reviewers was invoked with a flag naming the pull request. It printed a long, healthy-looking report and exited successfully. Nothing had been summoned: the tool defaults to a describe-only mode, and the flag naming the target does not switch it into acting. The intent to act is a separate flag.

## The learning

A tool whose default is to describe rather than to do will answer a request to act with a description, and the description looks like success. Naming the target is not the same as asking for the act, and a tool built this way is built correctly - the safe default is not to touch anything. The failure is on the calling side: reading the exit code, seeing zero, and reporting the act as done. What catches it is checking for the trace the act would have left rather than the absence of an error. A spawn leaves a log, a write leaves a file, a send leaves a receipt; a description leaves none of those and says so somewhere in its output, usually in a line nobody reads because the exit was clean. So before reporting that something outward happened, look for its artifact. And when a tool has both a describe mode and an act mode, assume the one you did not name is the one you got.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
