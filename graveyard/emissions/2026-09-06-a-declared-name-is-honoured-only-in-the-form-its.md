<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#961: a schema field declared the capture filename as the glob `*.gate-capture.json`. Every reader derived from it and every one of the five producers hardcoded the name, so the declaration and the filesystem agreed only by coincidence of two independently written literals — and a mutation probe turned a check red while nothing about the product changed. Its sibling key in the same object, declared as the bare suffix `.run-declaration.json`, was honoured by every one of those same producers, one line apart in the same function.

## The learning

When a declaration is meant to bind both the side that WRITES a name and the side that MATCHES it, the form decides which side can actually obey. A producer builds a name by concatenation and a scanner consumes a pattern, so a value stored as a pattern is unusable to the producer without a transformation — and the producer will simply write the literal instead, silently, because nothing refuses. The failure then looks like negligence at the writers and is really a shape mismatch at the declaration; hunting for discipline at five call sites is hunting in the wrong place. The tell is a sibling key in the same object honoured by exactly the writers that ignore this one. Declare the value in the PRODUCER's form — the one that composes by concatenation — and let the consumer derive the pattern, because the consumer already runs a transformation and the producer had none. The inverse arrangement is the one whose readers can be made red by a change no writer feels, which is a declaration enforced ahead of its writers rather than a join being kept.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
