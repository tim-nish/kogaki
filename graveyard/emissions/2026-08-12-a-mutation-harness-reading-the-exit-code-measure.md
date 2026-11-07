<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-12
repo: Kogaki
grain: lesson

## Trigger — what happened

A mutation batch against a merge-gate check reported all seven mutants killed. The harness read the kill signal from the process exit code. That check has a live pass which contacts the pull request it gates, and throughout the batch it was exiting 1 for a reason no mutant touched: the very PR carrying the work had open blocking findings from its own first review round. Every mutant was reported killed by a failure that would have occurred with no mutation applied at all. A reviewer later observed that two of the seven could not have been killed, because their assertions appended to a failure list after that list's only drain. Re-measuring against the fixture verdict rather than the exit code showed three had survived - the two named, and one nobody named, whose fixture asserted a count that the mutated rule leaves unchanged. The batch's own tell was there and was misread: it reported zero survivors where the previous batch had reported four, and that read as the code having improved.

## The learning

A mutation is killed when the assertion bound to the mutated behaviour fails, and nothing else counts. An exit code is the disjunction of every reason the program can fail, so a harness reading it reports a kill whenever anything at all is wrong - including conditions the mutation neither caused nor could cause. This is dangerous in exactly the situation where mutation testing is most wanted: a checker being changed, run against a live world it inspects, where some unrelated part of that world is red precisely because the work is mid-flight. Read the signal the fixtures themselves emit - the failure line, the pass line's absence - never the process status. Two secondary tells are worth holding onto. A batch with zero survivors, following a batch with several, is a claim that the code got better; the likelier explanation is that the signal got worse, and the direction of the surprise is the thing to be suspicious of. And an assertion appended to a failure list after that list's last read can never fail, so a block can be correct, present, and inert; a repeated drain is a repeat that has to actually happen, which is an argument for making it a function that every block calls rather than a block every author remembers.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
