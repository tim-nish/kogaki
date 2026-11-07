<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-16
repo: Kogaki
grain: lesson

## Trigger — what happened

A document said a screen must carry no verdict column. A run shipped one anyway. The rule had been correct and present by name for weeks; what it bound was the person writing the renderer, and nothing bound the renderer's output. The test written for the repaired rule then asserted that no verdict column appears.

## The learning

A rule stated as a prohibition binds whoever writes the code; a rule stated as a construction constraint binds the output. Where the output can be assembled mechanically, prefer making the bad shape unwritable over declaring it forbidden — a prohibition needs someone to remember it at exactly the moment they are not thinking about it. And note what this does to the test: an assertion that the bad shape is ABSENT passes identically against code that cannot produce it and code that merely did not, so its only demonstrated failure mode is the feature being missing entirely. Construct an input that would produce the bad shape and require a refusal.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
