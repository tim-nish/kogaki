<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-21
repo: Kogaki
grain: lesson

## Trigger — what happened

Five consecutive gate attempts were denied by the gate-declaration hook even though the declaration text was emitted before each call, in the same message

## The learning

A hook that reads the conversation transcript at tool time can be one message behind the conversation itself: the harness writes a message's plain text to the transcript only when the next message begins, so a declaration emitted in the same message as the call it licenses is invisible to the hook that checks it, every time. The failure looks like the author forgetting the declaration, and retrying harder makes it worse — each denied attempt becomes a scan boundary that also hides the earlier declarations. The repair at the point of use is to emit the declaration, make one unrelated tool call to push the text into the record, and raise the gate in the message after; the repair at the hook is to treat only an answered question as a scan boundary, never a denied attempt, and to say in the refusal that same-message text may not be visible yet.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
