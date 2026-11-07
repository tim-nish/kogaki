<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-19
repo: Kogaki
grain: lesson

## Trigger — what happened

A ReviewDraft run over a five-step draft. One step's arriving-reader-state item failed in both passes: the prose legitimately built on terms the previous step had introduced, but the step's own declared arriving state was terser than the previous step's declared leaving state, so it did not list them. The correction rewrote the prose, the same item failed again, and it became residue. Nothing the correction could do would have fixed it, because the disagreement was between two declarations, not between a declaration and the prose.

## The learning

An instrument that compares a product against its specification cannot tell you which of the two is wrong. When it fires, the repair path the instrument offers — redo the product — is only one of the two available, and if the defect is in the specification the product gets rewritten until it matches something that was never right. Two consecutive specifications that must agree with each other are the place this hides: each is checked against the product and neither against the other. So give such an instrument a way to report the finding against the specification rather than the product, and where the specification is authored earlier, check the seam between consecutive entries at authoring time, when both are in front of you, rather than at inspection time when only one is.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
