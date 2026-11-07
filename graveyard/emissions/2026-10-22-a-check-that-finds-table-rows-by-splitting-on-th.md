<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-22
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1516 moved each binding's before / after table into a fold inside its binding's own row on the Proof Sheet; the sheet check found binding rows by splitting the HTML on the row-opening tag, so each row was cut off at the first row of the nested table and the check read the binding's why and the fold as missing.

## The learning

When a change nests one table inside another table's row, a check that finds rows by splitting on the row tag stops seeing whole rows. Find each outer row by where it starts and read up to where the next one starts, and count the outer rows only after removing the nested parts. Then make the check fail against the old rendering and against a deliberately wrong one before trusting it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
