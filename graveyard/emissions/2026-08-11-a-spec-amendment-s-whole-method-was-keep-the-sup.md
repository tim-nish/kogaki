<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-11
repo: Kogaki
grain: lesson

## Trigger — what happened

A spec amendment's whole method was: keep the superseded text verbatim under a marker, state the correction separately beside it. In one paragraph the author instead wrote 'the old version's own statement follows', deleted a parenthetical from it, and spliced the correction inside the sentence. A reviewer caught it by diffing the quoted text against the base.

## The learning

The place you are most likely to misquote a record is inside the document that exists to handle records carefully, because there the quoting feels like the safe part and the argument feels like the risky part. Attention goes to the reasoning; the quotation is copied, trimmed to fit, and gently improved. And the label is what does the damage — 'X's own statement follows' tells the reader not to check, so an edit hides behind it better than it would in unattributed prose. When you introduce quoted text with a claim about whose it is, paste it from the source in the same action, and put every word of your own outside the quotation marks.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
