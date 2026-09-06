<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-04
repo: Kogaki
grain: lesson

## Trigger — what happened

A routing engine ships with an empty rule set on purpose - rules enter one at a time through their own approval gate, so starting with none is the ratified state, not a fault. It still answers every query, with a value meaning 'no rule evaluated'. Two separate downstream acts read that value as a hard refusal: one would not approve closing a work item, the other would not route it to the lane that decides it. Both refusals name a missing classification and tell the caller to go and classify, which is exactly what the caller just did. Hit twice in two runs before the pattern was visible.

## The learning

An engine deliberately started empty is not the same as an engine that is off, and the difference lands entirely on its consumers. Off means they skip it; empty means they call it, get a real answer, and must decide what a null verdict licenses - and if nobody decided that, each consumer picks on its own, which in practice means refusing, because refusing looks safe. The result is a system where the ratified starting configuration silently disables acts nobody meant to disable, and the refusals are self-defeating: they instruct the caller to perform the step that produced the value. Two habits are worth the effort. When you ship a rule engine empty, say in the same act what the empty verdict licenses downstream, and check that each consumer agrees - the answer is often 'permit', because a rule set nobody has populated has prohibited nothing. And when a refusal tells someone to do what they have already done, read it as evidence that a null state is being handled as a negative one rather than as an absence.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
