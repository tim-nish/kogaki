---
name: brief
description: Compose a Brief from a settled set of Strands. Use when the owner wants to begin an article Brief — "start a brief", "begin a brief". Invoke it with the SERVED LESSON ADDRESSES the Brief composes from, space-separated — `coding::lesson/<local-name>` (a bare local name resolves against the Lesson kind). A human-facing reference — a Full Report coordinate such as `G1`, `L101` or `D7`, or a description in prose — is YOUR resolution to make from the Full Report BEFORE invoking this skill, and the skill is invoked with the addresses that resolution produced; the runtime refuses a `G<n>`, `L<n>` or `D<n>` token by name, and refuses a start with no argument. The resolved set is rendered back to the owner at the first gate, which is where a mis-resolution is caught. Runs the whole flow on a Harness-owned workflow table and stops only at its two owner gates or at a refusal.
allowed-tools: Bash(node src/brief.mjs start:*)
---
!`node src/brief.mjs start $ARGUMENTS`
