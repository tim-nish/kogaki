---
id: reg-0140
status: pending
observed_at_pr: 560
observed_at_head: 0bf6c6a
class:
recorded: 2026-08-19
source_comment: 5344779565
---
**From PR #560 round 2 (kogaki#558/#559, head `0bf6c6a`) — four findings carried at a spent bound.** The PR converged (gate green, no blocking) and merged.

**should — kogaki#558's fix is half done.** The store lookup moved to `(repo, pr, round)`; the `PASS_CONSUMES` scan that SUPPLIES that round still matches `(pr, tag)` and breaks on the first hit, so with two entries for one PR the resolved round is decided by list order. The ambiguity #558 was filed about moved one call earlier rather than being removed — and the fixture's two-rounds case passes only because the appends happen in the order they do.

**should — cases 3 and 4 exercise the identical early return**, and the comment added at round 1 claims they differ. Both return at the `_round is None` guard, because `PASS_CONSUMES` is read before the store.

**should — the corrected pass line is still false of one case.** "The three that must REFUSE write the store directly" — case 4 writes nothing, which is what it tests. Round 1 corrected an overclaim and left a smaller one.

**nit — `_rg_marker` hand-writes a `PASS_CONSUMES` entry**, the state the fixture's own header exists to avoid.

Successor: **kogaki#561**, carrying all four with remedy shapes for the first.

**Fifth-degradation count, and a correction to the entry above.** PR #560 round 1 was the fourth degraded round; round 2's FIRST attempt died on an expired credential (1 turn, $0.00) and **the kogaki#553 restore fired and handed the grant back** — its first live exercise, on its own PR. The retry after re-login landed a clean, undegraded report. So the class recorded above now has a partial counter-instance: the grant-burning half is repaired and observed working; the one-denial-degrades-the-whole-report half is untouched and remains at four instances.
