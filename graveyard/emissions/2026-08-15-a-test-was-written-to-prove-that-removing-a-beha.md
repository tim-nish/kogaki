<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-15
repo: Kogaki
grain: lesson

## Trigger — what happened

A test was written to prove that removing a behaviour breaks the test. The test built a stripped-down copy of the program with that one behaviour deleted, ran it, and checked that the expected output was missing. The output was missing — but because the stripped-down copy was missing files the program needed and died before it ever started, not because the deleted behaviour was gone. The check reported the deletion as caught while proving nothing, inside the very case written to stop that from happening.

## The learning

When a check proves itself by deliberately breaking something and confirming the failure, the broken version must be shown to have RUN before its missing output means anything. Every such check reads an absence, and an absence produced by a crash looks exactly like an absence produced by the removal — so the check passes either way and its reassurance is empty. Assert that the broken version started and finished normally FIRST, then read what is missing. This bites hardest when the broken copy is assembled rather than edited in place, because assembling one is where a needed file gets left out, and the resulting crash is silent to a check that only looks at the output.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
