<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A test's mutation-evidence enumeration was found to list three entries no current head can execute, and the apparent arithmetic bug under it turned out to be an undeclared unit rather than a miscount: the same physical edit had been run at two heads against two different assertion sets, and the record counted both.

## The learning

A tally over historical trials is ambiguous until its UNIT is written down beside it, and the ambiguity surfaces as a false arithmetic bug rather than as a question. Counting trials taken and counting distinct changes give different totals the moment one change is tried twice against different assertions, and every reader who meets the number without the unit re-derives whichever reading they brought. The repair is one sentence at the arithmetic, not a correction to the sum: the sum was right under one reading and the reading was never stated. Two related properties travel with it — an entry whose trial can no longer be re-run is marked in the past tense rather than deleted, because a deleted record and a superseded one look identical later; and it stays counted, because the trial was real when it was taken.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
