<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-17
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run on kogaki#1132 dispatched its implementer with the typed act the admission verdict printed. The spawn died at once: 'worktree add failed: fatal: Not a valid object name: main'. The tool's --base help says the default is 'the remote's default branch'; this repository's default branch is master, and gh reported master, and origin/HEAD pointed at master. The default resolved to main anyway. Passing --base master explicitly made the identical call succeed.

## The learning

A flag documented as deriving its value from the environment can still carry a hard-coded fallback, and the documentation is what makes the fallback invisible: the operator reads 'the default is the remote's default branch', sees that their default branch is what the flag needs, and omits the flag. The failure then arrives as a git error about an object name rather than as a wrong default, so it reads as a broken repository rather than a wrong argument. Where a derived default and an observable environment disagree, the environment is the evidence and the derivation is the suspect — and the cheapest test is to pass the value the environment reports and see whether the same call succeeds. A default that cannot be seen at the call site is worth stating explicitly even where it is believed correct.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
