<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-25
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1590 changed the obligation call's answer shape; its plan listed only the check named in the Issue, and the suite failed on a second check whose fake judge still answered in the old shape, so the footprint was widened twice by body amendment mid-pass

## The learning

When a change alters what a model call must answer, every test that stands in for that model also has to change, because the new reader refuses the old answer. Before admitting such a change, search the checks for the call's name and for the old answer's keys, and put every file that fakes it in the plan.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
