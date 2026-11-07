<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

A required flag was omitted from a validation tool and the tool reported a served-surface miss instead of a usage error. `issue-pins.mjs --emit-pin-quotes <file>` was run without `--consumer`, and it reported `the content trial did not run — lessons_index({}) returned a miss` for every cite. The same call through the transport it wraps, `gateway-query.mjs --consumer kogaki --tool lessons_index --args '{}'`, returned 558 lines at the same moment. Adding `--consumer kogaki` made five of six cites hash immediately.

## The learning

A tool that forwards a required argument to a subprocess can turn its own missing-argument error into a report about the far side. The consumer name was undefined, the subprocess was called with it anyway, the far side answered with the miss shape it answers any unknown consumer with, and the wrapper faithfully reported that miss — so the diagnostic named the served surface, which was healthy, instead of the invocation, which was wrong. The tell is that the report blames a component the caller did not touch: a run that has changed nothing about the corpus and suddenly cannot read it should be suspected of having changed something about the call. The remedy is at the wrapper, which knows the argument is required and can refuse before spending the call; forwarding an undefined value is the step that converts a usage error into a false fact about someone else.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
