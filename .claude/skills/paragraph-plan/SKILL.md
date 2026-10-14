---
name: paragraph-plan
description: Plan an adopted Brief down to paragraphs. Use when the owner wants the Paragraph Waypoints generated for a filled Brief — "plan the paragraphs", "run /paragraph-plan", "paragraph-plan the brief for <slug>". The stage between /brief and /draft (/terrain → /brief → /paragraph-plan → /draft): it binds one paragraph Move to every Leg Waypoint, generates that Leg Waypoint's Paragraph Waypoints through a judged feedback loop, and writes `paragraph-plan.yaml` beside the Brief, holding nothing of a Move. Invoke it with the Brief's path, `theses/<slug>/brief.yaml`. Runs as a Detached Job on the Harness; it never writes the Brief, and a stop names the Leg and the Waypoint.
allowed-tools: Bash(node src/paragraph-plan.mjs start:*), Bash(node src/paragraph-plan.mjs status:*), Bash(node src/paragraph-plan.mjs await:*)
---
!`node src/paragraph-plan.mjs start --brief $ARGUMENTS`
