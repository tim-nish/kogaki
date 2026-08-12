<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-11
repo: Kogaki
grain: lesson

## Trigger — what happened

I added a check asserting that a command refuses to write anything when its output is malformed. Three assertions: it exits non-zero, it writes no files, and its error names the contract. Locally all three passed. In CI the command needs a data source CI does not have, so it exited early with a different error — and the first two assertions were satisfied by a run that never reached the thing being tested. Only the third caught it. Then, while fixing it, my replacement copied the program into a temp directory and left out one of its dependencies, so the new 'is the resource available' probe reported the environment as missing when actually my copy was incomplete.

## The learning

Assertions of the form 'it failed' and 'it produced nothing' are satisfied by any failure, including the failure to start. They are the cheapest assertions to write and the ones most likely to be vacuous, and they are silently vacuous exactly where the environment is thinnest — which is usually the shared build machine rather than the developer's laptop. So for each such assertion, ask what else could make it true, and pair it with one positive assertion that only the intended path can satisfy: a specific message, a particular exit code, a side effect unique to the code you meant to reach. The second half is subtler and cost me the same mistake twice. Once you add a probe for 'is the environment capable', that probe becomes a new way to skip the test, and it cannot tell a genuinely absent environment from a test harness that was set up wrong. Both look like the resource is missing. So a skip should say which resource and why it was judged absent, loudly enough that someone reads it, because a skip that is really a broken fixture will otherwise sit in the log looking like prudence for as long as nobody checks.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
