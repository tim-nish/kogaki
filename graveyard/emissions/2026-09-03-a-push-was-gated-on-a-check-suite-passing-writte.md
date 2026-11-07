<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

A push was gated on a check suite passing, written as: out=$(run-suite); echo "$out" | grep -E '^ok: 18 registered|^FAIL' && git push. The grep was there to SHOW the verdict, and it was also the AND-gate's condition. It matches the failure line as readily as the success line, so it exited 0 on a red suite and the push ran. A commit that failed a registered check landed on master, and the failure text was printed on screen immediately above the successful push.

## The learning

A pattern written to DISPLAY a verdict and a predicate written to DECIDE on it are different things, and using one expression for both silently inverts the gate whenever the pattern is an alternation covering both outcomes. The tell is an alternation, or any wildcard, inside the condition of a conditional: grep -E 'PASS|FAIL' succeeds on failure. It is not caught by reading the output, because the failure IS displayed -- correctly, prominently, and directly above the action it should have prevented, which makes the transcript look like evidence the gate worked. So gate on the producer's own exit status rather than on text about it; where only text exists, make the predicate match ONLY the success case and let the display be a separate statement. The general form: never let one expression serve as both the report and the condition, because the report wants to match everything worth seeing and the condition wants to match one thing.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
