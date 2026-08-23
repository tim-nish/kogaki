<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-16
repo: Kogaki
grain: lesson

## Trigger — what happened

A scheduled command was allowed to auto-commit only files its own run created, checked against a snapshot of what the working tree held at start. Learning-note files left by the previous run were always in that snapshot, so every run correctly declined to commit them and correctly reported declining — and the pile of uncommitted notes grew for four days while every individual run behaved exactly as designed. An auditor reading committed history then concluded the notes had stopped being written at all.

## The learning

A safety rule that excludes pre-existing files from automation needs a second half: some named act must eventually pick those files up, or the exclusion turns a safeguard into a ratchet. Each run's refusal is correct in isolation; composed across runs, the refusals guarantee the backlog only ever grows, and the growth is invisible precisely because every report along the way is honest. The tell is a pile whose every member was individually declined for a good reason. When you scope an automatic act by 'not the things that were already here', schedule the act that handles the things that were already here — otherwise you have decided, silently, that nobody ever will.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
