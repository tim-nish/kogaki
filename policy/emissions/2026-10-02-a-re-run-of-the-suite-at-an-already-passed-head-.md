<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-02
repo: Kogaki
grain: lesson

## Trigger — what happened

On kogaki #1120 (PR 1245), re-verifying a repaired worker branch with no gateway and no claude on PATH, the first run of tools/run-registered-checks.sh executed nothing: it reused the full-pass verdict cached locally for that head, and a Windows claude on /mnt/c was still on PATH.

## The learning

The suite runner skips every check when it has a recorded pass for the same commit, so running it again to confirm the result under different conditions (no gateway, no claude, CI shape) confirms nothing unless CHECKS_FORCE=1 is set. Removing claude from PATH on WSL also means dropping the /mnt/c Windows paths, not only the nvm directory. The same round also showed the review engine's own suite call failing on '--timeout 7200.0' (a float where an int is required), so the review report could not read a suite result and fell back to the author's claim.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
