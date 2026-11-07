<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-10
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#725 untracked an install output. Three amends were spent because a broad staging command kept re-adding the file, and the first .gitignore edit was inert.

## The learning

Untracking a file is not one act, and two of its failure modes are silent. A pattern in .gitignore does not exempt a path that is already tracked, so any later broad staging command re-adds it and the untracking is undone with nothing printed; the staging must name paths from then on. And where the ignore file is written as a blanket exclusion plus an allowlist of re-included paths, adding an ignore line for a path the allowlist re-includes later in the file changes nothing at all, because the last matching pattern wins. The untracking act there is deleting the negation, not adding an exclusion. Both were reached by reading git ls-files after each commit rather than by trusting the commit; neither produced an error.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
