---
id: reg-0076
status: pending
observed_at_pr: 439
observed_at_head: fa2b4ee
class:
recorded: 2026-08-14
source_comment: 5292580150
---
## PR #439 round 2 — appends (head `fa2b4ee`)

Report: https://github.com/tim-nish/kogaki/pull/439#issuecomment-5292575661

**row kind: accretion-class (`out-of-dimension:`)** — counts toward the SKILL.md rule 3 three-of-a-class widening trigger.

- `out-of-dimension:` the lane's mandated opening move, an unscoped tier-1 `gloss_index` survey, again exceeded the tool-result bound (76,961 characters on one line, spilled to a file whose lines defeat `Read`'s offset/limit chunking). **Second instance** — round 1 of this same PR recorded the first. Round 2's workaround was a bounded `Grep -o` window over the spill file, which reads the index but is not a survey. The instrument, not the PR.

**row kind: instance-class (spent-bound latent non-gating in-diff carry, kogaki#374)** — does NOT count toward rule 3.

- `finding: should open` — `spawn()`'s grant call site is bound only by an argument-blind source regex. `checks`-side fixture §6 asserts `re.search(r"\n    granted_tools = with_tool_grants\(", …)`, which matches the call however it is argued, so mutating `tools/review-sweep.sh:2695` from `with_tool_grants(tools or REVIEW_TOOLS, ref)` to `…, None)` survives every fixture in the block — and that mutation is #413's shipped defect (a grant computed over the wrong tree) restored silently. The PR's mutant list names the *removal* case, which §6 does kill; the ref-swap is not on the list.
- `finding: nit open` — the ref path and the working-tree path of `tool_grants()` disagree on an EMPTY-but-readable `tools/*.sh`. The ref path's `body if body else SPAWNER_MARK` cannot separate an empty blob from a refused read and excludes it; the working-tree path maps only `OSError` to the marker, so it grants it. The comment added with the fix claims parity ("matching the working-tree path below"). Error direction is harmless (ungranted tool, never a granted spawner).
- `finding: should open` — the `checks/` half of the same grant is still derived from the sweep's own checkout (`CHECK_TOOLS`, `tools/review-sweep.sh:771`), so a PR adding `checks/check-<new>.sh` still hands the reviewing round a grant computed in another tree. §4 clause 4's rule is stated over "a spawned round's executable grant", not over `tools/` alone. Outside #437 and distinct from story 1.64's `control` finding (the guard's siting), so it is not absorbed by 1.63's close. **This one wants an issue rather than a ledger row** — carried here only because the reviewing session holds no `story-sync file-issue` grant. Carried from round 1, where it was recorded identically.

**row kind: accretion-class (`out-of-dimension:`)**

- `out-of-dimension:` a mutation record arriving half-joined — mutants named without the fixture section that kills each. PR #439 now carries this **twice**: round 1's list left three of five mutants unjoined, and the round-2 fix's two new mutants ("M6 ref ignored, M7 unreadable blob granted") name no section either. kogaki#230's obligation is a table "naming each mutation and which fixtures fail it"; both instances are in fact covered, so this is record completeness and never a coverage gap. The value is the frequency.
