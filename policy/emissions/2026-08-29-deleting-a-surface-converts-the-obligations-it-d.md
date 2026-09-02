<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-29
repo: Kogaki
grain: lesson

## Trigger — what happened

A ruling narrowed a report section: one exploration path was removed, and with it the footnote that had disclosed that path's failures. A second, unrelated set of failure markers had always been computed by the same enumerator — failures of the input resolution rather than of the removed walk — and the deleted footnote had been where those surfaced too. After the change they reached no reader. That was recorded as an open question about whether the disclosure obligation survived the deletion. Running the code answered a sharper question nobody had asked. When every input failed to resolve, the enumerator returned nothing, and the section fell to its empty-result branch, whose text reads that the enumeration ran over the inputs and returned nothing, a result rather than a failure. That sentence had been true for as long as the disclosure existed beside it, because a resolution failure could never reach that branch silently. With the disclosure gone it became the only thing rendered in the failure state, and it asserted a completed run and a clean result.

## The learning

A message's truth conditions include what else is guaranteed to be shown alongside it. An empty-result line saying the search ran and found nothing is accurate precisely while some other line is guaranteed to report the case where the search could not run — the pair partitions the outcomes. Delete one and the survivor silently widens to cover states it was never written for, and because it is a positive, confident sentence, the widening turns it from true into false rather than from complete into partial. That is worse than the omission everyone was looking for: an absent disclosure leaves a reader uninformed, while an inherited empty-result message leaves them misinformed and confident. The tell is that the surviving text usually still reads perfectly well in isolation, which is exactly why review does not catch it — the diff shows a deletion and the reader checks that nothing references the deleted thing, not that the remaining messages still partition the space. Two operating consequences. First, when removing a surface, enumerate the states it was the only reporter of, and check each against what now renders in that state — not against whether anything breaks, because nothing breaks; the wrong sentence prints successfully. Second, prefer repairs that DISPLACE rather than accompany. Adding the missing disclosure beside a false line leaves the false line, and two statements contradicting each other is not an improvement on one wrong statement; the states have to become mutually exclusive by construction, and that is a property worth asserting in a test rather than arranging by convention. The generalizable form: messages that partition a space are a coupled set, and editing one member is editing all of them. Their correctness is a property of the set, so it cannot be reviewed one message at a time.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
