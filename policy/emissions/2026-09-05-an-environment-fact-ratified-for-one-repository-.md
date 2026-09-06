<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A shared command file carries a ratified record about a merge setting, and correctly states that one consuming repository has the setting off and another has it on. A run driving the second repository applied the first one's record from memory of the clause, performed the substituted act the record covers, and only discovered the mismatch when it read the setting live at the close — after the merge.

## The learning

A contract that carries a per-repository environment fact for two consumers is read by a run in one of them, and the prose that makes the fact conditional is exactly the part a reader compresses away: what survives the reading is the ratified sentence, not which repository it was ratified for. Naming both repositories in the clause is not enough, because the failure is not that the reader lacked the other value — it is that the reader never asked which one applied. The repair is to make the run READ the setting rather than recall the record: a per-repository fact belongs in a live read the act performs, and the ratified record's job is to say what to do with each answer, never to supply the answer. A record that supplies the answer ages into a false one the moment the environment moves, and it ages silently, because nothing in a run that recalls it correctly looks any different from a run that read it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
