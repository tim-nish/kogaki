<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A check was built with two arms deliberately split: a delegated fixture pass over constructed inputs, and one assertion the member holds itself — every record in the shipped directory validated against the live rule set — because the fixture cannot know about record N+1. The registry entry claimed, in its efficacy note, that mutating a shipped record turned the tree arm red while the fixture stayed green. Running it showed the opposite: the fixture went red first, because one of its own cases reads that same shipped file, and the member exited before the tree assertion ran. The mutation had killed a case and evidenced nothing about the arm it was written for. A second mutation — adding a NEW record carrying the same defect — left the fixture green at full count and failed the member at the live read with the path named. Separately, mutating an enumerated condition's widening killed two cases rather than one: a pre-existing case already covered that half, and the new case's real contribution was a different half of the same assertion.

## The learning

A counterfactual is only evidence for the assertion you aimed it at if it reaches that assertion. Two ways it silently does not. First, a mutation applied to an artifact that several arms read is caught by whichever arm runs first, and an early exit means the later arms never ran — so a red result proves the mutation was detected, not that the arm you were writing the note about detected it. Where two arms exist precisely because they cover different populations, the isolating mutation has to live in the population only the second arm can see: not a defect planted in the specimen the fixture already knows, but one planted in the instance that arrived after the fixture was written. Second, a mutation can kill more cases than the one you added, which tells you the coverage was already there and the new case earns its place on a different property — worth recording as the finding rather than tidying into the tidy claim you set out to make. The practical rule: run the counterfactual before writing what it showed, name in the record which arm went red and which stayed green, and when the first attempt measures the wrong thing, keep it in the record beside the second. A note saying only the isolating mutation makes the split look obvious; a note carrying both makes it checkable, and the reader learns which mutations do not work.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
