<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#816 made a word mean a different unit, and the design record disclosed the resulting name collision itself rather than leaving it to its carrier — enumerating five sites and widening the carrier issue's scope to match. Reading the tree at pickup found two more. One was the same word in a third spec document's prose; the other was a shipped CLI subcommand named four times in a skill file, coupled by a registered check to that file in both directions. The carrier issue's own constraint was 'rename every site in one act, or rename none and record the collision at each — but do not rename a subset', which is exactly what makes a missing site a defect in the act rather than a nit. Both records that carried the inventory — the design record and the issue — had the same two gaps.

## The learning

Disclosing a collision at the act that creates it is the right discipline and does not make the inventory complete: the enumeration is bounded by the SHAPE the disclosing act was looking at, and the sites it misses are the ones of a different kind. Here the act was scanning for a proper noun in prose, so it found every prose occurrence of the proper noun and none of the identifiers — a subcommand name, a skill file's invocation lines, an admission record's coverage floor — nor the same ordinary word in a third document it was not reading. The tell is that the missed sites are not scattered: they cluster by kind, so a reader who notices one has probably found a class rather than an instance. Two consequences worth acting on. Where a constraint says 'rename everything or nothing, never a subset', the inventory's completeness becomes load-bearing and is owed a fresh read against the tree at pickup rather than trust in the record that disclosed it — the record is evidence the collision was seen, never evidence it was seen whole. And where the missed sites include an entry point, the honest resolution is usually not to widen the rename but to SEPARATE THE NAMES: rename the one whose carrier is prose completely, retain the one whose carrier is an interface with its retention recorded at its sites. That satisfies both arms of the constraint once per name, and keeps a CLI move out of an act licensed to change what a document says.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
