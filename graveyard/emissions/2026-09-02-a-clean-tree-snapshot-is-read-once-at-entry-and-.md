<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-02
repo: Kogaki
grain: lesson

## Trigger — what happened

An orchestrated run opens by recording what the working tree already holds, so that a later automated commit can be scoped to paths that were absent from it. The snapshot was taken and was accurate: the tree sat on the main branch with nothing modified. Near the end of the same run, a routine listing showed the tree checked out on an unfamiliar branch, at an unfamiliar commit, for an issue the run had never seen. A second session had branched from the first session's own latest commit and was working in the same checkout. Nothing had failed, nothing was corrupted, and the run's own work was intact and already published. The snapshot's premise had simply stopped being true partway through, and the only reason anyone noticed was that a later step happened to list the tree again for an unrelated reason.

## The learning

A precondition read once at entry describes the moment it was read, and every use of it afterwards is an assertion about the present made from a past observation. Where the thing being described can be changed by an actor the reader cannot see, the gap between the reading and the use is not a small window to be tolerated — it is the whole exposure, and it grows with the length of the run.

The failure is quiet by construction. A concurrent actor sharing a workspace does not announce itself, produces no error, and may leave everything in a valid state; the first observer's own work can be complete and correct throughout. So the usual signal — something broke — never arrives. What arrives instead is a reading that no longer matches, noticed only if something re-reads, and re-reading is exactly what an entry-time snapshot exists to avoid.

Two consequences worth acting on. Where a grant is scoped by a snapshot, the acts that spend that grant should re-read the cheap part of it at the moment of spending rather than trusting the entry-time copy — the cost is one status call against a decision that writes to a shared workspace. And where a rule forbids two of something running at once, notice whether the rule is enforced against the actors it can see or against the resource being shared: a prohibition on launching a second worker inside one process binds that process, and says nothing about a second process. The resource is what needs the guard, so the check belongs at the resource — is anything else operating here — and not at the launcher.

The narrower operational rule that falls out: on discovering a co-tenant mid-run, the safe move is to touch nothing shared. Do not restore the state you expected, because the other actor is depending on the state that is actually there; the restoration is more destructive than the surprise. Report, and let whoever holds both contexts decide.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
