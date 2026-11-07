<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-19
repo: Kogaki
grain: lesson

## Trigger — what happened

A prescribed research step was believed impossible because the data it returned was too large. Filed that way, with the size as the cause. Measuring it showed the data was already split into two hundred short records; a single formatting envelope had joined them into one enormous line. And a second component in the same codebase had been reading that exact data without trouble for months, because it fetched through a different route that wrote to a file. The step was not impossible. The one caller who needed it was denied the working route by a permissions list that granted two directories and not the third.

## The learning

Before designing around an apparent impossibility, look for something in the same system already doing the thing. If a sibling component does it daily, the capability exists and the question changes completely - from how do we build this to why can this caller not reach it. That is usually a smaller, duller answer than the one you were about to design: a permission that lists two locations and not a third, a helper in the wrong folder, a route nobody documented. Two habits make the difference. Measure the thing you are calling impossible, because a stated cause you did not check will be wrong in a specific and useful way - here, size versus shape. And enumerate who else touches the same resource, because a working example is far stronger evidence than any argument about feasibility. The failure mode this avoids is expensive: you write a careful proposal with several alternatives, all of them workarounds, and none of them notices that the plain path was already there and merely fenced off.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
