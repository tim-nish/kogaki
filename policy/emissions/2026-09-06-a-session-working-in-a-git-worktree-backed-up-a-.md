<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

A session working in a git worktree backed up a file it was about to mutate to /tmp/rd.bak, ran four mutation tests restoring from that path between each, and on the second restore the file came back holding a DIFFERENT issue's work. A concurrent session on the same machine, in its own worktree on the same repository, had written its own /tmp/rd.bak from the same habit. About ninety minutes of edits to a 5000-line file were destroyed and had to be replayed from the conversation record. The harness had told this session, in its own operating instructions, to use a session-scoped scratchpad directory for temporary files and not /tmp.

## The learning

A backup path is a name in a shared namespace, and a name chosen for how well it describes the file collides with every other session that describes the file the same way. Two agents working the same repository in isolated worktrees are isolated in every place the isolation was designed — the checkout, the branch, the run workspace — and share /tmp completely, so the one directory nobody thinks of as state is the one where their isolation ends. The failure is silent in both directions: the write succeeds, the read succeeds, and the restored file is well-formed source that compiles, so nothing reports a collision and the only signal is that the code is about something else. What makes it worth stating is that obviousness of the name is what causes it: the more natural the choice, the more likely a peer made it. So a scratch path must carry something no peer can reproduce — the session id, the worktree — and where the environment already provides such a directory, using it is not tidiness but the whole of the protection.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
