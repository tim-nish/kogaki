<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-18
repo: Kogaki
grain: lesson

## Trigger — what happened

A worker implementing kogaki#1149 added one member to checks/registry.json and, in the same rewrite, dropped an unrelated member's case_floor_note — the provenance line recording an earlier raise. The suite stayed green, because no check reads that field; the loss was found only by diffing the file member by member against its parent.

## The learning

When a change adds an entry to a shared list file, check what else in that file moved. A tool or a model that rewrites the whole file to append one item can quietly drop fields from entries it was never asked to touch, and the usual signals miss it: the file still parses, the tests still pass, and the diff reads as an addition because the removed lines sit far from the added ones. The fields most at risk are the ones nothing reads back — notes recording why a number was raised, who authorized an entry, what would justify removing it. Compare the old and new versions entry by entry rather than line by line, and treat any field that disappeared from an entry the change does not name as damage until shown otherwise.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
