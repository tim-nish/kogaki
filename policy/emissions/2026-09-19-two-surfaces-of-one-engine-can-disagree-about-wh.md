<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-19
repo: Kogaki
grain: lesson

## Trigger — what happened

A pull request reached its two-round review bound. The spawn surface answered 'the round bound is spent and this PR is unresolved -- the ruled outcome is a SUCCESSOR ISSUE'. The session followed that, raised the owner gate and filed a successor. The merge surface of the same engine, run at the same commit minutes later, answered 'review-presence ok (present)' and merged the pull request. The successor had no subject the moment it was filed.

## The learning

When one system offers two ways to ask whether a piece of work is finished -- one that decides whether to do more work on it, and one that decides whether to release it -- they will eventually answer differently about the same state, and nothing in either answer reveals that the other exists. Here the difference came from a review attempt that crashed before reviewing anything: the side counting attempts called that a spent attempt against unfinished work, and the side checking for a review record found the crash's own marker sitting where a record goes. Both readings are defensible and only one can be acted on. The cost falls on whoever asks first, because a documented order of operations makes that accidental: following it, the session committed to the terminal reading -- filing an issue, spending an owner's decision -- before the other surface was ever consulted. So when two questions are really the same question, have them read one answer; failing that, ask both before acting on either, and treat a disagreement as the finding rather than picking the surface you reached first.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
