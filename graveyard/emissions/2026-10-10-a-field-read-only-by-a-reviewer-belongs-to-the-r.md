<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-10
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1324: the Move record's question field was read by path review's question chain but never handed to the composer, so review judged Candidates against information the writer never had

## The learning

When a review compares a produced artifact against a source field, check first that the producer was given that field. If it was not, the review is grading the source, not the work, and a failing verdict tells the producer nothing it could have acted on. Remove the field from the review, or hand it to the producer — never keep it on one side only. Removing it also removes every guard that existed only to keep it consistent, so the checks that tested those guards are retired with it rather than pointed at something new.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
