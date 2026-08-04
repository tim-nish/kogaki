# Consultation map — the occasions file

Boundaries at which policy consultation is **required** before acting.
Contract (founding spec §4):

- An entry = **trigger terms** + a one-line summary **quoting the served
  line at its pin** + the pointer. Never a paraphrased rule — on divergence
  the served surface wins and the entry is repaired.
- Entries are added **only on a miss**: a defect that consultation would
  have prevented, exposed in this repo. Each addition names the miss.
- The map **triggers consultation, never carries verdicts.** The answer
  stays in the substrate.

## Entries

### 1. Check/CI infrastructure — creating, renaming, or modifying checks, hooks, or the registry

- **Trigger terms:** check, checker, hook, CI, registry, lint, gate script
- **Served line (pinned):** "a check suite is budgeted at its loop position;
  suite membership is opt-in per loop; admission carries a removal signal
  declared at birth" — `topics/claude-code-ops.md`, 2026-08-04 governance
  lines (product-lab#150 protects the build-vs-adopt clause: the trigger
  counts check-runner consumers, population one).
- **Origin miss:** writing-assistant's suite reached 170+ members with no
  admission economics; the rebuild exists partly to prevent the recurrence
  (owner ruling 2026-08-04).
