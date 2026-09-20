<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-20
repo: Kogaki
grain: lesson

## Trigger — what happened

A review round blocked a pull request because the repository's own check suite exited 1 at the branch's head. The suite was green in the worktree the branch was built in, green in CI on a clean clone at the same commit, and red in the reviewer's worktree, in a fresh worktree, and in a byte-identical copy of the green one. The same red reproduced one commit earlier, on the branch's base, so it was not the change's doing. Establishing that took six separate runs of the same check and an instrumented copy of the file.

## The learning

When a check's verdict depends on the machine it runs on, it stops being evidence for either side of an argument. The round that read the red as proof the change broke something was reasoning correctly from what it could see; the author reading the green in their own working copy was too. Neither reading was available to the other, and the check offered nothing to tell them apart. The cost is not the wrong verdict, which a second look corrected, but that every future dispute touching that check has to re-run this same investigation before it can start. So when a check disagrees with itself at one commit, the thing to record is the disagreement itself, not just the side you decided was right: the next reader needs to know the instrument is unreliable, and that fact is invisible in any single run of it. A shared continuous-integration run is worth more than a local one here for exactly one reason -- it is the run both parties can see.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
