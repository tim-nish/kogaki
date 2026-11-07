<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-01
repo: Kogaki
grain: lesson

## Trigger — what happened

A spec amendment superseded a design. The first fix propagated it to the clause that was changed, and review found six other sentences restating the same fact still reading as current. The second fix swept the whole document for the superseded fact rather than the clause, and review found four more inside the very sections that had been amended — one of which left the section declaring the change both made and declined, which parked the pull request at its bound. The third fix swept by fact with an explicit grep list of eight terms, accounted for every hit, and re-swept clean. Review then found a fifth site whose wording was the singular of a term the list carried in the plural.

## The learning

Widening the unit you sweep for buys one round, not the class. Clause → fact looks like a change of kind and is a change of degree: a sweep by fact is executed as a sweep by TERM LIST, and every phrasing the list does not spell survives exactly as every sentence survived when the unit was the clause. The list is the new clause. The residue does not shrink, it moves one term further out, and each round it reads as freshly verified because the sweep just ran and came back clean. Two things follow. Judge such a repair by whether the next miss is CHEAPER, not by whether it is absent — here the misses degraded from unsatisfiable-grammar blockers to a stale sentence pointing the same way as everything around it, which is real progress the absence test would score as failure. And where the document is the only reader, no mechanical sweep closes it: what closes it is a reader who must resolve the references, which is why an amendment and the implementation that consumes it belong in one sitting.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
