<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-18
repo: Kogaki
grain: lesson

## Trigger — what happened

Two /brief runs died at the same state because the model that composes a Reader Path was never shown the grouping rules the validator refuses it on; it had satisfied every rule it had been shown.

## The learning

When one party writes a record and another checks it, any rule the checker enforces has to appear in whatever the writer actually reads before writing. If it only lives in the checking code, the writer meets it for the first time in a rejection - and where retries are limited, that rejection can cost the whole attempt. The cheap fix is not to restate the rule in a second place, which drifts: have the rejection message read its wording from the same text the writer was shown, so the two cannot disagree, and add a check that every rejection the code can raise names a rule that text carries.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
