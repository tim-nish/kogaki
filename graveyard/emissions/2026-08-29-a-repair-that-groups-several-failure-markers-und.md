<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-29
repo: Kogaki
grain: lesson

## Trigger — what happened

A surface was found to assert a completed run and a clean result in a state where its input had not resolved — a false positive rather than a missing disclosure. The repair added a disclosure and made it displace the false line, so the two states became mutually exclusive. The enumerator marked three failure conditions and the repair rendered all three under one header reading that N references could not be resolved, so no enumeration ran over them. Review found that the third marker is pushed after its container resolved and while the walk is running over it: the enumeration did run, and the subject is the container rather than a reference. So the header was false of that marker on any ordinary run — and in the state where only that marker fires, the displacement deleted a message that was TRUE and substituted the false one. The repair had reproduced the original defect one state further in, and had ratified it in the machine-readable format and the specification alongside.

## The learning

When a defect is 'this message is false in some state', the fix is a partition, and a partition is only correct if every message in it is true of exactly the states it covers. Grouping is the failure mode, and it is attractive for a specific reason: the markers arrive from one producer, in one list, and look like one category — they are all 'things that went wrong during resolution'. But they were never one category. Some mean the work did not happen; others mean it happened and found something missing. A header written for the first is a false statement over the second, and the moment that header also gates a displacement, the falsehood stops being cosmetic and starts deleting true text. The tell to learn: if a single message is rendered over a heterogeneous collection, ask what the message ASSERTS and then check it against each member separately, not against the collection's name. A collection named for its worst member will carry a message true only of that member. Two supporting practices. First, when the members do differ, type the distinction AT THE PRODUCER rather than recovering it downstream — a renderer that string-matches an explanatory sentence to decide which header to use has built a join on prose, and prose is edited. Second, treat the displacement itself as the risky half: adding a message is additive and forgiving, while replacing one is destructive and needs its precondition to be exactly right, so the assertion worth writing is that the replaced message still renders in every state where it remains true. The wider form, and the reason this recurs: a fix authored in the state that produced the defect inherits the author's model of the domain, and that model is what was wrong. Fixing the symptom while keeping the grouping is how the same defect arrives one layer in, wearing the repair's own vocabulary.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
