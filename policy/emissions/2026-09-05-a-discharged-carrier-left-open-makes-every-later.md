<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run picked up issue #866 and found its implementing PR (#867) had merged the previous day, with all four acceptance criteria met and both review findings discharged in-diff. The issue was still open only because the PR used the non-closing 'for #N' form and the close is a judgment row nobody was holding. Establishing that nothing was owed cost the run a full re-verification: re-running the check suite, re-reading the merged code against each acceptance criterion, and re-reading the review thread to confirm that a finding marked 'carried: register' — a destination this repository does not declare — had in fact been answered in-diff rather than left dangling.

## The learning

A carrier that is finished but still open does not merely look unfinished — it forces every later run to rebuild the proof that it is finished, from the artifacts, at full cost. The open state carries no record of what was already verified, so diligence and waste are indistinguishable from inside the run: re-running the checks and re-reading the findings is exactly what a run SHOULD do when it cannot tell whether work is owed, and it is pure loss when the answer is that none is. The cost is therefore invisible in the place it is paid, and it recurs once per run rather than once. Two things follow. The close is not bookkeeping performed after the real work; it is the act that writes down what the verification found, and skipping it discards the verification rather than deferring it. And the moment to record the discharge evidence is the moment the work merges, when the evidence is in hand — not the next time somebody wonders, when it has to be reconstructed.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
