<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-20
repo: Kogaki
grain: lesson

## Trigger — what happened

A change made a linting tool a real dependency of the repository and added the install command to the CI workflow. The implementer's own test run passed 39 of 39 checks, because the tool was already installed in the directory they were working in. A reviewer ran the same checks in a freshly created copy of the repository and two of them failed immediately, on the tool being absent rather than on anything in the change.

## The learning

When you add a dependency, there are usually two places that run your tests: the automated service, and whatever command a person runs locally. Putting the install step in only the automated one leaves the other unable to satisfy its own precondition, and the gap is invisible to whoever made the change, because their working directory already has the thing installed. A passing local run is then a claim about their machine rather than about the change. Give both paths the same setup step. Keep the check that fails loudly when the dependency is missing, and make the install report what it did rather than guarantee success, so an offline machine still reaches the honest failure instead of a silent one.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
