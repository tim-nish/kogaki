<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-01
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#624 moved the observation register from issue comments to per-item record files. The migration was right on every axis it was argued on — lifecycle state belongs in typed records, not a shared ledger — and it changed the price of an append from 'post a comment' to 'commit a file and land it through a pull request'. Because the branch is protected, landing that pull request needs an issue that is open and predates the head. So the carrier that exists specifically so a small finding does not have to mint its own issue came to require one. Two findings raised at PR #731 sat unrecorded for a day for exactly this reason, and the defect was only visible because someone tried to use the carrier and could not.

## The learning

When a carrier moves, its correctness and its COST are separate properties, and a migration argued on correctness will not notice the cost changing. The tell is specific and worth watching for: a cheap carrier exists precisely to be an exit that costs less than the ordinary path, so moving it into the ordinary path removes the only thing it was for while leaving it looking present and healthy. Nothing fails — the directory exists, the records validate, the reader is pointed at it — and the carrier simply stops being reached. So a migration owes a before-and-after on the cost of the act, not only on where the state lives; and where a document advertises a carrier as cheap, that sentence is a claim about a WRITE PATH and becomes false the moment the path changes, even though nobody edited it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
