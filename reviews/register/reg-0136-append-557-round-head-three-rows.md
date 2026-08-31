---
id: reg-0136
status: pending
observed_at_pr: 557
observed_at_head: a590fac
class:
recorded: 2026-08-19
source_comment: 5344383794
---
**Append from PR #557 round 2** (head `a590fac`). Three rows, two kinds — the kind is declared per row per rule 1, because rule 3's three-of-a-class widening trigger reads `out-of-dimension:` rows only and must not count a spent-bound carry.

---

**Row 1 — ACCRETION-CLASS (`out-of-dimension:`, counts toward rule 3).**

PR #557. A round-2 reviewer that finds a **reachable** non-gating in-diff finding at a **spent** bound has no writable carrier for it. `carried: register` is available; `carried: #<N>` is not, because the lane's grant table (`.claude/skills/review-lane/SKILL.md`, *The tools you actually have*) carries `gh issue view` and `gh {pr,issue} comment` but neither `gh issue create` nor `story-sync file-issue` — while the same SKILL's dimension-1 text instructs a reviewer to "file the carved-out work as its own issue and name it in the finding", and kogaki#433's floor sends a *reachable* finding at a spent bound to clause 3's successor lane rather than here. The instruction and the grant disagree, and the disagreement resolves **silently** toward the register: nothing in the report shape marks a register row that landed here because the reviewer could not reach its proper carrier. This round wrote the departure into its own prose; the next one may not.

---

**Row 2 — INSTANCE-CLASS (spent-bound latent non-gating in-diff carry, kogaki#374; does NOT count toward rule 3).**

PR #557, head `a590fac`, finding 1 of 2. `brief/compose.mjs:30` imports `readFileSync` and `writeFileSync` from `node:fs` and **uses neither**. `cmdFill()` was their only consumer and was deleted in the same commit that repaired round 1's orphan finding, leaving the import behind — the orphan one layer down. Node does not error on an unused import, so no suite member will ever say so. Latent: it fires against nothing. remedy: delete the import line.

---

**Row 3 — INSTANCE-CLASS (spent-bound non-gating in-diff carry; does NOT count toward rule 3).** Routed here rather than to a successor issue for Row 1's reason, and **this one is reachable, not latent** — stated so the row is not read as a kogaki#374 floor case.

PR #557, head `a590fac`, finding 2 of 2. `checks/check-brief-compose.sh:632` reads `MUTATION EVIDENCE (… stories 1.73 + 1.75 + kogaki#501 + kogaki#520 + kogaki#551): FIFTEEN mutations` and then enumerates **21** — kogaki#551's 2, story 1.73's 3, story 1.75's 3, kogaki#501's 4, kogaki#520's 3, and story 1.77's **6**. Story 1.77's six are enumerated in full but appear in neither the tally nor the member list, so the pre-diff `THIRTEEN` was already short by six and PR #557 moved it to `FIFTEEN` by adding two to that short base. `checks/registry.json:241`'s `efficacy` label is a copy of the same member list and omits 1.77 too; `registry-conformance` passes because it asserts the label *resolves against the file*, never that the label is complete. The registry's own `efficacy_note` records this exact class from kogaki#511 — a count that "said six while the pass line said ten, drift introduced by the same act that extended the pass line" — and the drift is now in the pass line itself. remedy: `FIFTEEN` → `TWENTY-ONE`, and `+ story 1.77` in both the check and the registry label, in one act so the pointer keeps resolving.

Report: https://github.com/tim-nish/kogaki/pull/557#issuecomment-5344377724
