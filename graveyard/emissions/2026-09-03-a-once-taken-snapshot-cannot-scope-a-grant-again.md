<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

An orchestrated run scopes its own permission to commit by a snapshot of the working tree taken at run start: it may commit only paths that were absent from that snapshot, which stands in for 'these are this run's own writes'. Four minutes into the run, three files the run had not touched appeared as modified, all bearing the same timestamp to the second — another agent working in the same checkout. Because they were absent from the start-of-run snapshot, the permission covered them exactly as if the run had written them. Worse in the other direction: an edit the run had just made to a fourth file was silently reverted by that same writer, and the run discovered this only because a diff it took to move the change onto a branch came back empty.

## The learning

A snapshot taken once at the beginning measures a moment, while the permission it scopes is exercised over an interval. The two are the same only if nothing else writes during that interval, which is the very assumption the snapshot was introduced to stop trusting - so the mechanism reproduces the hole it was built to close, one level in, and reads as rigorous while doing it. The failure is silent in both directions and the directions are not symmetric: a foreign write that arrives after the snapshot is indistinguishable from the run's own work and gets committed, while a foreign revert of the run's own work leaves nothing behind at all, because an empty diff looks exactly like a change that was never made. Note which of those two a reader would ever notice. Prefer scoping such a permission to paths the run can name because it wrote them - a list it builds as it goes, not a set difference against a photograph - and treat an empty diff of a file you just edited as evidence about the environment rather than about your edit. Where a concurrent writer is possible at all, the cheap structural answer is to stop sharing the working copy: a branch checked out somewhere of its own is clean by construction, and needs no premise about who else is typing.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
