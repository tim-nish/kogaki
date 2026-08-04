# Consultation map — the occasions file

Boundaries at which policy consultation is **required** before acting.
Contract (spec: `product-lab specs/tsurezure-client-kit.md` §3):

- An entry = **trigger terms** + a one-line summary **quoting the served
  line at its pin** + the pointer. Never a paraphrased rule — on divergence
  the served surface wins and the entry is repaired.
- Entries are added **only on a miss**: a defect that consultation would
  have prevented, exposed in this repo. Each addition names the miss.
- The map **triggers consultation, never carries verdicts.** The answer
  stays in the substrate.

## Entries

### 1. Check/CI infrastructure — creating, renaming, or modifying checks, hooks, or the check registry

- **Trigger terms:** check, checker, hook, CI, registry, lint, gate script
- **Served line (pinned):** "a check suite is budgeted at its loop position;
  suite membership is opt-in per loop; admission carries a removal signal
  declared at birth" — `topics/claude-code-ops.md`, the 2026-08-04
  governance lines (product-lab#150 protects the build-vs-adopt clause).
- **Origin miss:** a consumer suite reached 170+ members with no admission
  economics (writing-assistant, retired 2026-08-04); the seed entry exists
  so the recurrence is caught at the first act that should have consulted.
