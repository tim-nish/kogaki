<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-12
repo: Kogaki
grain: lesson

## Trigger — what happened

One clause in a spec was rewritten three times across three review rounds and was wrong each time — first too wide, then falsified by prose the fix itself created, then misattributing quotations inside the paragraphs it exempted. Every version was correct about the case that prompted it and wrong about a case it had not seen. Meanwhile the document's own per-paragraph labels were correct throughout.

## The learning

A rule that keeps needing a narrower exception is usually the wrong instrument rather than a badly worded one, and the tell is that each version is right about its prompting case — that is what makes narrowing feel like progress instead of like a loop. Count the attempts: three narrowings of one rule is stronger evidence about the rule's shape than any single failure is about its wording. Check whether something local already carries the property correctly; if per-item labels are right and the global rule is what keeps breaking, the rule is summarising something that does not need summarising, and deleting it removes the whole class.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
