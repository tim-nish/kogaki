<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-21
repo: Kogaki
grain: lesson

## Trigger — what happened

A PR with auto-merge already armed merged the instant its review report landed with no blocking finding, and the fix round for the report's four real findings was foreclosed — the licence deny then refused the already-written repairs because the merge had closed the licensing issue

## The learning

Arming auto-merge before a review report exists sets up a race the review cannot win: a report whose findings are all non-blocking turns the gate green at the moment it lands, the merge fires, and every finding that would have been fixed in the next round instead needs a fresh issue and a fresh pull request. The order that keeps the fix round reachable is to hold the merge switch until the report has been read and its findings dispositioned, and only then arm it. The cost of the wrong order is not the findings themselves but the doubled ceremony of re-licensing work that was already done.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
