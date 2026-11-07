<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-11
repo: Kogaki
grain: lesson

## Trigger — what happened

A prose legend inside a source file was wrapped for width, and the line ended on the word "from" immediately before a closing quote. The repository has a check that reads the file for its own import statements against a closed allowlist, and it matched that pair as an import of the empty string, so the check failed naming a reader nobody had added.

## The learning

A scanner that reads source code as text will read your prose too. Comments, help strings and legends are part of the file a text-matching guard looks at, so an ordinary English word landing next to a quote mark can form the pattern that guard hunts for, and the failure names an import or a call that does not exist. The tell is a guard failing on a change that added no code of the kind it guards. Two cheap habits keep it quiet: do not let a line break fall between a keyword-shaped word and the quote after it, and when the guard does fire, look at the text before assuming the code is wrong.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
