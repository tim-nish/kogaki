<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-11
repo: Kogaki
grain: lesson

## Trigger — what happened

The commit repairing a review's findings inserted two new acceptance criteria into a story, taking its count from four to six, and left three sentences elsewhere in the same file saying 'four properties, four firing cases'. The two criteria the stale count drops are the two the same file calls the ones a natural implementation misses. This is the second instance in two days: the first was a schema carrying v6 entries under a version field reading 5.

## The learning

The version field, the count, the summary sentence — a document's statements about itself are the part that goes stale when you edit it, and the repairing commit is where this is most likely, not least. Attention goes to the entries because they are what the task is about; the self-description reads as bookkeeping and survives untouched, now describing a document that no longer exists. It is worse when the edit ADDS members, because a count that was right becomes wrong silently while a count that was absent would at least be missing. Before finishing any edit that changes how many of something a document contains, grep the document for its own numbers and for the words summarising its shape.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
