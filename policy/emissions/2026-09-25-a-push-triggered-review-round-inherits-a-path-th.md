<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-25
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-09-25, /ship-cycle 1198 pushed a round-1 fix to PR #1201. The push trigger spawned round 2 itself, and it died at exec with exit 127 on the Windows claude shim. The round counted against the bound, and the PR could merge only under an owner-granted review-presence bypass.

## The learning

Putting the right claude first on PATH protects only a round the session spawns itself. A round started by the push trigger runs with whatever PATH the trigger inherited, so every post-round push is a bet that the trigger's environment is sound. Until the trigger resolves claude by absolute path, a fix after round 1 costs the terminal round with nothing reviewed. The cheaper route for a should-grade finding is to carry it to the register rather than push a fix.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
