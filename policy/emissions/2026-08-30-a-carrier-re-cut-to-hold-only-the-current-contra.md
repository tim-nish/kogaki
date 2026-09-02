<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-30
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#703 filed two findings against SPEC-terrain: a superseded lead sentence standing above its own correction, and five pointers naming the wrong amendment. Before the issue was picked up, an unrelated sitting (kogaki#685) re-cut the same file under the rule 'operative carriers hold the current contract only'. That re-cut deleted the sentence and two of the five pointers as ordinary consequences of its own rule. Nothing connected the two: the re-cut's close named neither finding, #703 sat in the queue reading as wholly outstanding, and its line pointers had gone stale in the same commit, so a session trusting them would have found nothing at the cited lines and could as easily have concluded the issue was wrong.

## The learning

A cleanup whose rule is 'remove what is no longer current' is a DISCHARGING ACT for every open finding whose subject is superseded text, and it is the one kind of discharging act that leaves no trace on the things it discharges - because the sitting performing it is not thinking about them and its diff names only what it removed, never what that removal settles. Two failures follow and they pull in opposite directions, which is why noticing only one is the trap. The queue cannot tell done-elsewhere from neglected, so the finding is re-picked-up at full cost and may be re-implemented against text that no longer exists. And the finding's own coordinates are invalidated by the same commit, so a later session following them lands in unrelated content and may read the issue as mistaken rather than as overtaken - the more confident failure of the two. The cheap moment is the re-cut's own close, where the removed text is still in hand and a grep of open issues for its distinctive phrases costs one query; after that the evidence only exists in git. Practical form: when a change's rule is stated as a class rather than an instance - current contract only, retire the vocabulary, remove the superseded arm - treat the open-issue queue as one of its affected surfaces and reconcile it in the same act. And when picking up any issue older than the file it names, verify its findings against the commit it was FILED at before trusting or dismissing them, because a finding that was true at filing and is absent now is evidence of discharge rather than of error.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
