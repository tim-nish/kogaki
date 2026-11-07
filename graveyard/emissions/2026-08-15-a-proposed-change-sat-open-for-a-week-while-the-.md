<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-15
repo: Kogaki
grain: lesson

## Trigger — what happened

A proposed change sat open for a week while the thing it proposed was quietly finished by a different change, and nothing noticed because both were authorised by the same work item.

## The learning

A proposal can stop being needed without anyone withdrawing it. If the same work item authorises more than one attempt, a later attempt can deliver the goal and close the item while the earlier attempt stays open, apparently still pending. It then blocks anything that waits for outstanding proposals to clear, and its own review machinery keeps processing it correctly, which is what makes it invisible: nothing is malfunctioning. The cheap test is to compare the version of the target the proposal is written against with the version the target is at now. A large gap is the tell, and the check is quicker than reading the proposal. Two follow-ons. When the goal is already met, the usual obligation to carry the work forward into a replacement does not apply — that obligation assumes something still needs carrying, and re-doing finished work is worse than closing. And expect a rule that requires an open authorising item to make the replacement route impossible anyway, since the item closed when the work actually landed. Name the change that did deliver it, and close.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
