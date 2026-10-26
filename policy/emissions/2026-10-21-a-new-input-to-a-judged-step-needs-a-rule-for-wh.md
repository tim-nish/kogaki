<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-21
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1497: the paragraph planner was given each new term with its meaning and the judge was told to refuse a first use that gives no meaning; the first review round found that a term the article gives no meaning for could then never pass

## The learning

When a step that a judge checks is given a new input, and the judge's new criterion refers to that input, write down what the step should do when the input is empty or missing. Otherwise the criterion asks for something nobody can supply, and every attempt is refused until the retry limit runs out. Here the fix was to let the planner give the meaning in its own words and to have the judge ask whether a meaning is given at all, never whether it matches the input.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
