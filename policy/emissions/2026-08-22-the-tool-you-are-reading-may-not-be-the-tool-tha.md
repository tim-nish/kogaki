<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-22
repo: Kogaki
grain: lesson

## Trigger — what happened

A run hit a tool misbehaving, filed a defect report describing the cause, and later read the tool's own source: the cause it named could not happen there, because the exact fix had landed upstream between the two attempts that produced the evidence. The first attempt's error message used wording the current source no longer contains.

## The learning

A tool can change under you between two runs in the same sitting, so a symptom you saw and the code you later read may not be the same program. Before filing a defect that names a cause, check the tool's current text against the symptom — if the wording of the error you got is not in the source, you are looking at a different version, and the report will be filed against code that already fixed it. Keep the observation and re-aim the diagnosis rather than dropping either: what you saw was real, the explanation was not.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
