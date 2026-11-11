---
name: paragraph-plan
description: Plan an adopted Brief down to paragraphs. Use when the owner wants the Waypoints generated for a filled Brief — "plan the paragraphs", "run /paragraph-plan", "paragraph-plan the brief for <slug>". The stage between /brief and /draft (/terrain → /brief → /paragraph-plan → /draft): the Brief ends at Legs and carries no Waypoint, and this stage alone writes them — it takes each Leg as its unit, binds one paragraph Move to it, writes at most `brief.paragraphs_per_leg` paragraphs of Waypoints, one per Segment of that Move, through a judged feedback loop, with what earlier Legs state derived from the Leg order, and writes `paragraph-plan.yaml` beside the Brief, holding each Leg's bound Move id and nothing else of a Move. Invoke it with the Brief's path, `theses/<slug>/brief.yaml`. Runs as a Detached Job on the Harness; it never writes the Brief, and a stop names the Leg and the paragraph.
allowed-tools: Bash(node src/paragraph-plan.mjs start:*), Bash(node src/paragraph-plan.mjs status:*), Bash(node src/paragraph-plan.mjs await:*)
---
!`node src/paragraph-plan.mjs start --brief $ARGUMENTS`
