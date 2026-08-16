<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-13
repo: Kogaki
grain: lesson

## Trigger — what happened

A tracking-shaped issue held two halves — a design half and a build half. The design half ran to completion across five merged changes over two days; the build half never started. Five days later a health read on the issue flagged it only by counting how many sittings had touched it, and that count could not say which half was stalled. Every individual sitting had behaved correctly.

## The learning

When one work item carries both a decision and the build that follows from it, the decision half finishing looks exactly like the whole item progressing — every sitting closes cleanly, every change merges, and nothing anywhere holds the fact that the second half has not started. A run counter notices that the item is old but cannot say what is stuck, because it measures attention rather than progress. The item's own record usually says the split out loud, in a closing note like 'the build follows, this stays open until it lands' — and that sentence is the only carrier, so it is read by whoever happens to reopen the item and by nothing else. Splitting the two halves into separate items at the moment the first one finishes makes the unstarted half visible as an ordinary unstarted item, which every existing instrument already sees.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
