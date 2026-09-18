<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

Verifying a new check case by mutation: the fix added a three-line block to a hook's Stop arm that was textually identical to one already in its PreToolUse arm. A single-replacement mutation removed the earlier one, so two pre-existing cases failed and the two new cases passed — which reads exactly like a real verification, except the sites are swapped. The vacuous case would have shipped as verified.

## The learning

Mutation testing verifies a case only if the mutation lands on the code the case is about, and nothing in a passing-then-failing run tells you which site was hit. Where the same few lines appear at two call sites — the usual shape when one mechanism gains a second trigger — a mutation matched on text alone silently selects the first occurrence, and the evidence it produces is indistinguishable from the evidence for the site you meant: some cases fail, the suite goes red, the story fits. The tell is WHICH cases failed, so the check is to name them in advance and refuse the verification when the set that actually fails is a different set, rather than reading red as confirmation. The general form: an instrument that selects its own target by a non-unique key owes an assertion that it selected the intended one, because its failure mode is a confident wrong answer rather than an error.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
