<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-12
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1110 renamed a data file and wrote its own acceptance test as a grep for the slash-form path. Three live call sites spelled the same path as separate segments -- join(REPO, "src", "workflow.json") -- so the acceptance grep returned clean while the runtime would have failed to find the file. The sweep only caught them because a wider search on the bare filename was run beside the prescribed one.

## The learning

A rename acceptance written as a grep for one spelling of a path tests that spelling, not the rename. A path has as many spellings as the languages that build it -- a slash literal, an array of segments, a variable holding the directory, a glob -- and the acceptance grep can only see the one it was written for. So the sweep is run on the least specific token the rename touches, usually the bare filename, and the acceptance grep is what is quoted afterwards rather than what is searched with. The failure mode is quiet in exactly the way that matters: the check passes, the reviewer reads a clean grep, and the break appears at the first run.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
