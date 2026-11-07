<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-24
repo: Kogaki
grain: lesson

## Trigger — what happened

On kogaki PR #1563 (2026-10-24), the new rule refusing method verbs such as explain, ground and support anywhere in a Leg Waypoint point was reviewed, and the reviewer showed that 'ground' and 'support' also match as nouns: a point reading 'the two cases share no common ground' would be refused, though it names no method. The Extractor's half of the same rule checks only the clause's first word, where the word is almost always a verb.

## The learning

A list of verbs checked against every word of a sentence refuses the words' noun senses too, so the rule's real reach is wider than its list suggests. Checking only a position where the word must be a verb, such as the opening word of a clause, keeps the rule to what it names; checking every word needs either verbs that have no common noun sense or a way to tell the verb position.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
