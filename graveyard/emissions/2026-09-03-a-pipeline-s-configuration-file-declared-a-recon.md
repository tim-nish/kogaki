<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

A pipeline's configuration file declared a reconciliation command to run at close: 'review-lane --recent spawn'. The tool takes --recent as a top-level flag and spawn as a subcommand, so the declared string parsed 'spawn' as the subcommand and hit a usage error for missing required arguments. The process then EXITED 0. A caller checking the exit code would have recorded the reconciliation as having run.

## The learning

A command string held in configuration is unverified until something runs it, and the failure mode is not a crash — argument parsers commonly exit 0 on a usage error, so the caller reads success and the work silently never happened. Two things follow: a configured command deserves the same review as code, since it is code the config author cannot test from where they wrote it; and a caller that treats exit 0 as evidence the work was done needs a second signal, because the one it has cannot distinguish a finished job from a rejected invocation.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
