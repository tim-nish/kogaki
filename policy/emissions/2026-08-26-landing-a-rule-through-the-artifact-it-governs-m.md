<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-26
repo: Kogaki
grain: lesson

## Trigger — what happened

A contract was written to eliminate line-numbered pointers. Installing it required inserting a section into the file most pointed at, which moved every pointer below it — so the change created fresh instances of the defect it retired, four times across four pull requests and nine review rounds. Each round found a real defect; each repair created the next. The chain terminated only when the section was appended at end-of-file instead, after which every existing pointer was correct untouched and the defects were not fixed but never created.

## The learning

A change that removes a defect class by editing the artifact the class lives in will manifest that class while landing, and the manifestation is not carelessness — it is the cost of the edit's position. The tell is a repair that re-owes itself: here the paragraph documenting the repoint obligation grew the file, which re-triggered the obligation mid-commit. Iterating on such a change converges only if each iteration shrinks the exposure, and reviews cannot tell a shrinking exposure from a lucky one, because both look like fewer findings. The escape is to change the edit's SHAPE so the exposure is structurally zero rather than merely smaller — append instead of insert, so no existing line moves — and the check for that is mechanical and cheap: compare every pre-existing line against its old position and require identity. Two consequences. When a change must touch the substrate its own rule governs, ask first what edit shape makes the rule vacuous for this change, and prefer it even at a cost in placement or elegance; the semantic cost is recoverable later, the correctness cost compounds per round. And when a fix chain runs three or more rounds where each blocking finding is an instance of the class being retired, stop patching and re-cut, because the sequence is measuring the edit's position rather than the author's care.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
