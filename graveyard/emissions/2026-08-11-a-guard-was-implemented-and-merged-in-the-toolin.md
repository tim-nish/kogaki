<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-11
repo: Kogaki
grain: lesson

## Trigger — what happened

A guard was implemented and merged in the tooling repository on one day and never installed on the machine that needed it. For two days the closing report of four consecutive runs stated the hook premise as satisfied, reading a count of registered hooks — which was true, and which cannot tell an installed hook from a two-day-old one missing the function the caller now calls. Nothing failed, because the rounds requested in that window were all within the bound the absent guard would have enforced.

## The learning

When you make an obligation observable, check what your observation actually distinguishes. A count of registered hooks separates registered from absent and says nothing about current, so a stale install and a fresh one render identically — and staleness is the failure mode a shipped-then-installed thing actually has. The reading feels like coverage because it is true and it is about the right subject. Prefer an observation that compares the installed artifact to the source it came from, and note that a guard whose condition never arose leaves no trace of having been missing: nothing breaks, so nothing tells you.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
