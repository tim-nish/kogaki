<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A watcher waiting for a review round's report file also grepped its log for terminal words including 'error' and 'failed'. The log is a JSON event stream in which every tool result carries the field is_error:false, so the watcher fired within seconds, reporting a finished round that had barely started.

## The learning

A watcher that widens its terminal-state pattern to avoid missing a failure will match the words it is looking for inside structured log content, where they appear as field NAMES rather than as states. JSON and key-value logs are full of them: is_error, failed_count, status. The result is worse than the miss it was guarding against — a false completion looks exactly like a real one and the next step proceeds on it, whereas a missed completion just waits. Anchor the pattern to the log's own line format for a message rather than searching anywhere in the line, and where the job writes a completion ARTIFACT, prefer waiting on that: a file that exists is a fact no log wording can imitate.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
