---
name: brief
description: Start a Brief from a settled Strand set. Use when the owner wants to begin an article Brief from LessonDisplayIDs they settled on a pulled Full Report — "start a brief", "begin a brief for L2 and L5". Runs entry → thesis-determination gate → mint (SPEC-draft-pipeline §5.3 v11) — ONE owner question before the mint, carrying each Thesis with the name it gives the Brief; creates briefs/<slug>/brief.md only after a Thesis is adopted; never composes Steps, never fetches Strands.
---

# Brief — the entry point

A **brief** is the working plan for one article: the served material
(Strands) the owner settled on, and the composition fields — thesis,
sequence, coverage, obligations — filled in as composition proceeds. It is
the durable document a drafting sitting resumes from. (This definition also
opens every minted document — the term is owner-facing vocabulary and is
defined where the owner reads it.)

Governing spec: `specs/spec-draft-pipeline/SPEC.md` §5.3 (v7, kogaki#482;
**re-sequenced v9, kogaki#494** — entry → thesis-determination gate → mint;
**slug paired into the one gate at v11, kogaki#518**); runtime:
`brief/brief.mjs`. Everything below is that contract driven through the
harness — none of it is discretion.

**THERE IS EXACTLY ONE OWNER QUESTION BEFORE THE MINT** (§5.3 v11,
kogaki#518, owner ruling 2026-08-17). The thesis-determination gate presents
each option as a **Thesis together with the name it gives the Brief**, and
adopting an option adopts both. **Never raise a slug-approval ask** — it does
not exist: no gate is registered for it, and the runtime emits no such
payload.

**THIS SITS OUTSIDE TERRAIN.** Terrain ends at Strand exploration (owner
correction 2026-08-09). This skill starts from a set the owner has ALREADY
settled and never surveys, widens, or fetches one. If the owner has not
settled a set yet, that is Terrain's flow, not this one's.

**THE RUNTIME IS THE PRODUCER; you compose inputs and hand over its
artifact.** Never retype, summarize, or restate the minted document — name
`briefs/<slug>/brief.md` to the owner as the first act after the mint
returns, exactly as the Terrain skill hands over its artifacts. A runtime
refusal is relayed as it stands, never swallowed.

**NOTHING EXISTS UNDER `briefs/` BEFORE A THESIS IS ADOPTED.** Pre-Thesis
state is a machine-local run record the runtime writes (default under
`~/.kogaki/brief-runs/`); the owner artifact begins exactly when the first
piece of substantive owner judgment — the Thesis — exists (§5.3 v9,
kogaki#494).

## The flow

1. **Collect the settled set as `LessonDisplayID`s** (`L<n>`) — SPEC-terrain
   §14.3's join key, stable within a pin. The ids stand in the Full Report's
   member headings. **Group/SubGroup ids (`G1`, `G1-1`) are not the input**
   and the runtime refuses them by name: they are per-report-identity tokens,
   at most how the owner *found* the members on the report.
2. **Enter** —
   `node brief/brief.mjs enter --survey <survey record> --ids L…,L…`.
   **The survey record is the machine-local run-workspace JSON the Terrain
   survey wrote** (default under `~/.kogaki/runs/…` — the terrain runtime
   prints its path at survey time; set `KOGAKI_DEBUG=1` there to see it).
   It is the record that assigned the `L<n>` ids, which is what makes it the
   resolver — `reports/FullReport.md` is the rendering the owner READ the
   ids off, not the record that resolves them.
   The runtime resolves each id against the survey record at its pin,
   refuses an unknown id naming both sides, writes the machine-local run
   state, and emits the **thesis-determination gate's declaration**: 2–3
   Thesis candidates composed from the settled set only, each in plain
   register with its round-trip concession stated, **each paired with the
   name it gives the Brief** (derived from that candidate's own Thesis).
3. **Raise the thesis-determination gate** (`gates/registry.json:
   brief-thesis-adoption`) through AskUserQuestion — **the only owner
   question in this flow** — offering exactly what the runtime declared:
   the composed candidates, each with its name shown in the option body
   under the runtime's own label (the **bare** name, never a `briefs/…`
   path); the premise's negation as a first-class option ("the settled set
   is what should change — back through Terrain, never a Brief fetch"); and
   free text (the owner's own Thesis, taken verbatim). Say in the question
   that the name can be changed in the same answer: an owner who wants a
   listed Thesis under a different name says which option and what name,
   and keeps the option. **No owner answer, no next step** — the gate blocks
   and nothing exists under `briefs/`.
4. **Adopt the pair** —
   `node brief/brief.mjs adopt --run-state <path> --thesis <candidate id | the owner's free text> [--slug <the owner's name>]`.
   Pass `--slug` only when the owner named a different one at the gate;
   with it omitted, the adopted candidate's own paired name stands, and a
   free-form Thesis derives its name from the owner's words. The runtime
   raises no ask here and none follows.
5. **Mint** — `node brief/brief.mjs mint --run-state <path>`.
   The mint consumes the adopted **(Thesis, name) pair** from the run state.
   **Never pass it a name** — the owner's name is already settled, and a name
   supplied here would be a decision the owner was not asked for. The runtime refuses without an adopted
   Thesis, refuses a collision (a creator, never an editor), and writes
   `briefs/<slug>/brief.md`: the Strands with their cites, **`thesis` filled
   at mint by construction**, and every downstream §5.1 composition field as
   a typed unfilled slot.
6. **Hand over the artifact** and stop. Step composition, Move binding,
   path review, Candidate selection — those are the composition sittings'
   work (stories 1.73–1.75), not this entry's.

**When a Draft comes out strange, the first suspect is recorded** (kogaki#549).
Every Step field is LLM-authored with no harness — `validateSteps` checks shape
only, and no content conformance is checked outside path review's judgment. The
statement lives at the top of `brief/path-review-agent.md`, which is where a
sitting diagnosing a Draft defect is already reading.

**Where a path review's finding goes** (SPEC §4.11, kogaki#524). Path review
is not a check and it does not fail a Candidate: when it finds a gap between
two adjacent Steps, that Candidate routes **back to composition**, a Bridge
Step is inserted, and the path is **re-reviewed** — then assembly. The routing
is bounded at **one revise round** per Candidate; a Candidate whose gap
survives its revise carries the residue to the selection gate rather than
looping. A Bridge Step mints **no Move** — it is an ordinary §4.1 Step
recognised by its insertion contract, so nothing here reaches the Move
substrate. Approval is **post-hoc**: there is no per-Bridge question, and each
Candidate's evidence at the existing selection gate discloses what it bridged
and on what reasoning.

## Rendering contract — the owner reads plain register

Every ask this pipeline raises through AskUserQuestion is rendered from a
runtime payload, and **the payload has two halves that must not be
confused**: a machine-local *record*, which keeps the internal field names
so the run stays reconstructible, and a *rendering*, which is the only thing
a human ever sees.

- **Render the payload's `rendering` entries and nothing else.** Each entry
  is a `label` and its `text`. The label is shown verbatim as the heading of
  that piece of evidence; the text is shown under it, verbatim. Nothing is
  summarized, reordered, or re-titled.
- **Never show an internal key name.** `thesis_closure`, `placement_count`,
  `grounds_test` and their siblings are this codebase's names for the
  record's fields, not the owner's names for anything. They stay in the
  payload's `evidence` object, which is never displayed. At the
  Candidate-selection gate this is what the owner reads instead: "Does the
  path close the claim?", "How much of the settled material does this path
  use?", one plain question per item (kogaki#520).
- **Never show a section reference.** A pointer into a spec (`§6.1`) is a
  term of art to a reader who does not hold the spec.
- **The runtime denies a leak; it does not repair one.** `brief/assemble.mjs`
  refuses to emit a selection payload whose rendering carries an internal
  identifier or a section reference, and names what leaked. Relay that
  refusal as it stands and fix the wording at its source — the deny exists
  because a rewrite layer would let the leak keep being written, and it is
  not a substitute for writing the labels plainly in the first place.

## Hard lines

- **The Strand set is CLOSED at mint.** Growing it is an owner act that
  routes back through Terrain — never a fetch from inside a Brief
  (`topics/articles.md:13`: the grounds test, no-unsupported-completion and
  describe-never-generate all assume the material set is fixed).
- **The Thesis is composed from the settled set, never invented** — the
  candidates the gate shows are read from the set's own members (§3), and
  the owner's free-form answer is the owner's, taken verbatim.
- **The Brief's name is thesis-derived and owner-decided** — it rides the
  Thesis it derives from, and the owner settles both in one answer; never a
  machine identity (§5.3 v11; SPEC-terrain §12.2's repair kept by this route
  exactly as v9 kept it by its own). What v11 removed is the second
  interruption, never the owner's authority over the name.
- **No second ask exists.** A slug-approval question is not merely skipped
  here: nothing registers it and nothing emits it, so raising one would be
  inventing a gate rather than relaying one.
- **`briefs/` holds Briefs and nothing else** — the durable home §5.3
  declares: a directory per Brief, tracked in the repository, the one
  product class this pipeline adds to the tree.
