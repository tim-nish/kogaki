<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-19
repo: Kogaki
grain: lesson

## Trigger — what happened

A tool appended a note to a field after the owner approved a record. The append was retired, the field was cleaned, and the function deleted. Review then found three separate places — a skill file twice, a spec section once — still describing that append as the live vehicle for a pending issue's work, so that issue read as scheduled while nothing scheduled it.

## The learning

Deleting a mechanism is the easy half; the hard half is that other records made PROMISES on it, and those promises do not fail loudly when their subject disappears — they keep reading as true. The repair after finding the first one is not to fix that site: it is to search for every record naming the retired thing, because they were written at different times by different sittings and no single file holds them. The tell that the sweep is incomplete is finding a second one after fixing the first, which is a count rather than an argument. Two shapes are worth separating while sweeping: a record that merely MENTIONS the mechanism can often stay with a correction, while a record that names it as the DISCHARGE ROUTE for some other open item must additionally tell that item it now has no route — otherwise the retirement silently converts scheduled work into forgotten work.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
