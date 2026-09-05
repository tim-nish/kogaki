<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A fixture case asserting that three removed commands 'refuse loudly and name the issue that removed them' tested a non-zero exit plus the issue number. Deleting all three dispatcher cases PASSED it: the unknown-command fallback also exits non-zero, and the usage banner it prints names the same issue. Found by running the mutation, not by reading the case.

## The learning

When you test that a removed thing refuses, the fallback path you are trying to rule out often satisfies your assertion by accident. An unknown command already exits with an error, and any banner it prints tends to carry the same version or issue reference the real refusal does — so 'it errored and mentioned the right ticket' is true of the failure you are guarding against. Bind the assertion to what only the real refusal can say: the specific disposition of that specific thing, and the absence of the fallback's own output.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
