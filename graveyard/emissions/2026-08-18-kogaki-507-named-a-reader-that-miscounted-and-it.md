<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-18
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#507 named a reader that miscounted, and its acceptance specified fixing that reader's predicate. Before implementing, a grep for the marker the reader parses found a second reader — a registered check — which handled the ambiguous case correctly only because its assertion happened to require a cite-shaped prefix. One writer rendered both the present and absent states on the same line with only the value differing.

## The learning

An issue that reports a reader is reporting where the defect was noticed, not necessarily where it lives, and the cheapest way to tell the difference is to grep for the thing the reader parses and count who else parses it. Two or more readers of one rendering means the rendering is the shared surface and the repair belongs there; the count also tells you something the issue cannot, because a second reader that currently behaves correctly may be correct by accident of its own fixture rather than by design, and that one will not be listed as broken anywhere. Fixing the projection then makes every reader correct without touching them, including the ones added after you stop looking — and it converts the evidence from an argument into a mutation, because reverting the rendering fails both the rendering's assertion and the reader's, which a reader-side fix could never show.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
