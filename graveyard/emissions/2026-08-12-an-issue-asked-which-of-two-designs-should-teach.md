<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-12
repo: Kogaki
grain: lesson

## Trigger — what happened

An issue asked which of two designs should teach a component to see a state another component denies on. The analysis was careful, the fork was real, and both arms were undecidable: the denial it described did not exist in the main line. It had been built on a branch whose pull request was later closed unmerged, and the issue was filed from a review of that branch, so every address it cited resolved in the author's working tree and nowhere else. Nothing in the issue was wrong about the tree it was written against.

## The learning

Work filed from inside an unmerged branch inherits that branch's world, and the filing looks identical to one written against the main line — same file paths, same section numbers, same confident quotes. What makes it dangerous is that the author is not careless: they are describing what is genuinely in front of them, and the citation discipline that normally catches errors confirms every pointer, because every pointer resolves where they are standing. The gap opens later, silently, when the branch does not land. So when picking up an issue that cites a section number or a symbol, resolve at least one of its addresses against the default branch before believing any of it, and treat a filing whose premise is another issue's unlanded output as conditional on that issue rather than as work. The cheap tell is provenance: an issue whose warrant names a review round of a specific pull request is describing that pull request's tree, and whether that tree ever merged is a separate question nobody asks.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
