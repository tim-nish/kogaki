<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-26
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1613 added a required Segment number to the obligation call's answer; the same validator also reads every Extraction already on disk and every fixture record

## The learning

When a model's answer gains a new required field, the check that reads the answer is often the same check that re-reads the saved records built from earlier answers. Making the field required everywhere makes every earlier record unreadable at once. Require it on the fresh answer, and on a saved record check it only where it is present, so old records still read and new ones are held to the rule. Then look for test stand-ins that fake the answer: they lack the field too, and they live in other test files that the plan never listed.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
