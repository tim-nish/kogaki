<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-08
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1259's body said its pull request would also close #1302; at PR creation the close-keyword hook refused 'Closes #1302' because the branch was keyed on #1259, so #1302 stayed open and the review recorded the item as unbuilt.

## The learning

An Issue that promises its pull request will close a second Issue cannot keep that promise: a branch may close only the Issue it is keyed on. When a body folds another Issue's work in, it should name how that other Issue closes — a discharge or its own close route — rather than 'this pull request closes it too'.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
