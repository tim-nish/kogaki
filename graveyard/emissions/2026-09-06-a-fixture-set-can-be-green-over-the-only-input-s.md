<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#934: a tripwire refusing spec-internal vocabulary collapsed the whole owner gate on any Brief whose figure-carrying Step had a snake_case id. The check exercising that gate had four figure fixtures and all four used s1/f1-style ids — the one id shape the tripwire's snake_case pattern cannot match. Every assertion passed, and none of them could ever have failed.

## The learning

When a guard matches a PATTERN over text, its fixtures need at least one input drawn from the pattern's own space, or the coverage is structurally incapable of firing. The trap is that the fixtures look thorough by every ordinary measure — here there were four of them, they varied the count, they exercised the soft warning in both directions, and they asserted the rendered surface rather than only the composer. What they shared was an incidental naming convention, and that convention was exactly the guard's blind spot. Nobody chose it: short ids are what a fixture author reaches for. So the property to look for is not 'are there enough cases' but 'does any case live inside the set the guard is scanning for' — and when a new rendering path first carries author-authored text into a guarded surface, that is the moment the two spaces meet and the existing fixtures are all on the safe side of the line.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
