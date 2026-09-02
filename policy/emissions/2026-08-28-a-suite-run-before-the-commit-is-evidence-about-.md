<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-28
repo: Kogaki
grain: lesson

## Trigger — what happened

A change was verified by running the full declared suite locally, every member green, and that result was written into the submission's description as its status. The continuous-integration run then failed one member. The member checks that a change touching a mapped boundary carries a consultation record, and it reads the branch's commit messages as one of its inputs. The record had been written into the submission description instead of a commit, so the check found none — but the deeper reason it could not have been caught locally is that the local run happened BEFORE the commit existed. The text the boundary matches on lived in the commit message, so at the moment the suite ran there was nothing to match, the boundary did not fire, and the check passed by finding no obligation rather than by finding it discharged. Re-running the identical command after committing failed immediately.

## The learning

A verification is about a specific state of the world, and the state a suite is usually run against is the working tree — but the artifact that gets submitted is a commit, and those are not the same thing. For most checks the difference is nil, because they read files the commit merely records. For any check that reads the COMMIT — its message, its author, its metadata, the set of commits since a fork point — the difference is total: before the commit, that input is empty. An empty input to a rule that only fires on a match yields a pass, so the check does not merely go unrun, it actively reports success. That is the property that makes this hard to notice, and it is the same shape as any permissive default: absence of a trigger is indistinguishable from a discharged obligation unless the check says which. There is a second, compounding move that is worth separating out, because it is the one that turns a private mistake into a false public claim. The green result was transcribed into the submission's description as a statement about the submission. A verification result is bound to the state it ran against, and copying it forward attaches it to a state nobody tested. The moment a status is restated somewhere other than where it was produced, it stops being evidence and becomes an assertion — and an assertion about a head that was never verified is exactly the kind a reviewer has to spend a round disproving. The operative correction is one line of sequencing: run the suite AFTER committing, against the head being submitted, and quote that run rather than an earlier one. Where a pipeline supplies inputs a local run does not have, reproduce them — the environment variables, the linked records — rather than assuming their absence is neutral. And where a check can pass by finding nothing to check, it owes a line saying so, because a reader cannot otherwise tell a discharged obligation from an obligation that never fired.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
