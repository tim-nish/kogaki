<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

One filename suffix was written in two places: the code that creates the file spelled it out, and the code that later looks for that file read it from a shared settings record. Nothing was broken, because the two spellings matched. The fix deleted the spelled-out copy so only the shared record names it. The obvious check that the fix worked is to search the codebase for the old spelling and find it gone, and that search did come back clean. A second check was run instead: change the value in the shared record and see what happens. Both the creating side and the looking side moved to the new value together, and two test fixtures failed loudly because their own filenames on disk still used the old one.

## The learning

Searching for the removed copy tells you a string is absent. It does not tell you the remaining code actually reads the shared source, and those are different claims - a second copy can hide as a default, a fallback, or a value captured once at startup, all of which survive the search. Changing the value and watching who follows tests the property you actually want, because only something genuinely reading the source can move with it. Two further things fall out of doing it that way and out of no other check. Anything that does NOT move is revealed at the same moment, which is how the fixtures named their own dependence on the value - they were relying on it silently and no one had written that down. And the failure the fix exists to prevent becomes observable: before, a change to the value would have left the creating side on the old one and the looking side quietly finding nothing, reporting that absence as success; after, the same change is loud. Prefer this wherever removing a duplicate is the point, and treat a clean search as the weaker evidence it is.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
