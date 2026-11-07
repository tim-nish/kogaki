<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-01
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-10-01 /ship-cycle 1238 dispatched cell 1 of 2. The worker was stopped after 100 seconds because the installed gate-worker-file-read.py refused 'sed -n 1p src/draft.mjs' as a read wider than 400 lines. Preflight had already reported that hook as stale against claude-toolkit.

## The learning

Preflight reports a stale worker guard as information only, yet one false refusal from that guard is enough to end a worker. Before dispatching a worker on a file of more than 500 lines, run issue-sync install-hooks wherever preflight reports a stale guard.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
