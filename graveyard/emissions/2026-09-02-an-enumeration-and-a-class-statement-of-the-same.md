<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-02
repo: Kogaki
grain: lesson

## Trigger — what happened

An approved change request stated one of its requirements twice in one document: as a rule naming a class of file that must leave a directory, and as a list of the three files to move. Under the rule the runtime actually loaded five. The list and the criterion were written in the same act by the same author, and both were correct-looking; nothing in the document indicated they described different sets. An implementation following the list exactly would have satisfied the enumeration, failed the stated criterion, and passed every check, because the checks verify what the code does and not what the requirement claimed. The gap surfaced only because someone ran the query the criterion literally describes.

## The learning

A requirement written twice in one document, once as a class and once as a list, is two requirements that will be read as one. The list is what gets implemented, because it is actionable and the class is not, and the list is the half that goes stale — a class statement stays true as the system grows while an enumeration silently stops covering it. The two were equal when written, which is exactly why nobody checks them against each other later.

The asymmetry runs deeper than staleness. The enumeration bounds arity while the class statement bounds kind, and when they disagree the disagreement is invisible from either one alone: reading the list, nothing says it is incomplete; reading the criterion, nothing says which files it reaches. Only executing the criterion as a query over the system distinguishes them, and that query is rarely run at authoring time because at authoring time the author believes they just wrote it down.

What makes this worth naming separately from ordinary spec drift is who is positioned to catch it. Not the author, who has just satisfied themselves that the list is the class. Not the reviewer, who checks the diff against the list because the list is the checkable half. Not the tests, which assert behaviour and know nothing of the requirement's wording. It is caught by whoever mechanically evaluates the class statement against the tree, and the cheapest moment to do that is when the list is first written — one query, against the criterion the author has in front of them.

Two things follow. Where a requirement carries both a class and an enumeration, treat the enumeration as a worked example and the class as the requirement, and run the class as a query before accepting the list as complete. And when they turn out to disagree, the fork is a real decision with a real cost either way — widen the work to the class, or narrow the criterion to the list — so it belongs to whoever owns the requirement rather than to the implementer, who will otherwise resolve it silently by building the list.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
