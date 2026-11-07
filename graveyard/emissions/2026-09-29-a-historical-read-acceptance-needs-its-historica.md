<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-29
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1217: the worker was stopped twice for verification-refused. At 00:28Z it was refused running the check its Acceptance names. After the plan was amended to name that check, it was refused at 00:54Z on its first read of a pointer's referent at the pointer's blame commit (git diff <empty-tree> <sha> -- specs/SPEC.md piped through grep, sed and tail into a /tmp file).

## The learning

When an Issue's Acceptance asks the implementer to read files as they stood at an older commit (for example 'each anchor is taken from the referent as it read at the pointer's blame commit'), the worker needs a history-reading command such as git show <sha>:<path> or git blame, and the lane's allow list grants neither. Widening the plan's file list cannot fix this, because the missing permission is for a read, not a file. So the worker improvises pipelines and temp files, and the verification-refused guard stops it on the first attempt. Check such Issues at admission against the lane's allow list, not after a worker has been spent.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
