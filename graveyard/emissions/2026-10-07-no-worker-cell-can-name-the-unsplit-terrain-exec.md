<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-07
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1300 on 2026-10-07: admit-issue verdict refused the plan cell because its files read 638k tokens against a 94k worker window; the Terrain executor module alone is 475 KB, about 119k tokens.

## The learning

Any issue whose change lives in the Terrain and Brief executor cannot be admitted to a worker while that executor is one file, because the file is bigger than the whole window a worker has for reading. Splitting the cell does not help, since one file cannot be divided across cells. Such issues wait on the split (kogaki#1259) or are carried by an owner-elected session pass. Separately, admission printed a false re-direct route for the same issue, because a new file under a top-level folder such as checks/ is read as belonging to another repository.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
