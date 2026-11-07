<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-12
repo: Kogaki
grain: lesson

## Trigger — what happened

A merge-gate predicate scans only the segments AFTER the one holding a finding, so an earlier round cannot discharge a later round's blocking. The fixture written for that property used two segments: the earlier one carried both the adjudication line and the finding, and the later one was the current head. The row passed. Then a mutation that removed the ordering entirely — scan every segment rather than only the later ones — also passed, and the row that existed to catch it did not. With two elements the adjudication named a segment that was not its own, so a predicate ignoring order still reached the same answer. Rewritten with three segments, where the adjudication sits in the first and the finding it names sits in the second, the mutant died.

## The learning

A property about ORDER is not tested by a case that merely has an order. Two elements give one relationship, and a predicate that ignores direction frequently agrees with one that respects it, because there is only one way for the pair to be wrong and the case often is not it. Three is the smallest arrangement where respecting the order and ignoring it give different answers: the thing being searched for has to sit between something that should not count and something that should. The same shape recurs for any relation asserted over a sequence — before and after, precedence, shadowing, first-wins — and the tell is identical each time: the test passes, the negation of the rule also passes, and the case reads as coverage because it plainly involves the ordering. Two further notes from the same repair. A table that exercises a PREDICATE never reaches its CALL SITE: every row here fed the function directly, so making the live branch unreachable survived the entire table, and the wiring had to be asserted by reading the source. And an assertion that greps its own file will match its own mention of what it searches for — the first form of that wiring check split on a bare substring, found the copy inside itself, and reported a defect that was its own; anchoring on the call site's line shape rather than on the bare text is what fixed it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
