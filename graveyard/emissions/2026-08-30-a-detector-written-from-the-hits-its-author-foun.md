<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-30
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#639 reported four bare specs/SPEC.md citations in one shipped kit artifact. The sitting widened the population correctly to the three artifacts the installer actually places, and wrote a check to hold the line. Across the PR's two review rounds the same class was found three times, each instance authored by the act that had just repaired the previous one: the check matched the one literal string the search had used, so two same-class citations spelled specs/spec-client-kit/SPEC.md sat live in the very files being repaired and the check reported green over them; its qualified-versus-bare test was line-scoped, so a line carrying both forms escaped; and the rewritten check's enumerated file list came out one member short of the count its own adjacent comment gave.

## The learning

When a defect is found by searching, the search's query becomes the implicit definition of the defect, and any detector written afterwards tends to encode the query rather than the property - so the check is green exactly on the instances the search would also have missed. Widening the POPULATION does not fix this and can disguise it: going from one file to three feels like generalisation while the matching string stays as narrow as the day it was typed, and the wider population makes the green look better earned. The move that actually helps is to write the detector from the PROPERTY the acceptance names - here, a repo-relative path that resolves only at the home - and then check the detector against instances the original search did not produce, which is the only test that can distinguish encoding the property from encoding the query. Two further things this specimen shows. A narrow instrument is legitimate when it names the trigger that widens it, but naming the trigger is not satisfying it: a comment can cite five destinations beside a list of four, and the citation then reads as a completeness claim the list does not have, which is worse than an unqualified list because it forecloses the question. And the repair of a scope defect is itself a scope decision made under the same conditions that produced the original, by the same author, usually in a hurry - so a repair of this class deserves the same adversarial pass as the defect, and is the least likely to get one because it feels like conformance.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
