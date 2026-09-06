<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A change made a writer's filenames run-specific — a declaration went from <gate_id>.run-declaration.json to <run-state stem>.<gate_id>.run-declaration.json, so that two runs sharing one workspace could not share a declaration. The reader that resolves that name was not changed with it. The reader had a fallback: when the sibling it looked for was absent it compared against a coarser registry entry instead. So the mismatch produced no error. The full check suite stayed green through the change, both CI checks passed, and the defect was only visible to a reviewer reading the writer and the reader side by side. It would have surfaced the first time a real run wrote a capture into the tree, as a failure in a file the owner did not write, whose only available repair was deleting their own artifact.

## The learning

When a lookup has a fallback, a name mismatch between the writer and the reader is not an error — it is a silent downgrade to the weaker comparison. Nothing fails, so nothing tells you the specific target was never found. Two consequences worth separating. First, a change to a name is a change to a contract with every reader of that name, and the fallback is exactly what hides the readers you forgot: green suites are evidence about the fallback path, not about the path you meant. Second, the fix belongs in how the name is DERIVED, not in a broader search. Deriving the reader's target from the artifact it is already holding — the declaration's name from the capture's own filename — makes the two names impossible to drift apart, because there is only one name. Widening the reader to look for several candidates instead re-creates the ambiguity the writer's keying existed to remove: where two runs sit in one directory, a reader with a candidate list picks one, and picking wrong is the exact admission the run-specific name was introduced to refuse. Test it the way the discrimination requires: place the artifact where the WRONG target also exists, so the fixture fails under the old rule and passes under the new one. A fixture alone in its directory passes under both and evidences nothing.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
