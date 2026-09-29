<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-28
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-09-28 a /ship-cycle run on #1215 ran issue-sync merge 1218 --auto. It printed 'merged PR #1218 (--squash)', but GitHub showed the PR still OPEN and BLOCKED. The required check 'Run every registered check' was red on runs-retention, the same failure master has carried since d2b7034 removed the tracked runs/README.md.

## The learning

With --auto, a successful merge call only means GitHub accepted the auto-merge request. The PR merges later, and only if every required check passes. So a 'merged' line from the tool is not evidence that anything merged: read the PR state (state, mergeCommit) before recording a pass or starting cleanup. Separately, while master itself fails a required check, no PR in this repository can auto-merge, whatever its own review says. A red required check on master blocks the whole merge lane, not one PR.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
