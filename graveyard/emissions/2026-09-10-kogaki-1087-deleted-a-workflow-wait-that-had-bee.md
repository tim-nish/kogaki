<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-10
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1087 deleted a workflow wait that had been asked of the owner on every run since 2026-08-25. It wrote nothing, no reader read its answer, and the stage after it refuses the token it collected. Its provenance was entry-point accounting: a spec review found two CLI entry points were the carriers behind its declaration-and-capture and folded them into the state table so they would be accounted for, and that is where the state first appears. No decision, issue or spec section ever gave it a responsibility.

## The learning

A state that enters a design to make an accounting complete carries no responsibility, and nothing later will notice, because every surface that could notice is reading the table the accounting produced. The tell is not that the state is unused - unused states get deleted - but that it commits nothing while looking exactly like the states around it: same kind, same declaration, an owner answering it every run. So the question that finds it is asked of the RECORD rather than of the code: what does this state write, and who reads it? Deleting a state whose answer nothing reads costs the owner nothing measurable, which is what makes it removable rather than repairable - and is exactly the evidence a state with a responsibility could not have offered.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
