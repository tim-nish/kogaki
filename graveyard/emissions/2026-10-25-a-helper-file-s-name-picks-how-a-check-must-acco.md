<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-25
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1597: a check at its line bound needed its new case in a separate file; admission named the file checks/<name>-cases.mjs before anyone looked at what that name commits the check to

## The learning

In this repository a file under checks/ named like <name>-cases.mjs is treated as a pass that its check runs. That name rules out simply importing the file: the check must start it as a separate program, declare how many assertions it runs, and compare that number in both directions. A plain shared module lives under checks/fixtures/ instead and carries none of that. So choosing the file's name at planning time is choosing the wiring, and the planner should pick the name with that in view. Here the right route cost two extra commits and the check's last free line.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
