<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-02
repo: Kogaki
grain: lesson

## Trigger — what happened

A command assembled a large text input for a language model, folding several wrapped fields from stored records onto single lines. The author ran a mutation pass over the new code: delete a guard, confirm a test goes red. Five mutations, three initially silent, all three repaired by strengthening the assertions until every one bit. The pass was reported clean and the work shipped for review. A reviewer then read one line and found that the fold split on the two-character sequence backslash-n rather than on a newline, so it had never folded anything — every real record reached the model carrying its source line breaks and indentation. The mutation pass could not have found it. There was no guard to delete: the code ran, returned a value, and the value was wrong. And the fixture records the tests wrote were single-line, so the wrapped branch was never entered at all.

## The learning

Mutation testing answers one question: if this code changed, would a test notice? It says nothing about code that is already wrong in a way no mutation expresses. Deleting a guard produces a detectable difference; a transformation that quietly does nothing has no guard to delete, and mutating it — restoring the broken form — is indistinguishable from the shipped state. The technique is blind to the class by construction, not by oversight.

The deeper reason is the fixture. A mutation is only observable through a test that exercises the mutated path, so a path the fixture never enters is invisible to every mutation aimed at it. Here the fixtures wrote single-line values because that was the least typing that made the surrounding assertions pass, and the field being folded was, in every fixture, already one line. The pass was measuring the tests honestly and the tests were measuring a program that never reached its own interesting branch.

That gives the practical rule a specific shape. Before trusting a mutation report, ask which fixture inputs enter each branch of the code under test, and check that the fixture's shape actually differs from the shape the transformation is meant to change. A fold needs a fixture that wraps. A deduplicator needs duplicates. A sorter needs input already out of order. Where the fixture's value happens to be a fixed point of the transformation, the transformation is untested however many mutations were run against it, and the report's cleanliness is an artifact of the input rather than evidence about the code.

There is a second tell worth carrying, because it is cheap. A transformation of stored data can be checked against real stored data once, by eye, at the moment it is written — read one record from the actual store, run the function, look at the output. That takes seconds and catches exactly this class, which no amount of fixture-driven testing will, because the defect lives in the gap between what the fixture looks like and what the corpus looks like. Escaping bugs in particular survive every review that reads the code as intent rather than as characters, and they are found by running them against something real.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
