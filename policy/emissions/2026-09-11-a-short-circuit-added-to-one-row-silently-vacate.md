<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-11
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1098 gave the already-knows comparison row a when_declared_absent arm. The correction fixture's Brief declared no introduces: on any Step, so every Step's already knows list was empty and the Harness began deciding all four rows with no model call. Two existing properties rode that row — the successor arm's only judged pair and the residue case's best-effort vehicle — and one of them started reporting green over a pass that had stopped asking.

## The learning

When you add a short-circuit arm to a shared row, the rows that stop being judged are not the only thing that changes: every existing case whose vehicle was that row can go vacuous and keep passing. A vacated case is indistinguishable from a satisfied one at the surface a suite reads, so the suite's green is no longer evidence for the property. Before landing such an arm, find every case that names the row and ask which of them still has something to observe; where a fixture's own input is what makes the arm fire, change the fixture's input so the judged path stays exercised, and say in the fixture why the input is there. The one case here that failed loudly did so only because its assertion happened to require a model-judged row; the sibling case with the same exposure stayed green and was caught by the reviewer instead.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
