<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-14
repo: Kogaki
grain: lesson

## Trigger — what happened

I extended a rule to a second area it had always covered in principle but never in practice, and wrote a test for the new half. Two versions of that test looked right and proved nothing. One compared the work against a reference point I had accidentally made identical to the work itself, so there was no difference for it to notice. The other checked the value at a convenience entrance rather than at the door the real process walks through, so the part that mattered could be removed entirely and the test still passed. Both only showed up when I deliberately broke the thing they were supposed to protect.

## The learning

A test for a newly extended rule is worth deliberately breaking before you trust it, because two failures are common and neither is visible by reading. The first is a setup that quietly makes the two things being compared the same, so the comparison cannot fail -- if your setup constructs both sides, check that they actually differ in the way the test claims to detect. The second is checking at whichever entrance was easiest to call rather than at the one the real work goes through; a shortcut used only by tests can keep reporting the right answer after the real path has stopped producing it. The general form: ask what would have to be true for this test to pass while the property is false, then make that situation and confirm it fails. Reading the test cannot answer that question, and being the person who just wrote the rule makes you least likely to ask it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
