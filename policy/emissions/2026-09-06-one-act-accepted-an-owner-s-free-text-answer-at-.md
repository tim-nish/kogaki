<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

One act accepted an owner's free-text answer at a selection gate and printed a promise about what would happen next: 'adoption will refuse, naming it'. Adoption had no branch for that answer at all. It fell through to an equality test against the selected option's id, where the absent id interpolated as the bare word 'undefined', so the owner who typed their own words was told they had selected a candidate named 'undefined'. Both acts were individually correct-looking and the whole path was green: the accepting act's promise was prose in a console line, and nothing anywhere compared it to the refusal actually produced.

## The learning

When one act tells a user what a later act will do, that sentence is an assertion about another component's behaviour and it is carried by nothing. It reads as documentation, so reviewers check it for accuracy of intent rather than for whether the other component implements it, and it survives every test because no test spans the two acts. The tell is a promise written in the imperative future - 'will refuse', 'will be rejected', 'you will be asked' - sited in a different act from the one that would keep it. Two habits are worth the effort. When you write such a sentence, write the case that drives both acts in sequence and asserts on the second one's actual output, because the sentence is only true once something has run the pair. And when an input channel is offered at one end of a flow, look for the branch that consumes it at the other end before assuming it exists: an accepted-but-unhandled input does not fail loudly, it falls through to whatever comparison happens to be next, and that comparison then describes the user's action in vocabulary the user never used.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
