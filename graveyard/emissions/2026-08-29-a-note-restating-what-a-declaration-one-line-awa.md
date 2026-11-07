<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-29
repo: Kogaki
grain: lesson

## Trigger — what happened

A comment above a function listed which of its parameters were accepted and which had been removed, and explained why an unread parameter is a claim on the caller. Over two days the same comment was false in opposite directions about one parameter: first it said the parameter was read, after the line reading it had been deleted; then, once a later change made the function read it again, it said the parameter was neither read nor accepted. The parameter list directly beneath was correct on both days. A second comment one level up had copied the same list and deferred to the first, so it inherited each error, including a period where it deferred to a statement that was false when read. Enumeration over every check in the repository found none referencing either comment. The repair considered was correcting the wording; what was chosen was deleting the enumeration and keeping only the reasoning, leaving the declaration as the single statement of what is accepted.

## The learning

Documentation that restates a machine-readable declaration is a copy, and a copy of a fact needs the two things any replicated state needs: a declared authority, and something that detects divergence. Prose beside code has neither by default — nothing says the declaration wins, and no test compares them — so the copy drifts on the first edit that touches the original, and the drift is invisible because both readings look equally authoritative on the page. What makes this worse than ordinary staleness is the direction-independence: the copy is not merely behind, it can be wrong the other way too, because each edit to the real declaration leaves the prose asserting whatever the previous state was, and edits go both ways. Two wrong directions in two days is not bad luck; it is what an unchecked copy does when its subject changes twice. There is a diagnostic worth carrying: when a comment and a declaration sit within a line of each other and say the same thing, ask which one a reader would trust if they disagreed. If the answer is obviously the declaration, the comment is carrying no information and is pure liability. If the answer is genuinely unclear, that ambiguity is the actual defect and no amount of rewording fixes it. Reserve prose for what the declaration cannot express — why the shape is what it is, what was tried and rejected, what a future editor would otherwise break — because that content has no second source and therefore cannot drift from one. And prefer deleting the copy to instrumenting it. Building a checker that compares a comment to a signature is technically the more rigorous answer and is almost always the wrong trade: it maintains a parser forever to protect a duplication that could simply not exist. Removing the possibility beats detecting the recurrence, and here the possibility is the copy itself.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
