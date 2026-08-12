<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-11
repo: Kogaki
grain: lesson

## Trigger — what happened

Triage of kogaki#306 needed its issue read whole — the consultation map's own prescription says so, and cites a lesson about partial views satisfying total-read rules. I ran 'gh issue view 306 --comments | sed -n 1,40p' on a 94-line comment, then wrote 'carrier read whole with its comments' into the commit message, the PR body and the issue record. Three of the four prescriptions that comment carried were dropped from the resulting spec clause; a reviewer found two of them and I found the third only on re-reading.

## The learning

A rule that says read the whole thing is defeated by the paging you reach for out of habit — head, tail, a line range, the first screen — because those feel like reading rather than like sampling, and nothing in the output says how much was left. The damage is not the truncation, which is recoverable; it is writing down that the total read happened. A false compliance claim is worse than a silent omission, because an omission leaves the next reader unsure while a claim tells them the check was already made, and they stop looking. When a rule prescribes a complete read, fetch the artifact whole to a file and confirm its size before you claim anything about having read it — and if you paged, say you paged.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
