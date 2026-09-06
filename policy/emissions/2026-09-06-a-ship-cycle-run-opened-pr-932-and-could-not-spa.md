<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

A ship-cycle run opened PR #932 and could not spawn its first review round: the machine-local declaration carried review_rounds_max: 2, but since kogaki#789 the round bound lives on the owner-only standing authorisation record, and this repository's standing record predates that change. The engine refused every spawn with "a bound that cannot be read is not an unlimited bound". The repair is two approve-review commands that a session is denied from running, so the run held at the merge frontier with a PR open and no round spent.

## The learning

When a control is moved from a surface a session can read to a record only the owner can mint, the records minted before the move do not become invalid — they become UNREADABLE, and the two are different failures. An invalid record fails at the moment it is used, names itself, and points at what to fix. An unreadable one fails at every use, in a downstream stage that has no idea the control moved: here the refusal surfaced at spawn time, on a pull request whose subject had nothing to do with reviewing, several stages after the fact that mattered. The surface that still shows the old value is what makes this expensive — the declaration file still said "2", so every reader that checked it, including the one writing this, saw a bound that was already ignored. Two things follow. Report the stale surface at the moment it stops being the carrier, rather than leaving it in place to be read as current. And where a migrated control cannot be re-minted by the party who hits the refusal, say so at the earliest read rather than at the act: a preflight that reported "standing record predates its bound" would have cost this run nothing, while discovering it at spawn cost a full implementation, a push and a pull request first.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
