<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-11
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1099 required that a rendered reader-facing file carry none of a named set of words, and asserted it with a scan. The first scan read the whole file and refused the fixture Draft, because the Draft is an article about the pipeline and its own prose says 'in the path's recorded order'.

## The learning

A banned-word check over a generated document must be scoped to the half the generator wrote, not the whole file. A document that embeds material supplied by someone else — a quoted passage, a user's text, an article about the very system that renders it — will legitimately contain the words the generator is forbidden to use, and a whole-file scan then refuses the document for its subject matter rather than for a leak. Split the file at the boundary where the supplied material begins, scan only what the generator authored, and state in the check what falls outside the scan, because that residue is the price of not producing false refusals and a reader needs to know it exists. Keep the word set as data beside the definitions so a term coined later joins it in the act that coins it, and remember the list is a cheap first pass rather than the criterion: it catches coined identifiers and cannot catch a sentence that is internal in meaning while made of ordinary words.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
