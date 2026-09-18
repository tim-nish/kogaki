<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-10
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1071 re-submitted PR #1070's tree unchanged and the check suite went red on check-consult-receipts, at a head whose own commit message claimed 31 of 31 passing. Two commits carried the same request_id under differently worded query: lines, and the check reads that as one gateway request carrying two readings — so one of the receipts is fabricated.

## The learning

When two commits lean on the same consultation, the receipt is not the place to write down what each of them took from it. A receipt records what was asked and what came back; one request has one such record, so the second commit must carry the first's query text verbatim rather than a re-wording of it, and its own reading of which headline mattered belongs in the commit prose above the block. The failure mode is quiet: re-wording a query to fit the commit it sits in reads like ordinary editing, and the resulting receipt is indistinguishable at authoring time from an honest one. It also survives review — the tree here had already passed a clean round 1 and was re-submitted whole, and the defect only surfaced when the suite was re-run against a fresh head.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
