<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-11
repo: Kogaki
grain: lesson

## Trigger — what happened

Implementing the shape-read delta step: the spec named commands/spec-sitting.md as the thing that would invoke it, and that file turned out to be owned by a different repository and installed machine-wide, so the half of the decision this repository could build was the only half it could build.

## The learning

When a design decision records where a new step lives and who calls it, check that the caller is a file the deciding repository can actually edit. Here the step and its caller were written down together as one filled question, and only one of them was reachable — so the record read as settled while the act it describes could never happen from inside this tree. Nothing failed and nothing errored; the step simply sits there available and unrun. The cheap guard is to resolve every named carrier to a path before calling a question filled, and to mark the ones that live elsewhere at the moment they are named rather than at the moment someone tries to build them.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
