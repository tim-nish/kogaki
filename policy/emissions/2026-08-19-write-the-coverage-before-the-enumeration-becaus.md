<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-19
repo: Kogaki
grain: lesson

## Trigger — what happened

A guard was narrowed so it would stop inspecting text its authors never wrote. The narrowing worked by splitting the document's lines into two sets - guarded and exempt - and the exempt set had six members. A test was written asserting the exemption held. It asserted one of the six. Moving any of the other five back under the guard left the whole suite passing, and this was found by a reviewer, after the same author had already found and fixed two other assertions in the same sitting that proved nothing.

## The learning

Whenever a fix works by dividing things into two groups, the group you exempted is a list, and a test that exercises one member of a list says nothing about the rest. This is easy to miss because the test genuinely fails if you break the mechanism in the one place you tested, so it feels like a real test - and it is, for one sixth of the change. The habit that catches it is to write down every member of the list first, then write which specific check covers each one, and treat any member with no named check as untested no matter how green the run looks. Do it in that order: enumerate, then cover. Written the other way round you cover what you happened to think of and the enumeration becomes a description of your test rather than of the thing. The same trap has a second form worth watching for in the same breath: a test that inspects the helper a mechanism uses instead of running the mechanism. Deleting the mechanism then changes nothing, and the suite stays green. Run the real path, break it deliberately once per path, and keep the record of which break proved which path.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
