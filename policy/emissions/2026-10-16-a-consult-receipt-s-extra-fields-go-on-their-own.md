<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-16
repo: Kogaki
grain: lesson

## Trigger — what happened

PR #1405 (kogaki#1403) went red in CI on the consult-receipts check: its PR body carried request_id, outcome and query as key=value tokens after the pin on the same consulted: line, and the checker read the whole line as the pin and refused it as malformed.

## The learning

The consulted: line holds the pin and nothing else. Anything recorded about the consultation (request id, outcome, query) goes on indented lines underneath, one key: value per line. Put on the same line, the extra fields make the pin unreadable and the check fails, even though every value is correct. Because CI reads the pull request body from the event that started the run, fixing the body needs a close and reopen of the pull request to be seen, not a re-run.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
