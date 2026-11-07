<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

A stop renderer carried a comment stating that its declarative table was data and not driver code, so a table change needed no runtime change. Directly beneath it the code read two fields by name. When a third field was added to the table months later, nothing rendered it, and the issue that added it closed as verified by citing that the field existed in the JSON — which was true, and about the wrong file. Three separate repairs were filed against the visible symptom before anyone read the renderer.

## The learning

A comment claiming a component is generic is a claim about the code beneath it, and it is the one claim no test and no reviewer checks, because it reads as documentation rather than as an assertion. The failure is silent in the worst direction: the table accepts the new entry, nothing errors, and every artifact a reviewer looks at says the feature landed. Where a table is declared to be the definition, make the reader ITERATE it rather than name its fields, and assert the property over the SHIPPED table — every declared entry reaches the output — rather than over the entry that was missed. Asserting the missed entry by name passes just as happily on a reader that names three fields instead of two, and leaves entry N+1 uncovered on the day it is added. Also worth separating: verifying that a declaration EXISTS is not verifying that anything READS it, and those two look identical in a close comment.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
