<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-22
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-10-23, while running a few registered checks by hand for kogaki#1521, a loop looked up each check's file in checks/registry.json under a key the registry does not use, got an empty name, and ran 'bash' with no file; bash then waited on its input until the command was killed at its time limit.

## The learning

When a script runs a file whose name it has just looked up, an empty lookup must stop the script rather than reach the runner: a shell started with no file reads its own input and waits forever, so a wrong key looks like a slow check instead of a mistake. Guard the empty name, and give the runner no input to wait on.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
