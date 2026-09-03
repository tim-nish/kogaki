<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

A ship-cycle run ran 'git checkout -q -b <branch>' where the branch already existed. Branch creation failed with exit 128 and the message 'A branch named X already exists' — and the checkout happened anyway, leaving the main working tree on that branch. The reflog recorded 'checkout: moving from master to 823-...'. Nothing in the failed command's output said the tree had moved. It was found only because a later act ran a guard that reads the main tree's branch.

## The learning

A command that fails can still have performed part of its work, so reading the exit code tells you the command did not succeed and never tells you the state is unchanged. Combined-action commands are where this bites: one that both creates a thing and switches to it can fail the creation, succeed the switch, and report only the failure. The state a failed command leaves is worth a guard of its own, because the failure message describes what did not happen and the reader infers from it that nothing did.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
