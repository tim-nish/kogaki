<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-12
repo: Kogaki
grain: lesson

## Trigger — what happened

A guard was found installed on a path where it could never fire. The repair added a branch for a case that also could not be reached, with a comment stating when it would run. The repair for THAT added a comment asserting a fact about which parts of the code call the function — and the assertion named one caller when there were two, dropping the very argument, supplied by the previous review, that made the claim true. Three rounds, three fixes, each correct about the thing it fixed and wrong in the same way one step further out.

## The learning

Repairing a claim about where code runs is unusually likely to produce another false claim about where code runs, because the repair is written in the same register as the defect and nothing in the surrounding work forces it to be checked. The reason it recurs is that these claims live in comments, and a comment is the one artifact no test exercises, so the ordinary feedback that would catch a wrong statement is absent exactly here. Two things break the cycle: verify the claim mechanically before writing it — for a claim about callers, list every caller and count them — and prefer a claim that states why it holds at each site over one that summarises across sites, because a summary hides which site the author actually checked.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
