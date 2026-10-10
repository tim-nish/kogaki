<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1299 admission, 2026-10-08: admit-issue verdict refused a plan touching checks/ for carrying no consult receipt; a receipt posted as an Issue comment cleared it on the next verdict with the same body sha

## The learning

When admission refuses a plan because it touches a consultation-map boundary and the Issue carries no consult receipt, the receipt can be added as a comment on the Issue rather than an edit to its body. Admission reads the comments as well as the body, and leaving the body untouched keeps the body fingerprint the plan was judged against, so the verdict can be re-run at once without re-planning.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
