<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

Opening PR #943 from an isolated worktree, the implementation-licence hook denied the act with 'Branch (unresolved) carries no issue number'. The command was a compound: an absolute cd to the scratchpad, a heredoc writing the PR body, then a relative cd into the worktree and gh pr create. The hook resolves its working directory by scanning the cd tokens before the act; the relative cd resolved against the session's own directory, git found no branch there, and a correctly licensed branch read as unlicensed. The same denied command had also never run its earlier parts, so the body file the retry named did not exist either.

## The learning

A guard that infers where a command will run from the command's text sees only what the text states literally. A relative path, a path that depends on an earlier cd in the same line, or anything computed at run time resolves to nothing the guard can check, and a guard that fails closed then denies correct work with a message about the work rather than about its own blindness. Two habits follow. Address the act with one absolute cd at the front of the command, so the guard and the shell agree on the directory. And treat a denied compound command as never having run at all: every side effect it was going to leave before the denied act is absent on retry, so write prerequisite files in their own step first.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
