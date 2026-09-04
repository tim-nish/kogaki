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

## Delivery — hand over the artifact, never a quotation of it

**There is exactly ONE producer of owner-facing text, and it is the runtime.**
You compose its *inputs* — the claims, the subdivisions, the intent sentence —
and you **hand over its output**. Retyping, summarizing, re-formatting,
tabulating or paraphrasing runtime output into your reply is **prohibited**, and
so is "quoting it accurately": accuracy is not the property; not being a second
producer is.

| what | you do |
|---|---|
| **Full Report** — `reports/FullReport.md` | `announceArtifacts` prints its path; hand **that artifact** over. Do not open the file and write its contents into your reply — that is retyping with extra steps — and `cat`-ing it into a tool call is the same delivery through the same unreliable channel with one more process in the way. |
| **CoTagGroups** — `reports/CoTagGroups.md` | the runtime writes and names it. **The printed text is not the delivery**: a tool call's stdout reaches the model, not reliably the owner. |
| **Pre-selection listings** (`tags`, `tag-rows`) | **the owner runs them.** The executor prints the invocation at its `TAG_SELECTION` stop. Hand the command over; do not run it and do not relay its output. Neither writes anything, so there is no artifact to name. |
| **Co-tag selection display** (`cotag-selection`) | same — the owner runs it. **You supply `--intent` and nothing else on that surface.** |
| **A runtime refusal** | `fail()` writes to stderr and exits non-zero. Relay that stream as it stands; never swallow it. |

**`--intent` is one sentence, and the emitter refuses** a multi-line one, one
longer than 200 characters, or one carrying table or marker syntax. The bound is
exact and the refusal is the emitter's own, not a lint.

**THE HAND-OVER IS OWED, AND ITS FORM IS YOURS.** Two properties; do not
collapse them.

- **You MUST name the artifact to the owner, as the first act after the command
  returns** — before any gate, any question, any other tool call. Writing the
  file is the runtime's act and is **not** delivery. **Delivering nothing is
  still a failure**, and silence satisfies "do not retype" perfectly, which is
  why this sentence exists.
- **HOW you name it is yours.** A pointer in your reply, an owner-executed
  `!`-prefixed command, a harness file-send — interchangeable, none required.
  What is not free is skipping it.

**There is nothing here to police, and that is deliberate.** This is a removal,
not a new duty: the relay stops being a producer, so a retyped rendering diverging
from the runtime's cannot occur rather than being caught afterwards. Do not add, or
ask for, a lint over model output — that re-creates the producer this removes in
order to have something to check.

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
  **Nothing is asked** — the executor renders no question UI.
- **A wait that declares a gate WRITES its declaration, and you render it** —
  through `AskUserQuestion`, options verbatim, nothing pre-selected, free text
  always on — then re-enter with `--capture-option` / `--capture-free-text`.
  That answer **is** the owner input for the wait. **Composing and recording are
  the engine's; deciding is the owner's; rendering is yours.**
- **An owner input is admitted by the WAIT, never by its own shape.**
- **A conditional state is entered only by `--enter`**, never scheduled.
- **A retired command refuses with a pointer** — read the refusal rather than
  working around it.
- **A resumption across a table version change is refused rather than guessed.**
  Start a fresh run directory.

## Composing the executor's inputs

**The runtime VALIDATES the typed records and never composes them.** The
judgment is yours; the ordering is the table's; the rendering is the runtime's.

The two invocations the judgment states consume:

```
cotags --survey <record> --tag <T> --claims <F> --subdivisions <F> --judge-model <M> --judge-effort <E>
report --survey <record> --tag <T> --ids <G…>  --claims <F> --subdivisions <F> --judge-model <M> --judge-effort <E> [--thesis-candidates <F>]
```

**A tag selection lands at `cotags`** — not at a second row view, and no question
mediates the fork. **The report is an owner-entered ID set**: `--ids` carries
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
making it. What the runtime *does* enforce: every member appears in a SubGroup
you composed, and a classification leaving one unplaced is refused by name.

**Compose `tight` first, then `related`, then `loose`, and let what remains go to
`other` explicitly.** One pass; there is no iterative regrouping.

**The split decision is not yours at ten or more.** A composed group of 10+
members must serve SubGroups. Membership assignment stays your judgment; whether
to split does not. Below ten, `"subgroups": []` is the conformant record for a
group whose judgment **ran and found no split** — which is not the same as
omitting the group, and omitting it is refused.

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
- **Relay the runtime's output before doing anything else** — the flow rule's
  positive limb (§2.4).
