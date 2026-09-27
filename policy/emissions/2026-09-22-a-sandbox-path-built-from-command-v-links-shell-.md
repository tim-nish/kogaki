<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-22
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1182 added a --ci-shape mode that restricts PATH to a declared list of binaries, resolved with `command -v` and symlinked into a temp directory. Five of the declared names (printf, true, false, test, kill) are bash builtins, so `command -v` printed the bare word rather than a path and the link resolved to itself. Review round 1 of PR #1183 caught it; it was fixed with `type -P` and an assertion that every built link resolves.

## The learning

When you build an isolated PATH by symlinking a declared list of tools, resolve each name with something that answers 'is there an executable FILE for this', not 'how would this shell run this word'. The second question includes shell builtins, and a builtin has no file to link to — so the link points at its own name and resolves to itself, which is a loop rather than a missing entry. The failure is worse than an absence: inside the sandbox every shell that has the builtin still works, so nothing fails until some member reaches the name as an external command, and then it fails for a reason that has nothing to do with what is being tested. That is exactly the class a declared environment exists to retire, reappearing inside the declaration. Assert the property directly — walk the built directory and require every entry to resolve — because the list of names that happen to be builtins is not stable across shells or machines and will not stay in anyone's head.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
