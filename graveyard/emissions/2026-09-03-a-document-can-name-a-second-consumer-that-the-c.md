<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

A spec-lane sitting on kogaki#633 was about to write acceptance criteria against a named second consumer of a vendored kit. Reading that consumer's committed state instead of its working copy showed it tracked none of the kit and carried none of the kit's managed block; what was present were the kit's OUTPUT files, sitting untracked. The issue's own premise, and the governing spec's introduction, had both named that consumer as installed.

## The learning

A named consumer is a claim about another repository, and the two cheap ways to check it disagree. A working copy shows files a tool once produced there; only the committed state shows what that repository actually keeps. Output files are the trap, because they look exactly like installation from the outside and they are what a passing tool leaves behind. Acceptance criteria written against an uninstantiated consumer cannot fail, so the work ships looking verified and the first real consumer finds the defect. Check the committed state of the other repository by name, and where the consumer turns out not to exist, say so in the artifact and downgrade the exercise to a fixture on purpose rather than discovering later that no other exercise was ever possible.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
