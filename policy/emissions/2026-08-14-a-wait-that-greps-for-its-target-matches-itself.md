<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-14
repo: Kogaki
grain: lesson

## Trigger — what happened

A session started long-running background work and wrote a wait loop that polled for the work's process by searching the full command lines of all running processes for the tool's name. The loop never exited: the waiting shell's own command line contained that name, because the search string was part of the command being run, so the search always found at least one match — itself. Three such loops spun for about two hours while the work they were waiting on had in fact finished after four minutes. The session reported 'still running' the whole time, and the operator, not the session, noticed.

## The learning

A wait that detects its target by pattern-matching over running processes will match itself whenever the pattern appears in its own command line, which is the normal case, because the pattern was typed into that very command. The loop then cannot terminate and, worse, reports the healthy-looking state — still waiting — rather than an error, so nothing distinguishes it from work that is genuinely slow. Two habits remove the class rather than catching it. Wait on an identity, not a description: hold the process id you actually started and wait on that, which cannot match anything else. Where only a pattern is available, exclude your own process explicitly and, more importantly, make the waiter report what it observed each time it looked, so a wait that is finding only itself says so. And treat any wait that outlives a generous estimate of the work as suspect by default: check the work's real output before repeating that it is still running, because a waiter is a claim about the world and it can be wrong in exactly the direction that is hardest to notice.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
