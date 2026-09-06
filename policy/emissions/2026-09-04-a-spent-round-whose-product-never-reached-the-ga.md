<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-04
repo: Kogaki
grain: lesson

## Trigger — what happened

A review round on PR #852 ran to completion and wrote a full, well-formed report to disk. The reviewer session was denied the one command that posts a comment, so the report never reached the pull request. The lane recorded the round as 'authored-unlanded' and noted 'this round counts' — one of the two rounds the bound allows was spent. Meanwhile the merge condition reads pull-request comments to decide whether a head has been reviewed, and it read the head as unreviewed. The report existed, was complete, and was invisible to the only reader whose opinion gated the merge. The orchestrating session, which had the posting permission the reviewer lacked, posted the report itself and the condition then read correctly.

## The learning

When a worker's output only counts once it is delivered somewhere, the budget must be spent on delivery and not on production. Here the round was debited the moment the work was done, while the thing that made the work useful — putting it where the gate reads — was a separate step that failed silently and cost nothing to retry. That split is what makes the failure expensive: a bound protects against repeating work, and it had been spent on work nobody could see. Two things follow. Give the worker the permission its final step needs, or move the final step to something that has it — an artifact written to a private disk is not a delivery. And when a budget is consumed by a step that can succeed while delivery fails, make the record say which happened: 'authored-unlanded' is the right word, and it is only useful if something downstream reads it and finishes the delivery rather than treating the round as complete. Check what the gate actually reads, not what the job actually produced; those are different questions and only the first one decides anything.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
