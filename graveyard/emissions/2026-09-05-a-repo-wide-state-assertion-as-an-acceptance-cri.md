<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run on kogaki#858 found its acceptance criterion false on master while the issue was in fact discharged: the PR that implemented it satisfied the criterion at merge, and a DIFFERENT PR merged hours later reintroduced what the criterion forbade. The issue had deliberately declined a check for the property, on owner instruction.

## The learning

An acceptance criterion written as a repository-wide state assertion ("this grep returns nothing but ordinary uses") stops being a claim about the change and becomes a claim about the world, so it expires whenever anyone else edits the world — and its expiry is indistinguishable, at read time, from the issue never having been finished. The two readings send a run in opposite directions: one closes the issue, the other reopens work on it. What separates them is not the current state but the state AT MERGE, which is a different read nobody makes by default. So a criterion of this shape owes either a guard that holds it (a check), or an explicit statement that recurrence is a NEW finding on a new carrier rather than the original issue being incomplete — and when a project declines the guard on purpose, as this one did, it has chosen the second and should say so in the issue, because the next reader will otherwise re-derive it from scratch or get it wrong.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
