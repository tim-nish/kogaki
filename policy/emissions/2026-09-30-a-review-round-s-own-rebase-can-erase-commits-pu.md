<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-30
repo: Kogaki
grain: lesson

## Trigger — what happened

On kogaki PR #1234 (2026-09-30) two message-only receipt commits were pushed to the branch while the push-triggered review round was starting. The round rebased the older head onto master, force-pushed it, and reviewed that head, so the two commits vanished from the branch and the round reported the very gap they had filled. Recreating them as fresh commits on the new head was the only route the hooks allowed; a second round then passed. Separately, the PR body's plain 'Closes #1229' line was never linked by GitHub, so the merge did not close the issue and the close record graded the run as held.

## The learning

When you push to a branch whose review round may already be starting, read the branch head after the round lands before trusting that your commits are there: the round's rebase is computed from the head it read, and its force-push replaces anything pushed after that read. And a closing keyword in a pull request body is only evidence once GitHub shows the link on the pull request; check the link before merging, because a merged pull request cannot be linked afterwards.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
