<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-10
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1076: a workflow table pinned the judge's MODEL and left its COMMAND as the bare word `claude`; an advance fired from a second session resolved a Windows shim first and three judge calls exited 127 in a tree where the same judge had run clean an hour earlier

## The learning

A pin that names the model but not the executable is not a pin. Where a run records what produced a result, the record has to name the thing that was actually run, not the name of the thing that was asked for: a bare command word is resolved by whoever spawns it, so two runs with identical pins can execute different binaries and the identity they collide on cannot tell them apart. The repair has two halves that only work together. The party that OWNS the run resolves the command once, at the act that opens the run, and every later act executes the recorded absolute path rather than re-resolving in whatever environment it happens to be fired from. And the resolution must RUN each candidate rather than test it: existence and the execute bit are both true of a broken shim, which fails only when executed, so a walk that stops at the first file it finds picks exactly the wrong one. The version the candidate reports then becomes a component of the pin, because that is the fact the pin was missing.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
