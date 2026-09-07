<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#996: the ReviewDraft `grounds` check failed every Step of an article regardless of its prose. 87 of its 93 failing claims were decided by a string matcher with no model call; 6 were a model reading the prose. Two earlier issues (#872, #880) had already written fixture comments explaining that their recovered claims were deliberately worded to pair with the Packet's grounds, 'so the join cases assert against the pairing rather than against the fixture' — each one a local repair that left the matcher deciding the check.

## The learning

When a check pairs recovered material to declared material by a matcher, what it does with material the matcher does NOT place is the half that decides the check, and leaving that fallback implicit hands the verdict to the matcher. Two symptoms name it before anyone reads the prose: the ratio of harness-decided to judge-decided verdicts, which is countable per run and needs no opinion about the subject matter; and fixtures carrying comments that explain how they were worded so they would pair — a fixture built to satisfy a matcher is evidence the matcher is deciding, and because each such comment reads as a careful local fix, the pattern accumulates as diligence rather than as a finding. The remedy is to make the fallback a declared field the item must fill, refusing the item that omits it, so the choice can never again be inherited from the matcher.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
