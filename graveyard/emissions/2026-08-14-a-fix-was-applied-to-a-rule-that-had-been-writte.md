<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-14
repo: Kogaki
grain: lesson

## Trigger — what happened

A fix was applied to a rule that had been written as a hand-kept list, replacing the list with something computed from what was actually present. That was the right move and everyone agreed it was. It shipped, and the original problem was still there, because the thing it computed over was the wrong copy of the material -- the checker's own copy rather than the copy the work under examination would be judged in. A reviewer noticed before it shipped and the note was filed as non-blocking, so it went in anyway.

## The learning

Adopting the right general shape for a fix is not the same as connecting the fix to the thing it is supposed to act on, and the first can hide the second. Once a repair is recognisably the good kind -- computed rather than hand-listed, general rather than special-cased -- reviewers argue about whether the shape is right and stop asking what it reads from. So a repair of this kind owes a plain statement of which copy of the material it operates on, checked against which copy the real work will use. The tell is that the change never says which one it covers; if it does not say, nobody notices that it picked the convenient one. Related: a repair like this can fail at the input, at what the test asserts, at where the guard runs, or at how narrowly it is aimed, and fixing one of those leaves the others untouched -- so counting the ways it can come loose is worth more than fixing the way that happened to be found.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
