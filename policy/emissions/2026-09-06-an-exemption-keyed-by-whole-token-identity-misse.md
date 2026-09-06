<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

Reviewing a fix that let a guard admit tokens a mandated caller had rendered. The guard scans text with a regex; the fix passed it a set of the SOURCE VALUES the caller rendered and skipped a match whose text equalled one of them.

## The learning

The scanner and the exemption were speaking different units. The scanner reports the SUBSTRING its pattern matched; the exemption held the WHOLE VALUE the producer rendered. Where the pattern matches the whole value the two coincide and every test passes; where the value carries a character the pattern stops at — a hyphen, a dot, a space — the reported substring is not the value, is not in the set, and the original failure returns intact and just as total. Nothing in the tests catches this, because a fixture naturally uses a value the pattern matches whole. The rule: when you exempt something a scanner found, key the exemption on what the SCANNER reports, not on what the producer supplied — derive the exempt set by running the same pattern over the producer's values.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
