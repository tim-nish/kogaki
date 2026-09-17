<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-17
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1111 moved a Step's Journey use into a declared `journeys` field, had a validator check it and a renderer render it, and deliberately left the coverage count reading a spelling convention in a different field -- writing down that the accounting was unchanged. The first document the pipeline completed rendered four journey lines from the new field and disclosed all five items as OMITTED from the old count, in the same file, which was then handed downstream as a settled input.

## The learning

When you add a declared field for something a count already reads by convention, the count is now the second reader of one fact and the two will disagree -- not in principle, but at the first record that uses the new field the way it was meant. Writing 'accounting is unchanged by this field' in the schema does not hold the two together; it only records which one will be wrong. Move the count onto the declared field in the same act that declares it, or do not declare the field. The convention can stay legal as an alias -- what cannot stay is a second thing that decides the same answer. The tell that this happened is a single document that contradicts itself: one section rendering from the new field, another reporting absence from the old one.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
