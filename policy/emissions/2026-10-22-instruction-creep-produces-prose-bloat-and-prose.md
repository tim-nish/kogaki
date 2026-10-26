<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-22
repo: Kogaki
grain: lesson

## Trigger — what happened

A general problem of AI engineering, named from three established terms and four measured instances. Instruction creep (the accumulation of rules by successive additions instead of consolidation; Wikipedia, Instruction creep) produces prose bloat (the state: a prompt, skill or judgment text grown past what its owner can read); prose bloat causes context rot (the effect: a model's accuracy on a task decays as the input grows and distractors accumulate; Chroma, Context Rot, 2025). Instances: the kogaki ParagraphPlan judge's judgment text grew from 138 to 963 words in eight days (2026-10-14 to 2026-10-21, 14 commits), one clause with an Issue number per defect, and on the 2026-10-21 14:43 run passed a Paragraph Waypoint its own FIFTH criterion names; the ParagraphPlan generator's text grew 368 to 1001 words over the same days; the Terrain implementation file reached 54% comment lines with 79 blocks of twenty lines or more retelling Issues (kogaki#1258, measured 2026-10-04); an earlier skill's instructions grew to ten times their size while its behaviour grew less stable with each fix (owner's account, 2026-10-22). Outside: the Claude Code team's reported practice of periodically removing CLAUDE.md rules and testing the model without them (secondhand reports of Boris Cherny, unconfirmed at source).

## The learning

The three are one chain and are fixed at the first link. A rule text that fixes each defect by adding a clause to an existing unit grows without bound and the model reading it stops applying any single clause reliably; word count is not the measure, because a change that adds a condition to the same responsibility (When Z, do Y to X) is a modification, while one that adds a second responsibility to the same unit (Do Y to X: do B to A) is the creep, and can shorten the text. The test is deletion: a clause that can be removed without changing what the rest of the unit requires is a second responsibility and belongs in its own named unit. Count units and apply the deletion test at every change; a word bound catches only the loud cases.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
