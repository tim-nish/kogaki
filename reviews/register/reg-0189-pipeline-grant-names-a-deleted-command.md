---
id: reg-0189
status: pending
observed_at_pr: 736
observed_at_head: e7d6401
class: out-of-dimension
recorded: 2026-09-01
source_comment:
---
out-of-dimension: PR #736 — `.claude/pipeline.json` declares
`"review_reconciliation": "tools/review-sweep.sh --recent"`, and
`tools/review-sweep.sh` **does not exist in this repository**. The
`/ship-cycle` run on kogaki#735 invoked it and got exit 127.

The declaration is a grant of code execution — `commands/ship-cycle.md` says
so in its own words, which is why the key sits in the policy file rather than
in project config. A grant naming a deleted command fails in the direction
that reads as coverage: the run believes it has a licensed review path, the
close reports the pass ran, and nothing distinguishes "the pass found nothing"
from "the pass could not start".

Compounding it, the `review-lane-trigger.py` PostToolUse hook DID fire on
`gh pr create` and logged `pr 736 -> spawn-round-1 (dry-run)`. The engine
spawns only under `--spawn`; the wrapper that supplied it was what went away.
So the trigger's log line also reads as coverage while spawning nothing.

Accretion-class here because the carrier is machine-local: `.claude/pipeline.json`
is matched by the machine's global gitignore, so no committable repair exists
in this repository and the same run on another host has a different, equally
unrecorded state. Worth counting rather than fixing once.
