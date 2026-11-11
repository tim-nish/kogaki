---
name: brief-sheet
description: Display the Brief sheet, which the owner names the BriefPlanPlayground, over one Brief file. Use when the owner asks to display, show or open the Brief sheet or the BriefPlanPlayground for a Brief — "show the brief sheet", "open the BriefPlanPlayground for <slug>". Invoke it with the Brief's path, `theses/<slug>/brief.yaml`. Writes `runs/leg-planning/brief-sheets/<slug>/sheet.html` beside `brief.sha256` and prints the sheet's `file://` URL as its one line. Makes no model call and never writes the Brief; a Brief written before kogaki#1775 is refused naming the Leg and the key.
allowed-tools: Bash(node src/leg-planning/sheet.mjs show:*)
---
!`node src/leg-planning/sheet.mjs show --brief $ARGUMENTS`
