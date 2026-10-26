<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-15
repo: Kogaki
grain: lesson

## Trigger — what happened

Issue #1384 (Proof Sheet Extractor row) did not close. Its worker ran ten minutes, made 22 Reads and 11 Greps and no Edit, auto-compacted at 172K tokens on a 200K-window model, and was reaped eleven seconds later with reap-row state=compacted-without-progress. The worktree is clean; no PR exists.

## The learning

The admission budget sized the read at 70 KB for the plan's four files, three of them new and empty. But the Issue's Design section tells the implementer to model the row on paragraph-plan-workflow.json, the judgePrompt renderer, detached-job.mjs, FORMAT.md and move_ingest.py, none of which is in the plan's files list, so the budget never counted the reading the design requires. The worker read about 238 KB of those references plus 39K thinking tokens and ran out of context before writing a line. The reaper then treats a compaction with nothing committed as a dead cell. When a Design names reference files to model on, admission must size the window against those files too, or the plan must carry a regions list for them, or the worker must be told to commit a scaffold before reading further.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
