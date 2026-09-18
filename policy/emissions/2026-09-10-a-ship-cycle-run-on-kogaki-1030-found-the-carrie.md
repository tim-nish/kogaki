<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-10
repo: Kogaki
grain: lesson

## Trigger — what happened

A ship-cycle run on kogaki#1030 found the carrier's build already landed and only an owner-observed live run left unmet; the vitality gate tripped at three runs and the owner selected close-as-discharged, which then needed a second dedicated gate before anything closed.

## The learning

Selecting a disposition at an arbitration gate is not the same act as licensing it. Where the disposition ends a carrier with no code and no blocker behind it, the arbitration gate can only choose the arm; a separate question carrying its own fixed request line and fixed labels is what writes the licence, and the executing command refuses until that record exists. This is worth designing for rather than working around: the gate that surveys the options is answered by someone weighing four arms against each other, while the gate that licenses the ending is answered by someone consenting to that one ending on its own terms, and collapsing them would let the survey's framing carry the consent. The practical tell is that the executing command's refusal is generous - it prints the exact question, line and labels it needs - so a run that reads the refusal as a dead end has misread a handoff as a wall.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
