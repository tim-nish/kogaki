---
name: terrain
description: Survey the served material and let the owner select article Strands. Use when the owner wants to browse the substrate for article material, "run terrain", "survey the strands", or asks what material exists without naming a story yet.
---

# Terrain — the survey/selection surface

The entry point for browsing served material when the owner cannot yet name a
story. Governing spec: `specs/spec-terrain/SPEC.md`; runtime: `src/terrain.mjs`.

**This file carries CONDUCT only** — what you do, and what you must not. The
*form* of every rendering is `src/report-format.json`'s; the *order* of every act
is `src/workflow.json`'s. Neither is restated here, and a second copy of either
would be a surface that can disagree with the one the runtime reads.

## Delivery

**The runtime is the only producer of owner-facing text.** You never retype,
summarize, reformat, tabulate or paraphrase its output into your reply — you put
its bytes on screen, or name the artifact it wrote.

## Invoking the executor

```
node src/terrain.mjs run [--run-dir D] [--workflow F]
node src/terrain.mjs run --run-dir D --input '<what the owner said>'
node src/terrain.mjs run --run-dir D --enter <STATE>
node src/terrain.mjs run --run-dir D --status
```

**The order is not here.** Which state runs when, where the run stops, which
states are conditional and what ends a run are read from `workflow.json` every
run. This section is how to *invoke*; a reader who wants what the executor will
do reads the table.

- **The executor stops; the owner speaks; you re-enter.** At a wait the runtime
  prints where it stopped and what the owner supplies. Re-enter with `--input`.
- **A wait that declares a gate WRITES its declaration, and you render it** —
  through `AskUserQuestion`, options verbatim, nothing pre-selected, free text
  always on — then re-enter with a **bare** `run --run-dir D`. That answer **is**
  the owner input for the wait. **Composing and recording are the engine's;
  deciding is the owner's; rendering is yours.**
- **YOU NEVER CARRY THE OWNER'S ANSWER.** There is no flag for it.
  `--capture-option`, `--capture-free-text` and `--tool-use-id` are removed and
  refused by name; `.claude/hooks/write-gate-capture.py` records the answer from
  the harness's own payload at the moment the owner gives it, and the executor
  reads it. Your job ends at rendering the question — so render it and re-enter,
  and never reach for a way to tell the runtime what was chosen. If a re-entry
  refuses saying the harness recorded no answer, the question has not been
  answered yet, or the hook is not installed on this machine; the refusal names
  both paths to check.
- **Where the declaration carries a rendering key, those bytes go on screen
  VERBATIM and BEFORE the question.** `TAG_SELECTION`'s declaration carries
  `tag_listing`, the pre-selection tag table. Rendering the question without it
  asks the owner to name a tag with nothing to choose from, which is the defect
  the gate exists to end; rendering it after the question is the same defect.
  It is the runtime's own output — putting it on screen is not retyping.
- **An owner input is admitted by the WAIT, never by its own shape.**
- **A conditional state is entered only by `--enter`**, never scheduled.

## Composing the executor's inputs

**The runtime VALIDATES the typed records and never composes them.** The
judgment is yours; the ordering is the table's; the rendering is the runtime's.

The two invocations the judgment states consume:

```
cotags --survey <record> --tag <T> --claims <F> --subdivisions <F> --judge-model <M> --judge-effort <E>
report --survey <record> --tag <T> --ids <G…>  --claims <F> --subdivisions <F> --judge-model <M> --judge-effort <E> [--thesis-candidates <F>]
```

**A tag selection lands at `cotags`** — there is no second row view, and no
question mediates the fork once the tag is named. **The report is an owner-entered ID set**: `--ids` carries
what the owner chose, and nothing generates reports eagerly.

**Bound the input first — `compose-input --survey <record> --tag <T>`.** Every
GroupClaim and SubGroupClaim is composed from that one tag-scoped artifact,
never from the whole survey and never from per-group material. This is not a
separate act; it is the input step. A refusal keyed to its composition pin makes
composing outside the bounded read unproducible.

**The subdivision file is a typed record per group:**

```json
{
  "<tag> × architecture": { "judged": true, "subgroups": [ { "subgroup": "…", "claim": "…", "members": ["lesson:…"], "coherence": "tight", "coherence_why": "one sentence", "legible_at_a_glance": true } ] },
  "<tag> × cost":         { "judged": true, "subgroups": [] }
}
```

**`coherence` is the judgment: three affinities and a residual.** `tight` — one
shared mechanism. `related` — a shared theme, not one mechanism. `loose` — an
affinity weaker than a theme, and still a real one. `other` — the **residual**.
Select exactly one and supply `coherence_why`, one sentence. The runtime refuses
a value outside the set **and** a label with no reason: the two are one
instrument, and a default would be the engine supplying the judgment the label
exists to carry.

**`other` is a CLAIM you are making, not a bin for leftovers.** Putting members
there asserts you looked and found no subset at loose-or-better affinity among
them. **Nothing can check that — it is your duty**, stated so you know you are
making it. Every member appears in a SubGroup you composed.

**Compose `tight` first, then `related`, then `loose`, and let what remains go to
`other` explicitly.** One pass; there is no iterative regrouping.

**The split decision is not yours at ten or more.** A composed group of 10+
members must serve SubGroups. Membership assignment stays your judgment; whether
to split does not. Below ten, `"subgroups": []` is the conformant record for a
group whose judgment **ran and found no split** — which is not the same as
omitting the group.

**The limits are not reproduced here** — the per-label caps, the minimum SubGroup
size and the residual maximum live in `report-format.json`'s `limits`, the one
place they can be edited.

**`--thesis-candidates` is optional, and omitting it is a decision you make on
the owner's behalf.** Absence renders the section with an explicit *no candidates
were composed* line — disclosed, never silent. That is a fallback, not an
invitation: **compose it unless you have a reason not to.** A JSON array of
exactly `limits.thesis_candidates` objects, each `{ "claim": "<one sentence>",
"strands": [...] }` with 2–8 display ids **every one of which is a member of the
report you are generating**. You do not supply `TC<n>` ids. **The claims are
yours and the design is not.**

## Hard lines

- **Never serve a CoTagGroups display or a Full Report without the subdivision
  judgment.**
- **Compose from `compose-input`, never from the whole survey.**
- **After a tag has been selected, never launch a question UI** (§6.3).
