<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

Issue kogaki#959 asked that seven hardcoded filename literals in a check derive their suffix from a schema field, on the stated ground that the producer already wrote the filename from that field. After the repair, a probe that moved the field turned the check red — which revealed the producer had never read the field at all: it hardcoded the same name independently. The two had agreed only by coincidence of two literals, and the repair bound the check to a declaration with no writers.

## The learning

A schema field that carries a name proves nothing about whether anything reads it, and reading the field at one site does not make it a join key — it makes that site the only honourer of a declaration. The two states look identical while the literals agree, and they diverge only when something moves, so the cheap test is to move it: change the declared value and see whether the failure that follows names a real change in the product or only the reader you just repaired. A red that no producer caused is the tell that the field is aspirational rather than live. Grepping for readers of the field finds the same thing and is cheaper still, and neither is the same as reading the line the issue cites — a filing can name a producer line that does not in fact read what the filing says it reads, and the citation looks correct because the adjacent line does.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
