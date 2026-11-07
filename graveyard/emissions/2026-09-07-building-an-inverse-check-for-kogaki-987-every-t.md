<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

Building an inverse check for kogaki#987 — every table row must name something its own file names. It passed a synthetic mutation (an invented row) and PASSED the real founding defect (PR #984's phantom row) at the same time, because the row parser compared an ABSOLUTE indent and the JSON host adds its own array indent in front of the table's: all six JSON tables contributed zero rows, 127 read instead of 225.

## The learning

Mutate a new check against the ORIGINAL defect verbatim, not against a synthetic instance of its class — a synthetic mutation is authored in the shape the parser already handles, so it can pass while the real specimen sails through, and the check then reports a clean tree over exactly the files the defect was found in. The founding case is also the cheapest one to hold: it is already written down in the issue that licensed the check. And print the COUNT the check read beside its verdict, because a red-blind pass and a genuine pass are the same line otherwise.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
