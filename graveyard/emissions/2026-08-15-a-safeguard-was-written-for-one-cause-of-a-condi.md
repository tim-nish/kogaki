<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-15
repo: Kogaki
grain: lesson

## Trigger — what happened

A safeguard was written for one cause of a condition and silently missed a second cause of the very same condition, because the rule was written in terms of the thing that usually causes it rather than the condition itself.

## The learning

A rule that fires on a condition should be written in terms of that condition, not in terms of the thing that normally brings it about. Here the condition was 'no further check can happen before this lands', and the rule was written as 'the allowance of checks has run out' — which is one way to reach it. A second way existed: the landing had been set to happen automatically as soon as everything went green, so the allowance still showed room while no further check could ever occur. The rule read healthy and the safeguard never fired. Two things follow. First, when you find such a gap, extend the existing rule to cover the condition rather than adding a second, parallel rule beside it — a second rule leaves you with two places that can drift apart and no statement of how they relate. Second, the thing that already reported on this class could not see the new case at all: it only counted items with nothing written against them, and the new case had something written against it, just something that had been made impossible. A reporter filtered on the old shape will keep reporting zero while the new shape accumulates, and its silence will read as good news.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
