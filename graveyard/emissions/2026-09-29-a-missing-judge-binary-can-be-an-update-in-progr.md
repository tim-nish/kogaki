<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-29
repo: Kogaki
grain: lesson

## Trigger — what happened

A /brief run's review_path judge failed with spawn ENOENT on the nvm claude path at 12:02; Claude Code was auto-updating at that moment, and the binary was a 500-byte placeholder

## The learning

The Brief executor says a missing judge binary will not be there on a re-ask. But Claude Code auto-updates in place, and while it does, the binary is briefly a small placeholder, so a spawn at that moment fails with ENOENT. After the install finished (about a minute), re-entering the wait with 'run --status --job await' finished the step with no bound spent. The error's advice treats a short-lived absence as a permanent one: check the binary's size and version before giving up on the run.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
