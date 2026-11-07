<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#788: a check fixture went red on a clean head roughly one run in two, because four directories minted inside one millisecond shared an mtime and the prune's name tiebreak decided the order. The obvious repair — stamp distinct mtimes so the ordering is a fact about the tree — was correct, and it silently removed the pass's only reach on the tiebreak, since no other case in the pass could produce a tie.

## The learning

When a test is flaky because two inputs are indistinguishable, the flakiness is usually the only place the tie-breaking rule gets exercised. Removing the ambiguity fixes the flake and deletes the coverage in the same edit, and nothing goes red to say so: the rule can then be inverted or deleted with the whole suite green. So a de-flaking repair owes a second act — build the ambiguous case deliberately, with the tie constructed rather than raced, and assert which way it resolves. Check the repair by mutating the rule the race used to reach: if the mutation survives, the repair paid for itself with the coverage it was meant to protect.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
