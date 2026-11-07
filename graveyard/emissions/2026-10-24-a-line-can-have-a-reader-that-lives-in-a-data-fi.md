<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-24
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1584 removed the Promise and Keeps lines from the writer's Packet. The Issue had searched the review code for anything reading them and found nothing, yet a review item declared in src/review-items.json read the Keeps line through a data-declared block, and its check failed once the line was gone.

## The learning

When you retire a rendered line or block, search for its literal label in data and configuration files as well as in code. A reader declared as data (a heading plus a label to match) never shows up in a search for function names or imports. Once the line is gone, that reader holds by absence forever and checks nothing. Retire it along with the line it read; never point it at a hand-built copy of the line.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
