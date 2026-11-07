<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-27
repo: Kogaki
grain: lesson

## Trigger — what happened

/brief on G2-1 (2026-09-27): all three reader-path candidates were refused at compose_path by readerStateShapeRefusal in src/compose.mjs. The candidates wrote reader-state fields as one 'dimension: value' per line; the check splits on '; ', and ordinary sentences inside a value contain '; ', so a value was cut mid-sentence and its second half read as a line with no dimension.

## The learning

When a field's segments are separated by a character sequence that ordinary sentences also use, any value written in real sentences gets cut in the middle, and the check refuses good input that looks fine to anyone reading it. The error message even says 'lines' while the code splits on semicolons, so the writer follows the message and still fails. Separate on something prose never produces at that position — a newline, or a separator only when followed by a known field name — and test the check with a value that contains the separator inside a sentence.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
