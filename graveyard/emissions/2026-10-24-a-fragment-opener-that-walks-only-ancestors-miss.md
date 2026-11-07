<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-24
repo: Kogaki
grain: lesson

## Trigger — what happened

On kogaki PR #1565 the page script that opens a folded block when a link lands inside it only walked the link target's enclosing folds. Links to a whole card land on the card's heading section, and the fold sits below it, so those links scrolled to a card that stayed shut while the check only asserted the script was on the page.

## The learning

When a link is meant to open a folded block, write down for each kind of link target where the fold sits relative to it: a target inside the fold needs its enclosing folds opened, and a target above the fold needs the fold beneath it opened too. Then make the test assert the behaviour for each kind of target, not that the script exists.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
