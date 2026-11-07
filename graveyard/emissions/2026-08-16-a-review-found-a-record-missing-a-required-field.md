<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-16
repo: Kogaki
grain: lesson

## Trigger — what happened

A review found a record missing a required field. The repair added the field, but wrote its value as a sentence wrapped over six indented lines. The next review found that the reader for those records stops at the first line that is not a key followed by a value, so the repaired record now parses as that one field alone and silently drops the two fields that were already correct — the repair broke the thing it was satisfying, and only a second review caught it.

## The learning

When a required field is missing because its value genuinely cannot be recovered, the honest answer is to say so in the field — but say it in the shape the reader accepts, and put the explanation in the surrounding prose. A reader that scans records line by line usually stops at the first line it cannot parse, so an explanation written INTO a value truncates the record at that point and discards whatever came after it. The fields that vanish are the ones that were never in question, which is why the damage is invisible: the record still looks fuller than it did before. Check what reads a record before widening what you write into it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
