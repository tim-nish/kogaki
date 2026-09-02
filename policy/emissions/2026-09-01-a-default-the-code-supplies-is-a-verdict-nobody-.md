<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-01
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#738: a classification step asked a model to place items into named groups, each carrying a judgment label. Items the model left out were swept by the code into a leftover group, and that group was stamped with the third label 'by construction'. The label meant 'grouped only to satisfy the requirement' — which was true of the engine's act and said nothing about the items. In one incident about thirty items landed there with no coherent group composed at all, and nothing downstream could tell 'no coherent pair exists' from 'the judgment never tried'.

## The learning

When a field carries a judgment, never let the code fill it — not even with the value that looks obviously right for the case the code is handling. A stamped default is indistinguishable at every later read from a judgment actually made, because it sits in the field reserved for one, and the reader has no second signal to check it against. The tell is a label whose meaning is a fact about the MECHANISM ('grouped to satisfy the requirement', 'assigned because nothing else matched') rather than about the SUBJECT: a mechanism-fact is one the code can know, which is exactly why the code was able to supply it. The repair is to refuse instead of defaulting — but a refusal is only safe where the actor still has a path, so mint the label the judgment can legitimately choose and make the refusal hand back the specific items, at the moment of refusal. Refusing without naming what to act on removes the cheap wrong path and leaves the actor to guess.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
