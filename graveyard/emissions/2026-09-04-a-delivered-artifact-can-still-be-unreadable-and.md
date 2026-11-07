<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-04
repo: Kogaki
grain: lesson

## Trigger — what happened

A pull request spent both of its allowed review rounds and still could not merge. The first round wrote a good report but the posting step failed, so only a marker reached the pull request; the session posted the report by hand, which is the recovery the tool's own comments describe. That fixed the delivery and revealed a second problem underneath it: the gate parses each finding line with a pattern requiring a severity and a state word, and the reviewer had written three lines with the severity and no state word. All three were the lowest severity; every line at the higher severities was well formed, six for six. The gate therefore counted fewer findings than the report declared, called the report incomplete, and refused the merge. The second round reproduced both failures exactly. Nothing was wrong with the work or with the findings, one of which had caught a real defect. There was no override on the merge step, so the only routes left were to hand-edit the gate's own evidence or to throw the pull request away and start again.

## The learning

Delivering an artifact is not the same as making it readable, and a system can pass the first test while failing the second in a way that looks identical from outside. Both failures presented as the same thing — a pull request that would not merge — and only one of them could be seen at a time: fixing the delivery is what exposed the parsing problem, so the second layer cost a second round to discover. That is the expensive property. When a budget is spent on attempts and the failures are stacked, the budget is consumed by diagnosis rather than by work, and a bound sized for two attempts at the work affords one attempt at each of two problems and none at the work itself. Two things follow. Where a machine reads what a person or a model writes, the reading must either accept what is actually written or refuse it at the moment of writing, while the writer is still there to correct it; refusing later, after the writer is gone and the budget is spent, leaves nobody who can act. And where the same freeform output is both the product and the evidence that the product exists, a defect in its form is indistinguishable from an absence of work, so the check that the form is readable belongs beside the act of producing it and not beside the act of consuming it. The tell that this class is present: the failure is severity-correlated or otherwise patterned, which means it is not noise and will recur on the next attempt at the same rate.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
