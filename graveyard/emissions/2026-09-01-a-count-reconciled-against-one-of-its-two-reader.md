<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-01
repo: Kogaki
grain: lesson

## Trigger — what happened

A spec section declared a display's layout in one paragraph and the closed list of line classes that may render it four paragraphs later. Review round 1 found the list saying 'exactly the three classes above' while the implementing issue planned four, and the fix set it to four — reconciling the count against the implementing issue's plan. Nobody re-read it against the layout in the same section, which needed six: a header line naming the columns, and a continuation line for a wrapped name. Because the list's non-member fallback refuses, the contract now forbade its own ruled output, and the defect surfaced only when someone tried to implement it.

## The learning

A declared count usually has more than one reader, and a repair is naturally aimed at whichever reader raised the complaint. That aim is the defect: the count now agrees with its complainant and is still wrong against every other reader, and it reads as freshly verified precisely because it was just changed. So a repair to a number states the SET it is a count of and re-checks it against every reader of that set, not against the report that prompted it. The sharpest tell is a repair whose own subject is counting — here the corrected paragraph argued that a count is only checkable beside the set it counts, while itself being checked beside the wrong set. A second, milder form travels with it: a disambiguating rule that ENUMERATES the values it disambiguates leaves every other value in the ambiguity it was written to end, and reads as complete because the values it does name are now right.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
