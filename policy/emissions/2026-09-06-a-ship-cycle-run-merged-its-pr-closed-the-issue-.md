<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

A ship-cycle run merged its PR, closed the issue by hand, and then had `issue-sync record-pass` deny with 'pull requests closing it: none' — because the PR body's closing keyword was backticked to keep a push hook from auto-closing, which also stopped GitHub from ever recording the PR-to-issue link. Unbackticking the keyword after the merge created the link and the pass recorded.

## The learning

A token deliberately disarmed to stop one consumer acting on it is also disarmed for every consumer that only READS it, and the second set is usually the larger and the quieter one. Escaping a closing keyword to prevent an automatic close does not merely defer the close — it removes the machine-readable relation entirely, so later acts that derive an outcome from that relation report the work as never having happened rather than as pending. The tell is a downstream reader denying on an ABSENCE at a point where the fact is plainly true and visible to a human, and the repair is to separate the two functions rather than to weaken either: keep the relation always written, and gate the ACT on its own approval carrier instead of on whether the relation can be parsed.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
