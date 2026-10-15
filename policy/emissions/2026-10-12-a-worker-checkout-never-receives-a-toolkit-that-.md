<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-12
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1349 on 2026-10-12: the first implementer worker after kogaki#1346 moved policy/kit/ out of the tracked tree failed its suite on five kit checks reported as missing files, while master's CI was green on the same base.

## The learning

When a directory stops being tracked and starts being installed per checkout, every fresh checkout that the installer does not run in loses it, and anything registered by path inside it fails there. The worker setup installs some machine-local files but not the newly installed kit, so the registered suite fails in every worker regardless of what the worker changed. Moving a tracked directory to an installed one also needs the worker setup step to install it, or the registry entries to tolerate its absence, in the same change.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
