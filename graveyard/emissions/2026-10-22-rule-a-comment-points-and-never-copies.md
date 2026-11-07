<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-22
repo: Kogaki
grain: lesson

## Trigger — what happened

Drafted 2026-10-22 in the same kogaki sitting as one-unit-one-responsibility, as a hub Rule, and never filed where Rules live: no file in gukan grains/rules or mondo/staging carries it as of 2026-10-23. Re-emitted verbatim so the intake miner reaches it.

## The learning

Rule `a-comment-points-and-never-copies`: A comment in an implementation file is a pointer to the record that holds its reason, and the invariant the code beneath it depends on. Content recoverable from the record it cites (history, argument, alternatives, restated specification, lists of declared limits) is a copy and is cut to the pointer; content that has no record goes into one before the pointer is written. An Issue that adds or changes a comment shows it; the merge lands no comment the Issue did not show, apart from the one-line pointer to the Issue itself.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
