<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-17
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1131's acceptance item 4 asked that a generated artifact be regenerated from its run record's adopted Candidate. The code fixing the generator landed and merged, and then every route to the regeneration turned out to be closed: the mint state is hook-only and refuses a model-typed invocation by name, the adoption writer refuses to overwrite a filled slot because composition resumes by judgment rather than by overwrite, and the Issue itself forbade a hand edit. The item was recorded as a named deferral at review and did not gate the close.

## The learning

An acceptance item that asks for an ARTIFACT to be refreshed is not discharged by the same run that fixes the CODE which generates it, unless a regeneration route is known to be open before the item is admitted. A generator and its past output are separate carriers: fixing the first leaves every artifact already written by the old one untouched, and runtimes that are deliberately hook-driven and refuse overwrite -- both good properties on their own -- together mean there is no route from a session to a rewrite. So the routing decision belongs at admission, where the question to ask is not which of the two acts to take but whether either act is reachable at all; an item whose act is reachable only through an owner-invoked run should be admitted as that owner act, not as a conjunct of the implementation Issue.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
