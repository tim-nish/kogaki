<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-02
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-10-02 a /brief run on the G2-1 set (thesis guard-enforces-rules-for-recognised) finished compose_path, then its review_path judge failed with spawn ENOENT on ~/.nvm/.../bin/claude. The binary's symlink and claude.exe were both re-written at 19:05, the same minute as the failure: Claude Code updated itself while the run was going. The run was left 'advancing' with no gate open, and the only way to advance it is a hook that fires after a gate answer.

## The learning

The judge path pinned in the workflow table is a file that the tool's own auto-updater replaces in place. A long /brief run can therefore lose its judge partway through, even though the binary is back seconds later. The executor reads ENOENT as 'the binary is not there and will not be there on a re-ask', so it raises no retry gate. Without an open gate, the hook-only advance has nothing to fire on, and the run is stranded after its Brief home was already minted. A missing judge binary should be treated as possibly transient, and the run should raise a re-run gate rather than stopping with no gate.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
