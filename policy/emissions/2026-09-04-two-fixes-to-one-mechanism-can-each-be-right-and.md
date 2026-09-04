<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-04
repo: Kogaki
grain: lesson

## Trigger — what happened

Repairing a review engine's carry-forward deadlock (kogaki#851 / claude-toolkit#819), the decided remedy — widen the identity hash to cover commit messages — was tested against the earlier ruling it shares a code path with, and reversed that ruling on its own founding specimen: both rulings are about an empty receipt commit, one requiring it to carry a review forward and the other requiring it not to.

## The learning

When two defects are filed against the same mechanism at different times, the second fix is written against the second defect's specimen and the first ruling survives only as a test nobody re-reads. Run the new arm against the OLD ruling's fixture before building it, not after: here the widened hash flipped the earlier specimen from present to stale, which the new issue's own acceptance did not notice because it asserted the rebase property (messages unchanged) and never the receipt-commit property (messages changed, diff unchanged) that the earlier issue exists for. The collision was not a defect in either ruling. It resolved by finding the axis the two disagree on and splitting the behaviour along it rather than picking a winner: a carried-forward review may carry a CLEAN verdict across evidence the diff cannot see, but may never carry a GATE across it — so an unchanged diff still cannot shed its review, and a finding whose fix lives outside the diff can still be verified. Where two rulings look contradictory, check whether they are answering the same question; a shared specimen is not a shared question.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
