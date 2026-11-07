<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

A new check passed on every run of its own and went red the first time the registered runner executed it, which runs members eight at a time. Nothing in the check was wrong. Two members of the same suite were driving fixture runs that opened the same kind of gate, and the machine-local directory the gate pointers are written to is shared by both — so a hook that refuses to write a row when two live pointers name the same question wrote nothing, silently, and every downstream assertion failed for a reason that had no relation to what it was testing.

## The learning

When a suite runs its members concurrently, a member's evidence has to come from a run under those conditions. A member verified alone has been verified against a different environment than the one it will live in, and the difference is not a matter of timing: it is which machine-local state the member shares with its neighbours. The failure shape is characteristic — an assertion far downstream fails for a cause upstream, in every case at once, and the component that actually gave way did so on a path that returns success and reports on stderr. Two consequences worth carrying: isolate per-run state explicitly rather than relying on nobody else wanting it, and isolate it for the WHOLE span, because the first write often happens earlier than the step you were thinking about (here the setup act, not the step under test). And when a check drives another component, keep that component's stderr — a component that cannot fail loudly has only one channel, and discarding it leaves the check guessing at causes in its own failure text.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
