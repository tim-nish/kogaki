<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-18
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1423 deleted the 29 checks that had never blocked a failure. Two of them were the only registry members whose covers reached moves/, the Move library. The next run on kogaki#1415, which rewrites moves/, was refused at admission with no registered check covering its files, and no later ingest could have been admitted either.

## The learning

When a check suite is pruned on fire history alone, look at what each deleted member covered, not only at what it caught. A check that never fired may still be the one member whose covers names a data directory, and the admission rule that every plan cell carries a covering check turns its deletion into a refusal of every future change to that directory. Before deleting such a member, either keep one covering member for the path or accept that the path cannot be changed through the typed route until a new contract-carrying check lands. In kogaki the correction was a new check over moves/ that runs the Adapter's own validator and the ingest's own INDEX writer, filed as kogaki#1434.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
