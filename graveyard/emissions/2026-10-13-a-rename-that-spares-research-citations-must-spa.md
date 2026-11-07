<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-13
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1369 renamed the Analysis component to the Extraction with a per-line script that skipped any line naming a research term such as 'question-under-discussion analysis'. The citation's next line, 'Minto's ... Answer is the same analysis as professional practice', carried no such term, so it was rewritten to 'the same extraction' and the sentence became false. The suite stayed green; review round 1 on PR #1373 caught it.

## The learning

When a rename has to keep the ordinary or academic sense of a word, the unit that decides which sense is meant is the sentence, and a wrapped sentence spans lines. A per-line exclusion protects the line that names the research and rewrites the line that finishes the thought. List every surviving occurrence of the new word inside a protected paragraph and read it before committing, because no check reads prose for meaning.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
