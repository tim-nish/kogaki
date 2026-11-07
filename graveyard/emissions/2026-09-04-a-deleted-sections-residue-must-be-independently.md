<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-04
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#858 deleted specs/SPEC.md §2.5.3, the section defining Screen as a delivered artifact. One rule sited inside it — verdict machinery on an owner rendering is UNRENDERABLE rather than prohibited — was not part of the concept being removed, and two consuming carriers referenced it by section number.

## The learning

When a section is deleted because its premise was ruled false, any rule sited inside it that is not part of that premise survives only if a consuming carrier states it independently, and CITING it is not stating it. The safety test is textual and cheap: read each consumer that references the deleted section and ask whether it would still say the rule with the section gone. Here SPEC-draft-pipeline §6.9.2 restated the unwritability rule locally, so the deletion cost nothing and the citations merely retargeted; had §6.9.2 only cited §2.5.3, the same deletion would have silently removed a live rule while every check still passed, because nothing executes a cross-document citation. A grep for the section number finds the consumers; only reading them distinguishes a restatement from a pointer.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
