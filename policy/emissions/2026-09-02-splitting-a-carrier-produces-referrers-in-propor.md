<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-02
repo: Kogaki
grain: lesson

## Trigger — what happened

A document holding several rules was split: two operational clauses moved to a runtime template the model reads, and their justification moved to a new design record. The split itself was clean. Over the next three pull requests, five separate places turned out to still name the old document — two found by one review round, one by the next, two more by the round after that. Each round found exactly the referrers that lived in files that round's diff happened to touch, and none of the rounds found the ones sitting in files nobody had opened. The act that performed the split found none of them, because a diff that moves text out of a document contains no mention of the documents that point at it.

## The learning

A split is a deletion with a forwarding address, and it inherits the deletion's blind spot exactly: the change itself shows what moved and says nothing about what pointed at the thing that moved. Nothing in the diff names the referrers, so no amount of care reading the diff surfaces them, and the test suite is silent because the old document usually still exists — the citations still resolve, they just resolve to a place that no longer holds what the citer wanted.

What makes a split worse than a plain deletion is the arithmetic. A document gets split because it was load-bearing, and load-bearing means widely cited; so the number of stale referrers is proportional to how useful the thing was. The more the split was worth doing, the more references it strands. And unlike a deletion, nothing goes red, so the only detector is somebody reading a citation and following it.

Review rounds find them one at a time, and the reason is structural rather than a matter of reviewer diligence. A round's attention is scoped to the diff, so it finds referrers that happen to sit in files the diff touched — which is a sample biased toward the code the author was already working in, and systematically excludes the far parts of the tree where a reference is most likely to be forgotten. Successive rounds therefore produce a slow trickle that looks like thoroughness and is actually a sampling artifact.

The corrective is one command at the moment of splitting: grep the old carrier's name across the whole tree, before the split lands, and disposition every hit — repoint, or record why it stays. The root set has to be everything, including prose, configuration and comments, because that is where a reference is both load-bearing and unenforced. Doing it at the split costs one sweep; discovering the same five references across three review rounds costs three rounds and leaves the tree inconsistent in between, with each stale citation quietly teaching the next reader that the old home is still the right one.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
