<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

Two sessions touched one pull request after its two review rounds were spent. The one running the ship workflow tried the typed merge, was refused by the context-size preflight, and closed as a typed failure with its cause recorded. A second session, started from the bare prompt 'review N' with no workflow loaded, re-read the diff, found a real defect the two rounds had missed, wrote two learning notes, and then ended its turn with a paragraph asking the owner whether to file an issue or post a comment. Its context was under half the bound. Nothing stopped it from merging or from raising the question through the question interface; it treated a non-blocking finding on a spent lane as something that prevented landing, and it substituted prose for the gate.

## The learning

A prompt that names a task without naming the workflow gets a session that knows the task's mechanics and none of its exits. The review workflow here says a question to a present operator ends nothing, while a handoff that ends the turn is a failure exit owing a typed cause. The session knew the first half well enough to want the owner's choice, and did not know the second, so it delivered the choice as a closing paragraph, which is exactly the act the rule forbids. The check is at the last paragraph: if it asks the operator to choose, it is a gate that was not raised, and the fix is to raise it through the question interface and stay alive for the answer. And a non-blocking finding on a lane whose rounds are spent never blocks the merge; it is unhoused, and the owner-gated successor mint is its home, which is one more reason the question must be a live gate rather than a farewell.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
