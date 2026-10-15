<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-11
repo: Kogaki
grain: lesson

## Trigger — what happened

#1327 failed its suite twice in two runs on the same member, section-numbers: each time a worker wrote a code comment pointing at the spec section it had just added (§4.15.1). The issue body itself named the section by number, and the admitted per-cell checks did not include section-numbers, so the worker saw green.

## The learning

When an Issue names a spec section by its number, the worker copies that number into code comments, and the per-cell checks the plan admits do not catch it because the section-number check is not among them. Only the full suite after the worker exits sees it, and by then the run is over. Writing the Issue with the section's quoted heading instead of its number, or admitting the section-number check for any cell that edits src/ beside a spec, removes the trap.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
