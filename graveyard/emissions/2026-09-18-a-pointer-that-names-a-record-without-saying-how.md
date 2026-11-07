<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-18
repo: Kogaki
grain: lesson

## Trigger — what happened

A drafting step's input named the material it required as 'the served record at <address>@<hash>' and stopped there. Reaching the prose took three further calls: one that returned only manifests, one that failed because the address's short name is not the identifier the read tool accepts, and one over a shard whose name had to be reconstructed from the record's own date. A first attempt also fetched the wrong text, because the pointer's hash belongs to the narrative record while a sibling record shares its name under a different hash.

## The learning

When a work item hands somebody an address for material they must go and get, the address is only half the instruction. The other half is the call that turns it into text: which reader serves it, what identifier that reader accepts, and how the address's parts map onto that identifier. Leaving that out does not make the item shorter, it moves the work to the reader and invites a wrong fetch that looks right — two records can share a name and differ only in a hash nobody compared. Either carry the material inline, or carry the address together with the one call that resolves it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
