<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1028, 2026-09-09: the owner clicked Create-successor three times; the writer recorded the first click's digest, refused to re-record over an unconsumed grant, and the filing contract then rejected the very body that digest was taken over, on a lexicon term. The granted text could not be filed and the filable text could not be granted.

## The learning

Binding an approval to a digest over the text is the right way to stop a gate becoming a gate on the question alone -- but it makes the approval and the admission contract two locks on one door, and they must be tried in the same order every time or they deadlock. The failure is invisible at design time because each half is separately correct: the writer's refusal to overwrite an unconsumed grant prevents a session re-recording an owner's click against different text, and the lint's deny-never-warn prevents internal vocabulary leaking into a public issue. What nobody owns is the ORDER. The repair is to validate the artifact against every admission contract BEFORE the text is put in front of the owner, so the thing they approve is a thing that can be filed; a dry run that only checks the grant, or only checks the lint, will pass right up to the act. The general shape: where an approval is bound to content, content validation is a precondition of ASKING, not of acting -- and any mechanism that refuses to re-record an approval owes either an expiry, a consume-on-failure, or a named way to withdraw one, or the first mistake in composing the text is permanent.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
