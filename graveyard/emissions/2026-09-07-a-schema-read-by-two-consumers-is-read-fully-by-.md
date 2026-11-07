<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#995: src/recovered-schema.json declared text_key and span_key for every array-of-object field, and the validator read them while the renderer did not — so the join input showed the judging model [object Object] for every concession, and the model's cannot-decide was recorded as a judgment about the article.

## The learning

When one machine-readable contract is read by two consumers, the consumer that VALIDATES tends to read every field and the consumer that RENDERS tends to read only the shape it happens to need — and nothing announces the gap, because both consumers pass their own tests. The validator was right about the record and the renderer was right about arrays; what neither owned was the join between them. The repair is not more care at the renderer: it is making the renderer read the same declaration the validator reads, so a field that gains a key is covered by the declaration rather than by whoever remembers to update the second reader. The general signal is a contract file whose fields are consumed by name in one place and by shape in another.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
