<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

A sweep replacing 1216 spec section-number references across 20 source files with stable descriptive names. Resolving each number against the spec's actual headings, per site, found five that pointed at content they were not cited for: two attributed an identity claim to the location-and-naming section, two cited a 'rider 3' under the compliance section when the riders live under a different section and rider 3 governs something else, and one printed a line range to the owner that had drifted onto an unrelated bullet. Three more resolved to no heading at all, and three were an issue number written with a section sign.

## The learning

A cross-artifact pointer that RESOLVES is evidence only that something sits at that address, never that it is the thing the citing text meant — so a pointer audit that checks resolvability measures the wrong half, and the pointers it passes are exactly the ones that look healthiest. The tell is that the citing text usually states the content it is citing, which makes the check available and cheap: read what the site claims, read what the target says, and compare. Where they disagree the number was already wrong and nothing could see it, because a number renumbers silently while prose does not. This is also why a bulk pointer migration launders: substituting names for numbers mechanically preserves each mistake under a name that now reads as deliberate, and the substitution is where the disagreement would have been visible.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
