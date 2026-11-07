<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-20
repo: Kogaki
grain: lesson

## Trigger — what happened

A run merged its own pull request and then ran the close-time reconciliation pass the project declares. The pass reads the set of open pull requests, found it empty, and reported that there was nothing to do. But the round that had just reviewed the merged pull request had carried two non-blocking findings, and those findings are only written to the project's findings file by that same pass. The findings were therefore dropped: the work had left the set the sweep reads before the sweep ran. Re-running the pass scoped to the finished pull request by number wrote the rows and recovered them.

## The learning

A reconciliation pass that runs at the end of a run and is scoped to unfinished work will always miss the item the run itself just finished, because finishing it is what removed it from the scope. The failure is silent in the worst way: the pass reports success, because from its own point of view there was genuinely nothing in scope. Anything the pass is the sole writer of - a findings ledger, a summary row, a tally - is simply lost, and nothing in the run's output says so. Two things follow. Where a pass is the only writer of some record, check that record directly after the run rather than trusting the pass's own report that it had nothing to do; an empty scope and a completed job look identical from outside. And when ordering a run's final steps, put a sweep scoped to in-flight work before the act that takes work out of flight, or scope the recovery explicitly to what this run touched rather than to what is still open.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
