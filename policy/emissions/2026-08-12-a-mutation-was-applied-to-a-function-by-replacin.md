<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-12
repo: Kogaki
grain: lesson

## Trigger — what happened

A mutation was applied to a function by replacing a line of its source text. The same guard idiom appeared earlier in the file, in a different function, so the replacement landed there instead and the target was never touched. The check then passed — which is exactly what a mutation the tests fail to catch looks like — and would have been written into the record as an uncovered case. It was caught only because the pattern was grepped for afterwards and turned out to occur twice.

## The learning

A mutation that appears to survive is a claim about your harness before it is a claim about your coverage, and the two are indistinguishable from the outcome alone: in both cases the tool runs and reports success. The asymmetry is what makes this dangerous rather than merely annoying — a mutation that is killed proves it was applied, because a passing check cannot fail for a change that was never made, while a mutation that survives proves nothing at all. So every surviving mutation owes a second question before it is recorded: did the edit land where I meant it to? Confirm the target changed rather than the file, by anchoring on the line and asserting what is being replaced, and be especially careful in files that repeat a guard idiom, where the same three tokens may appear in five functions. The record cost of getting this wrong is worse than the missed coverage: an uncovered case written into a mutation table is a documented false negative that later readers will trust and not re-run.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
