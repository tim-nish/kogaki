---
id: reg-0123
status: pending
observed_at_pr: 525
observed_at_head: d3289525e00f85849c2d9eb583cce4da1652ee2f
class:
recorded: 2026-08-18
source_comment: 5330897741
---
Appended from PR #525's review-lane report (head `d3289525e00f85849c2d9eb583cce4da1652ee2f`, licensing issue kogaki#520).

**Row class: INSTANCE-class, not accretion-class.** Its value is the defect it names, not a count — so it does **not** count toward rule 3's three-of-a-class widening trigger, which reads `out-of-dimension:` rows only. This review produced no `out-of-dimension:` observation.

**Why it lands here rather than as its own issue.** The report's finding 1 named downstream work in a file kogaki#520 does not authorize, so the carrier should have been a new issue. `~/.claude/tools/story-sync file-issue` was refused in the review session, and a refusal is terminal for that command (SPEC §4, kogaki#100). Routing to the register is what keeps the finding from evaporating at the merge; minting the issue remains owed and is not discharged by this row.

---

**finding 1 — the brief pipeline's other two owner gates carry section references, which the new rendering contract forbids** (`should`, open at `d328952`)

PR #525 added a rendering contract to `.claude/skills/brief/SKILL.md`:

> **Never show a section reference.** A pointer into a spec (`§6.1`) is a term of art to a reader who does not hold the spec.

It is stated for **every** ask the pipeline raises — "Every ask this pipeline raises through AskUserQuestion is rendered from a runtime payload" — while the deny tripwire that enforces it (`denyInternalVocabulary`, `brief/assemble.mjs:94`) reads only the Candidate-selection payload.

Two other owner-facing gates in `brief/brief.mjs` violate the contract as it now stands:

- `brief-thesis-adoption` — `why`: "… composed from the set's own members and from nothing else (§3)" (`brief/brief.mjs:322`)
- `brief-slug-approval` — `why`: "… never a machine identity (§5.3 v9; SPEC-terrain §12.2)" (`brief/brief.mjs:372`)

Both are raised to the owner in the same sitting, ahead of the Candidate gate, so a reader who does not hold the spec meets three section references before reaching the one surface that is guarded.

**The remedy, in kogaki#520's own owner-ruled order.** Plain-label those `where`/`why`/`label` strings in the generator first; then either extend the tripwire's reach to the two payloads, or state why it stays scoped to one gate and the other two are guarded by the contract alone. Out of scope: the thesis-candidate text, which kogaki#520 already carved out.

**Not a defect in the PR's own text.** kogaki#520 authorizes `brief/assemble.mjs`, the skill's rendering contract and the check; `brief/brief.mjs` is not in its scope, and widening the PR would be unlicensed work.
