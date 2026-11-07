<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-20
repo: Kogaki
grain: lesson

## Trigger — what happened

A fix for a skill that silently dropped its arguments made the skill's one line forward them, then guarded the receiving act against positional tokens only. Two suite members caught what the guard missed, in two rounds: the receiving act is reached by three callers and only one of them is the CLI, so an allowlist written for the CLI's argument shape refused a sibling runtime on the arguments it exists to take.

## The learning

When you stop dropping a caller's words, you have not added one route into the act you are guarding -- you have added all of them. The drop was the guard: while the expansion line named no arguments, no flag the session typed could reach the act at all, so the act's own flag handling had never been a session-facing surface and nobody had asked which of its flags act. Forwarding makes every one of them reachable in the same edit, and a guard written against the shape that prompted the fix -- here, a positional token -- covers the one route someone happened to take and leaves the rest open. Two further things follow. First, the allowlist you then write is a claim about which arguments the act reads, and an act reached by several callers has several such claims: judging one caller's composed options object by another caller's read set refuses it on exactly the arguments it exists to take. Test for the caller, not for the argument. Second, the refusal text is a claim too -- 'reads no arguments from the session' stops being true the moment the allowlist admits a flag a session can now type, and a reviewer reads that sentence against the route rather than against the intent.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
