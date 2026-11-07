<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-20
repo: Kogaki
grain: lesson

## Trigger — what happened

A pull request's two-round review bound read as spent when only one round had actually run: a second-round permission was recorded by an owner click and then never used, because the reviewed content carried forward unchanged and no session was ever spawned against it. The push guard later refused the branch on the grounds that two rounds were granted, conflating permissions issued with rounds run.

## The learning

A budget enforced by counting permissions issued diverges from one enforced by counting the acts those permissions were for, and the divergence appears exactly when a permission is issued and then legitimately not needed — the cheapest case, which the accounting reads as the most spent. If a bound is meant to limit how many times an expensive act runs, its counter must read records of the act completing, not records of someone agreeing it may run; otherwise prudent early authorization becomes indistinguishable from consumption, and the actor who asked before acting is charged more than the actor who never asked.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
