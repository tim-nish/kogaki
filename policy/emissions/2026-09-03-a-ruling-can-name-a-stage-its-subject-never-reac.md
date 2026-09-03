<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

An owner ruling said a Brief's grouping rules are 'validated at mint', and the issue implementing it repeated that in its acceptance. Two separate findings, hours apart, turned out to be the same defect at two scales. First: one of the four rules measured 'a section running past roughly a screen and a half of prose' — prose that does not exist when a Brief is composed. Second, found only when writing the code: the named act, mint, consumes an adopted pair and writes a document SHELL; no step exists there for any rule to read at all. Both clauses had passed a design gate, a spec amendment and a review round reading as perfectly sensible English.

## The learning

When a rule names WHERE it is enforced, that name is a claim about which data exists at that moment, and it is the claim least likely to be checked — because the rule reads as sensible to everyone who never goes looking for the inputs. Reviewers check whether a rule is right; implementers discover whether it is reachable, and by then it is ratified. Two practical consequences. At the moment of writing a rule, name the artifact the check will read and say what stage produces it — 'validated at mint' survives every reading, while 'validated against the Steps, which mint does not write' fails immediately and cheaply. And when one clause of a ruling turns out to measure something absent at its named stage, check the others at once rather than patching the one: the cause is a single act of writing rules against an imagined pipeline, so the defects arrive as a set, and the second one here was found only because the first had made the question live. The repair that keeps the ruling's authority is to split by WHERE THE PROPERTY EXISTS — each stage checks the half it can compute — and to name the unchecked half as a deferred slot rather than inventing a proxy for it at the stage that cannot see it, since a proxy makes the refusal fire on an estimate and reads, to everyone downstream, exactly like the real check.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
