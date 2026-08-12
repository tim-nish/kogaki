<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-12
repo: Kogaki
grain: lesson

## Trigger — what happened

A merged spec amendment had a summary table stating its rule more loosely than the scope sentence it summarised: the scope sentence said 'a NON-GATING in-diff finding that is latent', the table's rows said just 'latent'. The issue named the remedy as one word, in the row labels or in a caption. I wrote the caption — 'EVERY ROW BELOW READS NON-GATING' — and it was wrong in the opposite direction. The table had four cells and only one of them was non-gating-only; the other three were correct about gating findings before my fix and my caption denied it of them. Round 1 of the review found it. The corrected form, scoping the qualifier to the single cell that moved, then left a third state with no destination in the table at all, which round 2 found and declined as past the budget.

## The learning

When a report tells you a statement is too loose, it names one direction and says nothing about the other, and the repair is drawn toward the named side until it crosses over. Loose and tight are not a defect and its absence; they are two defects with one correct point between them, and only one of them has just been written down for you in a review comment. So after fixing an under-qualification, re-read the artifact asking what the new wording now DENIES, not only what it now asserts — the denial is where the overshoot lives, and it is invisible from the report you were working off. The mechanical version of this is cheap where the artifact is a table or an enumeration: check the qualifier against every cell rather than against the cell the finding quoted. Mine failed on three of four. Worth knowing too that landing the correct point can still leave a residue rather than a clean fix: scoping my qualifier to the one cell that earned it left a reader whose case matched a row but no cell in that row, which is a smaller gap than either of the first two and was correctly declined rather than chased. A repair budget is spent on the direction of the error, and the third round is usually worth less than the precision it buys.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
