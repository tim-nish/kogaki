---
id: reg-0051
status: pending
observed_at_pr: 393
observed_at_head: 99280b3
class:
recorded: 2026-08-12
source_comment: 5265650323
---
row kind: spent-bound/in-diff carry (instance-class, NOT an `out-of-dimension:` line — does not count toward rule 3's three-of-a-class trigger)

From PR #393 round 1 (head `99280b3`), `finding: nit open`, dispositioned `carried: register`:

`.gitignore:41` adds `moves.md` as a **non-anchored** pattern, so it excludes a file of that name at any depth, while the clause it exists to declare binds only the repository-root file (`specs/spec-draft-pipeline/SPEC.md:612`, "repository-root \`moves.md\`"). The neighbouring `policy/shape.md` is rooted by carrying a slash; this one is not. The latent case is the one the entry's own comment argues against: §6.9 lands admitted Moves as files under `moves/`, so a `moves/moves.md` would be silently un-addable — admission-by-omission exactly where the comment wants a gate. Remedy: one character, `/moves.md`. Latent today — no second `moves.md` exists in the tree.
