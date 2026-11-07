<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-28
repo: Kogaki
grain: lesson

## Trigger — what happened

A review process is capped at two rounds per change, and the cap is computed by scanning the change's discussion for prior review records and counting the distinct revisions they name. The scan takes the discussion as a list of text bodies. The caller fetched them with a query returning structured comment OBJECTS instead, and the scanner skips any element that is not text — so it found zero prior records and reported the next round as the first, every time. The defect surfaced only because the operator asked for round two by name and the tool refused, saying it wanted round one; had the request simply been for the next round, a third, fourth and fifth would each have run as round one with nothing objecting. It had already been latent through a completed round, where zero prior records was the correct answer and the wrong shape produced it. Corrected by changing the query to project the body text, after which the same scan returned the right position immediately.

## The learning

A bound whose input is supplied by its caller has a shape contract, and where the reader skips what it cannot parse rather than refusing it, a wrong shape degrades to an EMPTY input rather than to an error. Empty is not a neutral answer for a counter: it is the specific value that means nothing has been spent, so the bound fails permissively — it allows everything — and permissive failures produce no complaint from anyone. Two properties make this worse than an ordinary type mismatch. The first is that the wrong shape is CORRECT at the beginning: before anything has been counted, zero is the true answer, so the first use passes and validates nothing. The bug is dormant exactly through the period when someone might notice it, and activates only once a real count exists. The second is that the enforcement point is the thing that stayed quiet — a limit that is not enforced generates no event, so there is no failure to observe, no log line, and no downstream artifact that looks different. What surfaced it here was an accident of interface: the operator named the round rather than asking for the next one, which turned a silent miscount into a visible mismatch between two numbers. That is worth generalizing on its own: an interface where the caller states its expectation, rather than only receiving the callee's, converts a class of silent divergence into an immediate refusal. The operative correction: a counter that can only fail permissively owes a check on its INPUT rather than only on its output. Refuse an element you cannot interpret instead of skipping it; or, where skipping is deliberate, report the count of skipped elements beside the total, so a scan that understood none of its input is distinguishable from a scan that found nothing. Distinguishing those two is the same discipline as rendering an empty class rather than omitting it, applied to a reader instead of a renderer. And the durable form of the specific lesson: never take a permissive bound's silence as evidence that it is holding. Once, deliberately, exceed it and check that it complains.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
