<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#982 offered three arms over a header duplicated across fifteen files, and named the third — keep the copies and add a check asserting they agree — as the cheapest to reach. Measuring the fifteen before choosing showed eight distinct wordings, not fifteen copies: the check would have failed on day one, so the arm it looked cheapest against actually contained the collapsing arm in full and then added a permanent check on top of it.

## The learning

When a fork's arms are costed against a claim that several carriers hold the same text, measure that claim before choosing, because it is the cheap arm's whole premise and it is the one thing nobody re-checks. An arm that adds an assertion of sameness prices as cheap only while the carriers are in fact the same; where they have already diverged, that arm silently contains the arm that unifies them and is strictly more expensive than the option it was offered against. The measurement also changes what the fork is about — from preventing a divergence to repairing one — and an arm chosen under the wrong one of those is chosen for a problem the repository does not have.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
