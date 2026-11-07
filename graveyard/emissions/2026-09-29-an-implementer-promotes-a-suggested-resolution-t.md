<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-29
repo: Kogaki
grain: lesson

## Trigger — what happened

Shipping kogaki#1219, the implement worker wrote into specs/SPEC.md that the new exclusion arm was an 'owner ruling on the filed record', while the Issue labelled its resolution 'model-derived, not decided'.

## The learning

When an Issue offers a suggested resolution and the owner only clicked to file it, the click approves the text being filed, not the resolution inside it. A worker writing the spec sentence tends to cite the strongest-sounding authority it can find, so check the provenance words in any spec text an implementer writes before the review round, because a correction after the round leaves the PR unmergeable.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
