<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A change that stopped a declaration being rendered as an observation (kogaki#892, PR #916) applied its new provenance clause unconditionally, so the pin identity meaning 'no judge at all' now renders as 'pin DECLARED' — an absence rendered as a declaration. The review round found it as a nit; it was filed as kogaki#918 in the same sitting that merged the repair.

## The learning

When a repair splits one value into two states — here 'observed' versus 'declared' — the identity that meant NEITHER was already in the data and does not announce itself. The new clause is written for the two states the repair names, applied unconditionally, and silently swallows the third: the absence gets described in the vocabulary of the weaker of the two new states, which is the closest wrong answer and therefore the least visible one. The repair is genuinely correct about the case it was filed for, which is why review reads it as complete. The check is to ask, at the moment a state distinction is introduced, what the pre-existing values were and which of them belongs to neither new state, and to make that third case refuse or render as itself rather than fall through to a default arm. A distinction added to a rendering is a partition of the whole domain, not an annotation on the case that motivated it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
