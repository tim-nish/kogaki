---
id: reg-0106
status: pending
observed_at_pr: 484
observed_at_head: 185e7d2c06b9e9502bf13f2ebc221495ae279d77
class:
recorded: 2026-08-16
source_comment: 5307889335
---
## Append from the review lane — PR #484, round 1, head `185e7d2c06b9e9502bf13f2ebc221495ae279d77`

Six rows, and the two kinds are labelled per this lane's own rule (kogaki#374):
five **instance-class** carries (their value is the defect named, and they are
NOT counted toward rule 3's three-of-a-class widening trigger) and one
**accretion-class** `out-of-dimension:` row (which is).

### Instance-class — `carried: register` dispositions from the report

1. **should** — `parseArgs` (`brief/brief.mjs:38`) turns a valueless flag into
   boolean `true`; `String(true)` is `"true"`, which passes the slug grammar at
   `:153`, so `--slug` with no value silently mints `briefs/true/brief.md`, and
   the creator-never-editor rule (`:166`) then occupies that slug permanently.
   `--survey` with no value reaches `readFileSync("true")` at `:143` and throws
   an uncaught ENOENT rather than the runtime's `brief:` refusal shape the skill
   relays.
2. **should** — `checks/check-brief-entry.sh` admits four cases and records
   mutation evidence for one, case (a). The three refusal cases (b)–(d) — the
   properties SPEC-draft-pipeline §5.3 turns on — carry none. kogaki#209's
   specimen one surface over.
3. **should** — `.claude/skills/brief/SKILL.md:41` requires
   `--survey <survey record>` and never says where one is obtained; the record is
   machine-local (`terrain/terrain.mjs:20`, `~/.kogaki/runs/…`) while the surface
   the owner settles the `L<n>` set on is the gitignored `reports/FullReport.md`.
4. **nit** — `.claude/skills/brief/SKILL.md:60-61` grounds `briefs/` on "the
   footprint contract"; the term exists nowhere in this repository outside that
   line and `docs/stories/1.71.brief-entry-point.md:72`, and §5.3 says only
   "tracked in the repository".
5. **nit** — `composeBrief` (`brief/brief.mjs:83-84`) drops a Strand's
   `journey.cite` while §5.3 asks the mint to carry the selected Strands' served
   cites; the committed fixture exercises the case at `lesson:alpha` / L2.

### Accretion-class — `out-of-dimension:`

6. The lane's prescribed fixed first move — an unscoped tier-1 `gloss_index`
   survey — returns a 77 KB single-line payload that a review session cannot
   render, and reconstructing it by byte-slicing is what this lane's own *What a
   review reads* section declares out of scope. The opening move is therefore
   structurally undischargeable as written: the seam's reachability is
   establishable, its headlines are not. Observed on PR #484.
