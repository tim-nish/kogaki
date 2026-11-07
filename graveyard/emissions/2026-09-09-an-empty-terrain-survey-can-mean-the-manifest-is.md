<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

A /terrain run composed a survey with 0 candidates and reported that the seam served nothing at all. The corpus was not empty: lessons_index served 558 lines at the same pin. element_survey returned the miss shape with no filters and with kind=lesson.

## The learning

Terrain's material comes from one call, element_survey, and that call reads the element manifest — a different served surface from the lessons index. When the manifest is undeclared at the served pin, element_survey misses, the survey composes zero candidates, and the run stops at the tag gate with an empty tag table. The runtime's own line already says this is a statement about the call and not about the corpus; the way to tell them apart is to ask a second surface at the same pin. If lessons_index answers while element_survey misses, the fault is the manifest, not the material, and no amount of re-running terrain will change it. Rendering the tag gate in that state asks the owner to name a tag from an empty list, which is the thing the pre-selection listing exists to prevent, so the run should be reported rather than advanced.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
