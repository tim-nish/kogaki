---
name: paragraph-plan
description: Plan an adopted Brief down to paragraphs. Use when the owner wants a filled Brief planned for /draft — "plan the paragraphs", "run /paragraph-plan", "paragraph-plan the brief for <slug>". The stage between /brief and /draft (/terrain → /brief → /paragraph-plan → /draft). For each Leg it takes two steps and ends (kogaki#1865, kogaki#1876) — five calls read the Senses that hold between the Leg's sentences, and the Move whose Edges the Leg meets best is chosen and fitted to the Leg by code with no call — and it writes `paragraph-plan.yaml` beside the Brief, each Leg carrying its fitted Segments and nothing else. Invoke it with the Brief's path, `theses/<slug>/brief.yaml`. Runs as a Detached Job on the Harness (`node src/paragraph-plan.mjs start`, then `status` and `await`); it never writes the Brief, and a stop names the Leg.
allowed-tools: Bash(node src/paragraph-plan.mjs start:*), Bash(node src/paragraph-plan.mjs status:*), Bash(node src/paragraph-plan.mjs await:*)
---
!`node src/paragraph-plan.mjs start --brief $ARGUMENTS`
