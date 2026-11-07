<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-26
repo: Kogaki
grain: lesson

## Trigger — what happened

A check's invocation was swapped for an equivalent one. The assertion downstream of it read a marker string the old invocation produced and the new one does not, so the marker was deliberately re-bound to something the new invocation emits — a considered change, explained in a comment written at the site. The same check carried a MUTATION whose job was to prove that assertion could fail: it injected a broken implementation and asserted the marker was absent. That second copy of the marker was not re-bound. The mutation then passed whatever the injected code did, the suite stayed green, and the guard existing to catch a specific broken implementation could no longer catch it.

## The learning

An assertion and the mutation that proves it can fail are ONE unit that happens to be written as two, usually far apart in the file, and only the assertion is where attention goes when an invocation changes. The mutation reads as test scaffolding rather than as a second copy of the same claim — so it is not searched for, and nothing about editing the first copy surfaces the second.

What makes the resulting state worse than an ordinary missed edit is the direction it fails in. A stale mutation does not error: it asserts the absence of something the new invocation never produces, which is trivially true, so it PASSES. The suite goes green, and greener than before in a sense — a mutation that can no longer fail also never flakes. The only observable is that a deliberately broken implementation now survives, and nobody runs one.

The practical rule is a search rather than a discipline: when re-binding what an assertion reads, grep the file for every other occurrence of the old marker before moving on. Markers are short distinctive strings, the search is one command, and the second copy is almost always the mutation. Reviewing the diff cannot substitute — the diff shows the line that changed, and the defect is in the line that did not.

The sharper version, worth stating because it generalizes past markers: any test whose passing depends on a string the code under test produces has a second reader somewhere proving it can fail, and a change to the producer must be applied to both readers or the pair silently decouples. The pair is the unit; either half alone is a claim.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
