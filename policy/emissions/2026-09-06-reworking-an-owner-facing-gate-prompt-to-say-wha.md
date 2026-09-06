<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

Reworking an owner-facing gate prompt to say what the runtime does turned an existing check red — the check matched the literal phrase 'does not discharge' rather than the property that clause guards, so copy stating the property more strongly failed it. Two admission records then described the binding that had just been replaced.

## The learning

A check that matches a phrase from the sentence it guards passes and fails on wording, not on the property. It goes green on a rewrite that keeps the words and drops the meaning, and red on a rewrite that keeps the meaning and drops the words — and the second failure is the one that surfaces, arriving as a red suite on correct work and reading as a regression the author caused. Bind the property instead, accepting any form that carries it, and keep a control that still fails when the statement is absent entirely, so the widening is not a hole. And rebinding is not finished at the assertion: the records that describe what the check asserts — its own contract string, its registry entry — are now describing a binding that no longer exists, and a reader meets the description before they meet the code.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
