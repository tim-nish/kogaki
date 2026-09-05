<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

An issue filed on 2026-09-04 listed thirteen sections of a specification to remove, each naming the section and what in it was past policy, read against version 34 of the file. It was picked up the next day. Version 35 had landed in between, under a different issue. Three of the thirteen items were already done. A fourth described what a piece of machinery measures, and the description was wrong in two independent ways: the machinery had been changed to measure something else, and the issue proposed removing it as unused when a self-test and a status read both depend on it and it had already caught a real defect. Every one of the thirteen items still named a real section, so nothing about the list looked stale.

## The learning

A list of things to remove from a document is a set of claims about that document at the moment the list was written, and the document keeps moving afterwards. What makes the staleness invisible is that the list stays well-formed: each entry still names a section that exists, so reading the list tells you nothing about whether it is still true. An item that is already done reads exactly like an item that is not, and an item whose reason has been overtaken reads exactly like one whose reason still holds. So the act of picking such a list up is re-reading the document and re-deriving each item against it, not executing the list. Two things follow that are worth doing rather than intending: report the already-done items rather than silently skipping them, because a reader cannot tell a skipped item from an overlooked one; and where an item's stated reason turns out to be false, say so and do not execute it, because executing a removal on a false premise removes something that is load-bearing while the list still reads as though it were authorised.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
