<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-10
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1326: admission refused a 13-file plan at 250 estimated tool calls against a 200 ceiling, and narrowing every file to line ranges left the estimate at 250

## The learning

The worker budget an admission checks is counted per file, by the file's size, and the line ranges a plan names only change how much the worker reads, not how many calls it is expected to make. So a plan over the call ceiling cannot be brought under it by narrowing; only fewer files, a session-run election, or splitting the Issue does. And a run stopped this way leaves nothing its close can read, so the run ends without a rendered close.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
