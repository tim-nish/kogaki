<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

A check named a REQUIRED item as one it had 'stopped matching', because its predicate admitted on either of two tells and the item had gained the second. The obvious repair — require both tells — would have re-admitted the silent drop the predicate was widened for in the first place. The repair chosen was a third signal: an explicit marker that overrides both tells. But the same marker was available at two sites, and adding it at both would have created a new way for a live item to leave the coverage list unnoticed.

## The learning

When a predicate is narrowed to stop a false positive, ask at which of its call sites the narrowing belongs — not merely whether the narrowing is correct. The same guard is usually applicable at several sites, and applying it everywhere reads as consistency while quietly opening a new silent escape: the item now fails to be reported AND fails to be listed, which is the failure the check existed to catch, wearing the repair's clothes. Guard the site that reports, leave the site that enumerates, and assert the difference — an item that escapes the report while staying in the enumeration is still observable, and one that escapes both is not. More generally, a narrowing removes behaviour, so it owes an inventory of the behaviours that must survive it, each with the test that fails if one stops holding; the alternative that was declined is part of that inventory and belongs in the same act, or a later reader meets the appearance of an oversight instead of the reasoning.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
