<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-04
repo: Kogaki
grain: lesson

## Trigger — what happened

PR #844 hit its two-round bound with a non-gating in-diff finding open. The reachability floor sent that finding to an issue or an explicit decline, because at a spent bound there is no round left to review a fix in. The PR was then superseded, and the successor PR #847 has two fresh rounds by construction — at which point the same finding's correct disposition is the opposite one: resolve it in the diff.

## The learning

A finding's disposition is not a property of the finding. It is a property of the finding TOGETHER WITH the review budget left, so the same finding is correctly declined at a spent bound and correctly resolved in the diff one submission later. Two consequences worth acting on. First, when a spent-bound PR is superseded, its carried findings must be RE-DISPOSED against the successor's budget rather than copied across — copying preserves a disposition whose only justification was a constraint the successor does not have, and the copy reads as a decision because it is written in the same grammar as one. Second, a disposition rule that reads as a property of the finding — latent versus reachable, gating versus non-gating — hides its dependence on the budget, so the rule text should name the budget as an input or a reader will apply it in the wrong state and be conformant while doing so.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
