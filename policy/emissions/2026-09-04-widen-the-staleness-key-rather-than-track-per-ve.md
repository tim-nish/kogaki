<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-04
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#851 / claude-toolkit#819. A review engine cached a verdict and decided whether the cache still applied by hashing the code diff. A blocking finding whose fix was a commit message could then never be cleared: the fix changed no tracked file, the hash was unchanged, the stale verdict kept speaking for the new state, and the round that would have verified the fix was the round the engine refused to run until the verdict cleared. Two repairs were on the table — widen the hash to cover commit messages, or have each verdict record which sources it actually read so only a moved source invalidates it.

## The learning

When a cached judgement has to be invalidated because its evidence moved, widen the key it is stored under rather than tracking, per judgement, which evidence it rested on. The precise version is tempting and it is the expensive one: it needs a schema for the sources, a writer that fills it in, a reader, and a fallback for every judgement already cached without it — and the record of what was read is written by the thing being checked, so the invalidation ends up resting on the system's own account of its work instead of on something observable. A widened key is a few lines, needs no new record, and fails in the safe direction: it invalidates some judgements that were still good, which costs a repeat, where the precise version fails by keeping one that was stale. Two things make it work rather than just simpler. Say out loud which ordinary acts now cost a repeat, so nobody discovers it as a bug — here, rewording a commit message. And check that the key still excludes whatever the system routinely changes for its own reasons: a rebase rewrites shas and dates but not messages, so the property the original rule existed for survives untouched. If widening the key would fire on a routine maintenance act, the key is wrong and that is the signal to look again.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
