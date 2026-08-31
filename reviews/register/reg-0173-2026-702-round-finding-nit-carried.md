---
id: reg-0173
status: pending
observed_at_pr: 702
observed_at_head:
class:
recorded: 2026-08-29
source_comment: 5461141615
---
**2026-08-29 — PR #702 round 1, finding 3 (nit), carried from the review rather than fixed.**

`refuseUnauthorizedOwnerWrite`'s destination match is **lexical**:
`resolve(dir) !== resolve(ownerRenderingLocation())` (`terrain/terrain.mjs`).
It normalizes `..` and relativity but **not symlinks**, and it matches the owner
location **exactly rather than as a prefix**. So `--rendering-dir <symlink-to-reports>`
and `--rendering-dir reports/x` both land inside the owner's tree unrefused.

**Why it is carried and not fixed.** Neither writes the two named owner
artifacts at their contract paths, so §2.5.1's lifetime rule arguably leaves
them outside §15.5's claim. But §15.7's *"a route whose refusal could be
switched off would be exactly that"* reads on it, and the reviewer's own note is
the reason this lands here: **the accretion is worth counting rather than
fixing per-instance.** A per-instance repair (canonicalize symlinks; match as a
prefix) is one more enumerated hole closed, which is the shape §15.5's own
served position rules against.

**What would make this actionable:** a second instance of a
resolved-destination guard admitting a path inside the surface it protects, in
this repository or in a sibling. Two instances is a class; one is a nit with a
stated ground for waiting.

carried from: PR #702 round 1 finding 3 · licensing issue kogaki#681
