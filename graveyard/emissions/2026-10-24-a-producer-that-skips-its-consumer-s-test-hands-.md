<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-24
repo: Kogaki
grain: lesson

## Trigger — what happened

Four-Leg Proof Sheet run leg-run-2026-10-24T10-59-33-199Z stopped at ingest with '(no output)'; the Extractor had accepted obligation items naming the original's terms that the Move adapter refuses.

## The learning

When two stages read the same record, the earlier one should run every test the later one will, or the refusal lands where nothing can retry. Here the Extractor has three attempts and checks an obligation item only for shape; the ingest checks that each item shares a word with the reader's after-state and refuses once, stopping the run. The stop also printed nothing, because the refusal was written to a record file and the stop line reads only the process output. Two rules: the producer validates what the consumer will refuse, and a stage that stops prints the refusal it recorded.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
