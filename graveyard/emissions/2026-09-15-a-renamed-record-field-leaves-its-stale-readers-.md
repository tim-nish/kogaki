<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-15
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1121: a record field renamed at kogaki#1116 from {ids, survey} to {addresses, via} left two dead reads inside a template literal that composes the owner's gate question. The whole suite stayed green and the owner was shown 'Composed over the settled Strand set undefined, from undefined' on every Brief start, for a day, until someone read a run's gate-call file by hand.

## The learning

When you rename a field on a record, the compiler-shaped part of the codebase tells you nothing if the reader sits inside a string template: a missing property interpolates as the word 'undefined' rather than raising. So the rename's blast radius is not 'where does this field appear' but 'what text does this record produce', and the check that would have caught it has to assert the produced TEXT. The near miss here is instructive: a case DID assert the provenance, but against a neighbouring surface — the run state's own copy of the line, composed by different code — so it was green while the bytes the owner actually saw were broken. An assertion on a surface next to the one the user reads is not an assertion on what the user reads. The cheap general form: for any string a human is shown, assert that it contains what it should AND that it does not contain 'undefined', 'null' or 'NaN'; the negative half costs one line and catches the entire class.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
