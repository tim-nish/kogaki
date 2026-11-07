<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-11
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1100 removed the --file and --verdicts arguments from five acts of src/review-draft.mjs and moved the reply to standard input. Three of those acts pick their phase on whether a reply is present: nothing piped in renders what is owed, a reply piped in records it. Dropping the retired argument silently would have handed a call that still passed --file the render phase, which exits 0 and looks like a recording that ran. The same shape appeared one layer down in the self-test driver, where a reply path that did not exist became an empty stream and so became the render phase for those three acts.

## The learning

When you take an option away from a command, refuse it by name rather than letting it be ignored. A caller that still passes the old option is not passing the new input, and where the command decides what to do by asking whether input arrived, the old call lands in the branch that produces nothing and reports success. Ignoring the option turns a caller written against the old interface into a quiet no-op, while refusing it turns the same call into a message naming the new form. The same rule reaches test fixtures: a fixture that turns a missing input file into an empty input has built the silent branch itself, and every case that mistypes a path then passes without asserting anything.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
