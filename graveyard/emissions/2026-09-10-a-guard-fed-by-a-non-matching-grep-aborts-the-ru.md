<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-10
repo: Kogaki
grain: lesson

## Trigger — what happened

PR #1083 added a guard to an install test — DRIFT=$(... | grep -o ... | sort -u); [ -n "$DRIFT" ] || fail "..." — under set -euo pipefail. Mutating the subject so the grep matched nothing did not produce the guard's message: pipefail carried grep's exit 1 out of the command substitution and set -e killed the script silently, at a line that had already printed nothing. The mutation run read as 'the test passed' until the tail of the output was compared against a healthy run and the ALL PASS line was found missing.

## The learning

A guard's failure message only reaches a reader if the guard is reached. Under set -euo pipefail a search that finds nothing is an error, so any guard whose input is captured from a pipeline ending in grep, and whose whole purpose is to fire when that search comes back empty, is unreachable in exactly the state it exists for: the shell kills the run one line earlier and prints nothing. The two failures are indistinguishable at a glance — an aborted run and a passing run both end without a complaint — so the tell is the absence of the run's own success line rather than the presence of an error. The repair is to make the capture tolerant of the empty case (|| true) so the guard, not the shell, decides what to say. The general form: when a guard's trigger condition is also an error condition for the machinery that feeds it, the machinery wins, and the guard is decoration.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
