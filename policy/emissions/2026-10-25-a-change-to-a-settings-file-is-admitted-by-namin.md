<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-25
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1599 only edited .claude/policy-check.json. Admission refused it twice: first because no consult receipt was on the Issue, then because no registered check covers that file. An earlier sitting had concluded the Issue could not be admitted at all.

## The learning

When a change touches only a settings file that no registered check lists as covered, add the check that actually reads that file to the change's file list, even if the check itself is not edited. Admission then finds coverage and lets the change through. Re-test a 'this cannot be admitted' conclusion before acting on it, because the refusal that caused it may have moved.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
