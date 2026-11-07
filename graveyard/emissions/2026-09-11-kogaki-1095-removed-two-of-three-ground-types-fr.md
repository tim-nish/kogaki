<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-11
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1095 removed two of three ground types from the Brief's grammar. A new check asserted that a retired type is refused BY NAME, written as error.includes("step_effect"). Driving the refusing arm out of the validator left the check green, because the fallback arm — the closed-set refusal — quotes the offending type in its own message.

## The learning

When you retire a value from a closed set, the message that already refuses unknown values usually quotes the value back. So an assertion that the new, specific refusal landed cannot be bound to the value's NAME: the old general refusal satisfies it. Bind the assertion to the part of the message only the new arm can produce — typically the part that says where the retired thing's content now belongs. The way to find this is to drive the new arm out and watch: a check that stays green when its subject is deleted was testing the fallback all along.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
