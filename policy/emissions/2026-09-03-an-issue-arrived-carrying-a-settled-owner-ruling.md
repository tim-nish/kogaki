<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

An issue arrived carrying a settled owner ruling and a five-item build list. Nothing about it looked like a problem: the ruling was made, no decisions remained open, and every item was real work the ruling required. The structural read caught that one of the five items was a design-record amendment and the other four were implementation against separate files, so a spec that would keep moving shared a carrier with licences that could each close.

## The learning

A well-formed issue with a settled decision is exactly where a welded carrier hides, because the usual tell — an unresolved argument — is absent. The thing to read is not whether the issue is clear but whether its deliverables have DIFFERENT CLOSING CONDITIONS: a design record closes when the design stops moving, an implementation licence closes when its code merges, and an issue holding both can never close on either. The test is answerable from the issue text alone with no code: for each deliverable, would this still be worth landing if the others were dropped? More than one yes is more than one carrier. Filing it as one issue is not a style preference that review can fix later — review arrives after the plan, and by then the weld is what everyone is working inside.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
