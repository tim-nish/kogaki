<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-14
repo: Kogaki
grain: lesson

## Trigger — what happened

A pipeline run scoped to one pull request found that the change had no open work item authorising it. An automated check for 'is a work item named?' passed, because the change did mention several numbers: one was a decision record closed six days earlier, two were a duplicate of work already merged, and one was a neighbouring item the change itself said it did not resolve. A separate freshness read on the closed record raised an alarm, but only about that record's age — nothing anywhere asked whether any of the named numbers was actually a live authorisation.

## The learning

A check that a change 'names a work item' is satisfied by a reference, and a reference is not an authorisation. The three ways it goes wrong are all cheap to produce and all look identical to the check: the item named is closed, so it records that a decision was made and cannot license new work; the item named is already discharged by other merged work, so naming it double-counts; or the item named is explicitly disclaimed in the change's own text as out of scope. Each leaves a change that reads as governed and is not. So make the check ask for a live one — resolve every named item's state and require at least one that is open and not already discharged — and where the tooling only counts references, treat a passing result as evidence that a number was written down, never that anything authorised the work. The tell is worth learning by itself: when the only item a change can name is a closed decision record, the work is usually real and the authorisation was simply never minted, so the repair is to file it rather than to abandon the change.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
