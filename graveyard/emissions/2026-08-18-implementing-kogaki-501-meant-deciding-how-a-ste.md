<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-18
repo: Kogaki
grain: lesson

## Trigger — what happened

Implementing kogaki#501 meant deciding how a Step says it placed a sub-part of a selected item. One option — treat placing the parent as placing everything it carries — required no grammar change and was the obvious minimal move. It would have made the requirement unfalsifiable: the omission branch could never fire, so the rule would be satisfied by construction rather than by conduct. Rather than argue that, the option was implemented as a mutation against the finished check, and it failed the case.

## The learning

When you decline a design option on the ground that it would make a rule unfalsifiable, that ground is itself testable, and testing it costs one mutation against a check you have already written. Implement the rejected option, run the suite, and record which case fails and why. This converts the strongest kind of design argument — the one about what a shape makes impossible to observe — from a claim a reviewer must evaluate on your reasoning into evidence they can re-run. It also protects you from the case where the argument is wrong: if the rejected option does NOT fail any case, you have learned either that your objection was mistaken or that your checks do not yet assert the property you claim to care about, and both are worth knowing before the design is settled rather than after.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
