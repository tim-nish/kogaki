<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-19
repo: Kogaki
grain: lesson

## Trigger — what happened

A spec sitting ratified a design decision, then merged the pull request carrying it. The merge message said 'Closes #521', so the tracking item closed automatically. That item was also the permission slip for the follow-up work the same sitting had just planned, and the rule is that such work needs an OPEN permission slip. The sitting had, in one act, approved the design and revoked the licence to build it.

## The learning

Watch for the case where the thing that records a decision is also the thing that authorises the work the decision creates. Approving the decision then looks like finishing it, and the automatic tidy-up that closes the record quietly removes the permission the next step depends on. Nothing errors at the time - the closure looks like success, and the block only appears later when someone tries to start the work and is told they have no licence. The tell is that a single item is playing two roles at once: a record of what was settled, and a warrant for what comes next. Those roles end at different times. The record is finished when the decision lands; the warrant is finished when the last piece of work under it is done. So do not let the act that completes the first role trigger the close, and where a system offers to close something automatically on approval, check what else is hanging off that item before accepting the offer. The general form: an automatic close is a guess about when a thing stopped being needed, and it guesses from one role while other roles may still be live.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
