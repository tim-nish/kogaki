<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-02
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1240 on 2026-10-02: spawn-implementer refused because .claude/implement-lane.json still carried the retired allow member (claude-toolkit#1329); removing it then tripped the allow-hash drift refusal against the first dispatch's recorded hash.

## The learning

Two refusals chain on any issue that was dispatched before the allow list was retired: the first demands the allow member be removed, and the removal itself is refused as an unexplained change to the worker's permissions. The way through is an admission plan amendment that names the change, which mints a new plan hash and admits one dispatch; restoring the old file is not a route, because the first refusal then fires again.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
