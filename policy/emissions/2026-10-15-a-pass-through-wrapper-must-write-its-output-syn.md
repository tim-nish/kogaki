<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-15
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1386: the Leg run wraps the model command with a small recorder that passes each call through and logs it. The first live run stopped at paragraph 2 with 'no result line in the output', though the log showed the model had answered in full. The test's fake model answered in a few hundred bytes and passed.

## The learning

A Node program that relays another program's output and then exits must write that output synchronously. Writing to a pipe is asynchronous, and exiting straight after cuts anything longer than the pipe's buffer (about 64 KB), so the reader gets a truncated answer while the wrapper's own log shows the whole one. A test only catches this if its fake answers are longer than the buffer, so a fixture standing in for a live model should pad its answers to a realistic size.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
