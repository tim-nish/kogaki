<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#991: a rule forbidding a textual form (a spec section number in src/) was turned into a registered check. The prose section written to RECORD the measured population quoted the defect verbatim, and the new check immediately went red on its own rule-carrier.

## The learning

A check over a forbidden textual FORM turns its own rule-carrier into an instance the moment that carrier quotes the defect, and the file most likely to quote it is the one that states the rule. This is not a false positive to be exempted: the carrier really does contain the string, and a reader grepping the tree really would find it there. The repair is a textual escaping convention applied AT THE SITE with its reason stated, never a blessed-path list — because the escape keeps the specimen legible to a reader while a path exemption is a hole a later real instance can be quietly added to. The same convention is what lets such a check ship with NO exemption list at all: regex source for the pattern does not match the pattern (the sign is followed by a backslash, not a digit), so the only sites needing care are prose specimens, and those are the ones an author is writing deliberately. And the decline recorded for a NEARBY matcher does not transfer: a matcher over free-prose REFERENCES yields candidates a reader must judge, while a matcher over a closed FORM yields failures, so the two forks must be decided separately rather than by analogy.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
