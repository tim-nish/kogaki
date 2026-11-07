<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-21
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1495: the Proof Sheet's Leg prompt is derived at every run from the production reader-path prompt plus a declared list of substitutions. When kogaki#1494 added a sentence to the production prompt telling the model to use two inputs (a renderings list and the served claims), the copy picked it up silently, though the copy's input carries neither. Nothing refused it, because the substitution list only refuses when a span it replaces has moved, not when new text arrives.

## The learning

Deriving a copy from its original by a list of declared differences keeps the copy current, but it also lets every new sentence of the original through unread. A sentence that names an input the copy does not receive is then an instruction the model cannot follow. When the original gains a sentence, read the copy's rendered prompt for it, and where it names inputs the copy lacks, add a substitution in the same change that adds the sentence or in the copy's next change.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
