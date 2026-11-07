<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

A licence guard denied a legitimate pull-request creation, naming a closed issue that had nothing to do with the work. The command was 'cd $VAR/worktree && gh pr create', run from a git worktree whose branch named the correct open issue. The guard scans the command text for a preceding directory change to learn where the act runs; $VAR was a shell variable it could not expand, so it fell back to the session's own directory, read THAT branch, and resolved a different and closed issue. Re-running the identical command with the path written out literally passed. The whole tool call was refused, so a file the same command was supposed to write was never written either, and the next step failed for a second, unrelated-looking reason.

## The learning

A guard that reads the command text rather than the process state is reading something the shell has not finished with. Variables, globs and substitutions are all still unexpanded there, so any of them in a directory change makes the guard's answer wrong rather than absent — and failing closed, which is correct, turns it into a denial that names real but irrelevant evidence. That is worse than an obvious error because the refusal looks authoritative: it cited a genuine closed issue, and the tempting next move is to argue with the rule instead of noticing the guard was told the wrong location. Write paths out literally in any command a guard inspects, and read a denial that names something unrelated to the work as a signal that the guard resolved the wrong subject. Two costs travel with it: a refusal takes down every other command sharing the call, so recovery is not just re-running the denied step; and a guard of this kind cannot be made complete, since expanding shell syntax is the shell's job, so the honest remedy is on the caller's side.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
