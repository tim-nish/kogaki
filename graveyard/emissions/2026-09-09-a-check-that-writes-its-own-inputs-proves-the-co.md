<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1029 acceptance 2 asks that a 17-tag survey carry all 17 rows and that a payload with one row removed be denied. The existing guard drove payloads the check composed itself, at one row. Adding the 17-row removal cases satisfied the clause that was easy to see, and a review round found the other half had no case anywhere: the renderer that produces those bytes was only ever compared against itself over a three-row record, so a renderer dropping rows past some N would have left every case green while the owner read a truncated table.

## The learning

When a guard drives inputs it constructs itself, it tests the party that CONSUMES the input and says nothing about the party that PRODUCES it. The two are easy to conflate because the consumer-side case looks like end-to-end coverage: it names the real artifact, uses the real comparison, and fails when you break the thing under test. What it cannot see is the producer shrinking, because the producer never runs. The tell is a byte-equality assertion whose two sides are the producer and a direct call to the producer — that is a tautology at every size, and it stays green under exactly the defect the size was chosen to catch. So a clause naming a SIZE owes a case that reads a record of that size through the producer, not only a payload of that size written by the test. And the check for whether you have one is a mutation at the size: truncate the producer and see which cases go red. Here that mutation left the byte-equality case green and turned two others red, which is the discrimination the clause was asking for.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
