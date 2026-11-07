<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-29
repo: Kogaki
grain: lesson

## Trigger — what happened

A sitting claimed 'full registered suite green' in a pull request, having run the suite before making the commit. One member reads the branch's commits since the fork point, so with no commits present it matched nothing and passed over a tree that did not yet exist; the claim was false the moment it was written, and the repository already carried an emission recording exactly this.

## The learning

A test run is evidence about the tree it ran on and about nothing else, and the gap that matters is not staleness but ORDER: a suite run before the commit cannot see anything the commit introduces, and the members most likely to be fooled are the ones that read the change itself — commit messages, diff paths, branch history — rather than the working files. Those members pass vacuously rather than failing, because an empty change set matches no rule, so the reading is 'green' and not 'could not determine'. That is what makes the error survive: a vacuous pass is indistinguishable from a real one at the point of reading, and the natural workflow puts the run first because that is when the edits feel finished. The operative habit is to re-run after committing whenever any member reads the change rather than the tree, and to treat a green earned before the commit as a claim about the working files only. The sharper warning is that carrying a written record of a defect is not protection against it — the emission naming this exact failure was already in the repository, authored by the same process, and it did not fire, because a record only binds the sittings that happen to read it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
