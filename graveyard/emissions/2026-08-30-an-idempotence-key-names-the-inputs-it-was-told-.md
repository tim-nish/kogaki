<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-30
repo: Kogaki
grain: lesson

## Trigger — what happened

A derived artifact was keyed by an identity naming three components. Three further inputs decided what it rendered and were deliberately excluded from that key. A rerun supplying different ones matched on identity and replayed the stored artifact while printing that the rerun was idempotent. The filing named one of the three inputs; measuring found the same replay on all three.

## The learning

Idempotence is a claim about a function: same inputs, same output. A key that names only some of the inputs turns it into a claim about a subset, and the artifact goes on asserting the full claim. The gap is invisible in normal use because the excluded inputs usually do not change between runs — which is exactly why the first person to change one gets a wrong answer with a success message attached.

The tempting repair is to widen the key until it names everything. That is sometimes right, but it has costs worth weighing before reaching for it: whoever must construct the key by hand now has to hash content, storage grows with every variation, and if the key was ratified somewhere, widening it reverses a decision rather than extending one. The cheaper shape is to keep the key and have the artifact carry a digest of the inputs it was actually made from, then compare before reusing it. A mismatch becomes a refusal that names which input changed, instead of a silent replay. The identity stays what it was; what changes is that reuse now has to prove it is reuse.

Two details decide whether the repair holds. Records written before the digest existed cannot be shown identical, so they are recomputed rather than replayed or refused — replaying reintroduces the defect on exactly the oldest records, and refusing punishes a run that did nothing wrong. And the refusal must name the differing input: telling an operator only that something changed leaves them diffing every input to find out which, which is the same silence one step along.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
