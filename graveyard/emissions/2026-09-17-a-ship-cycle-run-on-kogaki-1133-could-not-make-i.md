<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-17
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run on kogaki#1133 could not make its branch green: the branch touched a file under a mapped consultation boundary, every framing of the fork missed at the served pin, and the two receipt checks then refused each other's only remaining option.

## The learning

Two checks that each validate one half of an obligation can be jointly unsatisfiable, and neither one can see it. One check said a touched boundary owes a receipt. The other said a receipt reporting that nothing was found needs at least two attempts recorded in it -- but the tool that writes receipts merges several attempts by keeping only the file-and-line citations they returned, and an attempt that found nothing returns a word rather than a citation, so merging several empty-handed attempts produced a receipt with nothing in it, which the same check then rejected as malformed. The result is that a branch which asked and honestly found nothing had no way to record that it asked. The lesson is about where to look: each check was correct on its own terms and each was tested on its own terms, so no test failed until a real branch met both at once. When one obligation is split across two validators, the case worth writing is the one where the honest answer to the underlying question is negative -- that is the path where the halves are most likely to have been designed against different assumptions, because the party who wrote the demand was thinking about the case where something is found.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
