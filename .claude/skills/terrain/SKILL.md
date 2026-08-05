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
2. **Navigate** — `view --survey <record> [--tag T] [--family F]`. This is
   the owner moving around: enumerate, sort, filter-by-owner. **Navigation
   narrows nothing** — say so if the owner asks, and never present a view
   as a shortlist. Screen 1's axis is the served tag vocabulary.
3. **Narrow (only through the contract)** — if a shortlist is wanted
   (e.g. the selector affordance holds only 4 options), that is a **trim**:
   `act --act trim --where … --why … --label … --ids …`. The record carries
   the machine premise and its negation as a first-class option. Present it
   at the `terrain-trim-ratification` gate. Never trim silently — a single
   ranking affordance on a navigation screen is the refused minimal-form
   bundling.
4. **Select** — `gate --gate terrain-strand-selection --ids a,b,c` (≤3
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
