<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-10
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1079: case 4(b) of the Terrain advance-keying fixtures staged a run record with completed: [] and awaiting: TAG_SELECTION, meaning to test the gate. The executor resumes at the first UNCOMPLETED state, which was survey — the one state that reads the policy seam. The case passed locally where the gateway was up and was red in CI, blocking the pull request it belonged to.

## The learning

A fixture that stages a resumable record must complete every state BEFORE the one it is testing, not just name the one it is testing. Naming the awaited state says where you want the run to be; the completed list is what actually decides where it starts. Completing the state is also not enough on its own: a state that mints an artifact leaves later states reading that artifact, so the record it wrote has to be supplied with it — here from a truthful fixture the repository already commits, rather than restaging one from the shell, which would be a second implementation of the executor's own schema. The tell that the mistake has been made is a case that passes on a developer machine and fails on a bare runner: the missing state was the one that reached outward.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
