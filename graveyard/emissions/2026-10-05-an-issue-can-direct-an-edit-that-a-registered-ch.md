<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-05
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1271's design told the implementation to add a sentence to .claude/skills/brief/SKILL.md; admission refused the .claude path in the plan cell, and the registered check brief-skill-is-one-line forbids any line after that file's start line.

## The learning

When an Issue names an exact edit, check the target file against the registered checks before admission, not after. Here the Issue's design asked for a sentence in a file that a check keeps to one line, and neither the Issue's author nor admission caught it: admission only refused the path for a worker cell, and said the write could be a session step. The fix was to leave the file alone and let the program's own printed output carry the instruction, which is what that check asks for. A design that names files should be read against the checks that guard those files while it is still being written.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
