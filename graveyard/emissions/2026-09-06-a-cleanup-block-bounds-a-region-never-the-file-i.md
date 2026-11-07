<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

check-brief-compose ran a try/finally that removed its temporary directory, and a case appended after that finally created a second temporary directory and removed nothing. Nineteen leaked directories had accumulated before anyone counted them. The case was written by a sitting that could see the finally two thousand lines up and reasonably read it as the file's cleanup.

## The learning

A cleanup block written as a file's last act stops being that the moment anything is appended below it, and nothing in the language or the diff says so: the appended code sits at the same indentation, in the same file, under the same imports, and inherits none of the guarantee. The reviewer of the appended code sees a member that visibly cleans up after itself, because it does — just not there. The tell is that the leak is invisible per run and only legible as an accumulated count in a directory nobody reads, so the instrument that finds it is a count taken across runs rather than any assertion the suite can make about itself. Worth asking, whenever a resource is acquired outside an existing cleanup region: is this block inside the finally that appears to cover it, or merely below it?

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
