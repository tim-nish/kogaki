<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-24
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1577 changed what a plan row's item holds in the step that tells the planner what to write, and the review found the same prompt's input-shape line still telling it the old thing

## The learning

When the meaning of a field a model writes changes, the instruction step is not the only place that states it: the description of the expected answer shape states it too, and both reach the model in one prompt. Change both in the same act, or the model reads two instructions that disagree.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
