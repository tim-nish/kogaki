<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-01
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1238's admission found its census of self-tests outside checks/ wrong on the second sitting: terrain.mjs is run by check-terrain-runtime.sh, and lint-ja, mine-receipt-absence and policy/kit/bin also carry self-tests

## The learning

A census that searches for one spelling of a thing misses its other spellings. The issue searched for the flag '--self-test' and so missed the subcommand 'self-test' that a check still runs, a 'runSelfTest' function in another file, and every self-test under a third directory it did not list. A census of where something lives is only as wide as the spellings and folders it searched, and should say both.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
