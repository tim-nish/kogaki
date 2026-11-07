<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-19
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-10-19, during /ship-cycle 1445 --session, the policy kit install was run as policy/kit/install.sh inside a new linked worktree. The kit directory is ignored and so absent there, the command was not found, its output had been discarded, and the first suite run failed seven checks, five of them kit checks missing from disk.

## The learning

A tool that lives in an ignored directory cannot install itself into a fresh copy of the repository, because the copy does not have it yet. Call it by the path in the checkout that already has it (the main tree), and never discard its output: a silent install failure looks like a pass until the suite reports missing files.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
