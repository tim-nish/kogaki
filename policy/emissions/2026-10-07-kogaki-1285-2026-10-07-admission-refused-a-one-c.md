<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1285, 2026-10-07: admission refused a one-cell plan as too large for one worker window, so the run split it into two cells by file; the cell-1 worker implemented the whole Issue, including cell 2's files it was never assigned, and the cell-2 worker found nothing left and committed nothing, while both reported 'implemented' at the same head. Separately, the review round could not read the suite result because the engine passed checks run a non-integer --timeout ('7200.0').

## The learning

Splitting an Issue into cells by file size does not keep a worker inside its cell: a worker reads the whole Issue and builds all of it, so the later cell becomes an empty pass and the window budget the split was meant to protect is not actually enforced. Treat two worker results with the same head as one cell having done all the work, and check the branch diff rather than trusting each 'implemented' line. Also, a review round's 'suite cannot be determined' line can come from the review engine's own malformed checks invocation rather than from the change under review.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
