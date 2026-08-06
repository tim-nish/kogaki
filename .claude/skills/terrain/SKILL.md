---
name: terrain
description: Survey the served material and let the owner select article Strands. Use when the owner wants to browse the substrate for article material, "run terrain", "survey the strands", or asks what material exists without naming a story yet.
---

# Terrain — the survey/selection surface

Terrain is the entry point for browsing served material when the owner
cannot yet name a story. Governing spec: `specs/spec-terrain/SPEC.md`;
runtime: `terrain/terrain.mjs`. Everything below is that spec's three
contracts driven through the harness — none of it is discretion.

## The flow

1. **Survey** — `node terrain/terrain.mjs survey`. Composes from the seam
   (`element_survey`, served renderings only, never gateway internals) into
   the machine-local run workspace. The completeness line prints first:
   every figure names which family it counted, and `placed of total` comes
   from the composed placements, never from the candidate list.
2. **Navigate — screen 1** — `view --survey <record> [--tag T] [--family F]`.
   This is the owner moving around: enumerate, sort, filter-by-owner.
   **Navigation narrows nothing** — say so if the owner asks, and never
   present a view as a shortlist. Screen 1's axis is the served tag
   vocabulary.
3. **Navigate — screen 2, the co-tag step** —
   `cotags --survey <record> --tag <T> --claims <F>
   [--subdivisions <F> --judge-model <M> --judge-effort <E>]`.
   **This is where a tag selection lands, not a second `view --tag`.** A flat
   list of Lesson slugs beside a count table is what the co-tag screen
   REPLACES: it lets no image of a possible Thesis form, which is the purpose
   Terrain exists to serve (`specs/spec-terrain/SPEC.md` §6.1).
   - **You compose the claims; the runtime renders them.** `--claims` is a
     JSON map from group name to that group's composed "in common:" line —
     the plain-register statement of what its members share. §7 binds the
     pinning, the gate event and the record's shape and leaves the wording to
     the composer, which is why the text arrives as an argument and is not
     invented in the runtime.
   - **Every group gets one.** A group with no claim renders an explicit
     ABNORMAL marker and nothing is substituted for it — the same discipline
     a missing Gloss rendering already gets.
   - **SubGroups where §8's conditions bind**, via `--subdivisions`: the
     CONJUNCTIVE leaf condition (composes honestly AND tighter than its
     parent's) plus the two disjunctive disclosures — **the screen judges and
     renders both**, and **refuses without a judge pin**, because a judged
     surface that records no judge cannot be seen to drift. **Never a member
     count.**
     A number in that decision is a defect against §8 — the owner's "five or
     more" is calibration evidence for where the undiscriminating-claim
     condition binds, not a threshold.
   - The screen carries **no per-Strand Gloss line and no Journey line**. That
     material is the Full Report's (§12).
4. **Read in full — the Full Report** —
   `report --survey <record> --tag <T> --group <G> [--claims <F>]
   [--subdivisions <F> --judge-model <M> --judge-effort <E>]`.
   The screen is what the owner **navigates**; this is what they **read**.
   Untruncated Claims and the complete Lesson and Journey Glosses, written to
   the machine-local reports home and **never committed**.
   - **Identity is the triple (substrate pin, co-tag query, judge pin)**, with
     `none` typed where nothing was judged. A rerun under the same identity is
     **idempotent** — one report, not a duplicate — and a run under a new
     substrate pin, a different `(tag, group)`, or a different judge produces
     another.
   - **A report carrying SubGroupClaims REFUSES without a judge pin.** Judged
     material recorded without its judge is the drift-undetectable shape.
   - **It is a rendering, not an address.** Never cite a report id in a Brief
     or a proposal — cite members and pins, exactly as before.
5. **Narrow (only through the contract)** — if a shortlist is wanted
   (e.g. the selector affordance holds only 4 options), that is a **trim**:
   `act --act trim --where … --why … --label … --ids …`. The record carries
   the machine premise and its negation as a first-class option. Present it
   at the `terrain-trim-ratification` gate. Never trim silently — a single
   ranking affordance on a navigation screen is the refused minimal-form
   bundling.
6. **Select** — `gate --gate terrain-strand-selection --ids a,b,c` (≤3
   Strands; more is a trim, and the runtime refuses). Render the printed
   declaration through **AskUserQuestion exactly as declared**: options
   verbatim, nothing pre-selected, free text always on — the medium binding
   is contract, not discretion. Then
   `capture --declaration <file> --tool-use-id <the AskUserQuestion tool
   use id> --option <id> | --free-text <answer>`.

## Hard lines

- An act that is neither proposal (`rank`, `trim`, `hide`) nor navigation
  (`enumerate`, `sort`, `filter-by-owner`) is a **report** — the runtime
  writes it as one; never classify it yourself.
- Quote served material at the pin the seam returned; on public surfaces
  use the gloss-register renderings (founding spec rider 2).
- The run workspace (`~/.kogaki/runs/…` or `$KOGAKI_RUN_DIR`) is
  machine-local state and is **never committed** (founding spec rider 3).
- If the seam is unavailable the runtime prints one
  `policy_source unavailable:` line and stops — Terrain has no material
  without it; do not improvise material from the repository, which is
  invisible by design.
