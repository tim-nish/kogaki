---
name: brief
description: Start a Brief from a settled Strand set. Use when the owner wants to begin an article Brief from LessonDisplayIDs they settled on a pulled Full Report — "start a brief", "begin a brief for L2 and L5". COMPLETES the Brief in one invocation (SPEC-draft-pipeline §5.3 v19, §4.12 v22, §4.12.3 v28): entry → thesis-determination gate → mint → path composition → path review → Candidate assembly → Candidate-selection gate → the §4.12 specialization judgment → the §4.12.3 ratification gate → adoption, ending only at a filled Brief or at an owner answer that ends it. THREE owner gates: one before the mint (each Thesis with the name it gives the Brief), one at Candidate selection, and one ratifying the §4.12 specialization record before the path is written; no default mid-workflow stop. Creates theses/<slug>/brief.md only after a Thesis is adopted; never fetches Strands.
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
`src/brief.mjs`. Everything below is that contract driven through the
harness — none of it is discretion.

**THERE IS EXACTLY ONE OWNER QUESTION BEFORE THE MINT** (§5.3 v11,
kogaki#518, owner ruling 2026-08-17). The thesis-determination gate presents
each option as a **Thesis together with the name it gives the Brief**, and
adopting an option adopts both. **Never raise a slug-approval ask** — it does
not exist: no gate is registered for it, and the runtime emits no such
payload.

**"Before the mint" is the whole of that bound** (§5.3 v19, kogaki#522). The
completed flow raises **three** gates: this one, §6's Candidate-selection gate
at step 10, and §4.12.3's specialization-ratification gate at step 12
(kogaki#893). What v11 forbids is a second ask for a decision the owner has
already made — never a second decision, which is why the third one is
admissible: ratifying the specialization record is a decision nobody has been
asked for at either earlier gate.

**THIS SITS OUTSIDE TERRAIN.** Terrain ends at Strand exploration (owner
correction 2026-08-09). This skill starts from a set the owner has ALREADY
settled and never surveys, widens, or fetches one. If the owner has not
settled a set yet, that is Terrain's flow, not this one's.

**THE RUNTIME IS THE PRODUCER; you compose inputs and hand over its
artifact.** Never retype, summarize, or restate the minted document — name
`theses/<slug>/brief.md` to the owner as the first act after the mint
returns, exactly as the Terrain skill hands over its artifacts. A runtime
refusal is relayed as it stands, never swallowed.

**NOTHING EXISTS UNDER `theses/` BEFORE A THESIS IS ADOPTED.** Pre-Thesis
state is a machine run record the runtime writes (default under
`runs/brief/entries/`, gitignored — kogaki#750); the owner artifact begins exactly when the first
piece of substantive owner judgment — the Thesis — exists (§5.3 v9,
kogaki#494).

## The flow

1. **Collect the settled set as `LessonDisplayID`s** (`L<n>`) — SPEC-terrain
   §14.3's join key, stable within a pin. The ids stand in the Full Report's
   member headings. **Group/SubGroup ids (`G1`, `G1-1`) are not the input**
   and the runtime refuses them by name: they are per-report-identity tokens,
   at most how the owner *found* the members on the report.
2. **Enter** —
   `node src/brief.mjs enter --survey <survey record> --ids L…,L…`.
   **The survey record is the run-workspace JSON the Terrain survey wrote**
   (default under `runs/terrain/…`, gitignored — the terrain runtime prints
   its path at survey time; set `KOGAKI_DEBUG=1` there to see it).
   It is the record that assigned the `L<n>` ids, which is what makes it the
   resolver — `reports/FullReport.md` is the rendering the owner READ the
   ids off, not the record that resolves them.
   The runtime resolves each id against the survey record at its pin,
   refuses an unknown id naming both sides, writes the machine-local run
   state, and emits the **thesis-determination gate's declaration**: 2–3
   Thesis candidates composed from the settled set only, each in plain
   register with its round-trip concession stated, **each paired with the
   name it gives the Brief** (derived from that candidate's own Thesis).
3. **Raise the thesis-determination gate** (`src/gate-registry.json:
   brief-thesis-adoption`) through AskUserQuestion — **the only owner
   question before the mint** — offering exactly what the runtime declared:
   the composed candidates, each with its name **in the option label**, set
   off and named as the runtime writes it (the **bare** name, never a
   `theses/…` path — render it where the runtime put it and add no body entry
   of your own, so the name renders once; the site moved there at kogaki#567,
   which is where that move's standing is read); the premise's negation as a
   first-class option ("the settled set is what should change — back through
   Terrain, never a Brief fetch"); and free text (the owner's own Thesis,
   taken verbatim). Say in the question
   that the name can be changed in the same answer: an owner who wants a
   listed Thesis under a different name says which option and what name,
   and keeps the option. **No owner answer, no next step** — the gate blocks
   and nothing exists under `theses/`.
4. **Adopt the pair** —
   `node src/brief.mjs adopt --run-state <path> --thesis <candidate id | the owner's free text> [--slug <the owner's name>]`.
   Pass `--slug` only when the owner named a different one at the gate;
   with it omitted, the adopted candidate's own paired name stands, and a
   free-form Thesis derives its name from the owner's words. The runtime
   raises no ask here and none follows.
5. **Mint** — `node src/brief.mjs mint --run-state <path>`.
   The mint consumes the adopted **(Thesis, name) pair** from the run state.
   **Never pass it a name** — the owner's name is already settled, and a name
   supplied here would be a decision the owner was not asked for. The runtime refuses without an adopted
   Thesis, refuses a collision (a creator, never an editor), and writes
   `theses/<slug>/brief.md`: the Strands with their cites, **`thesis` filled
   at mint by construction**, and every downstream §5.1 composition field as
   a typed unfilled slot.
6. **Name the minted artifact** — `theses/<slug>/brief.md` — and **keep
   going**. The mint is the middle of this invocation, not its end.
7. **Compose 2–3 Reader Paths** over the settled set: for each, the §4.1 Step
   records with their materials, purposes, reader states, `depends_on`,
   rationale and §4.4 grounds, plus **a Move binding on every Step** — §4.1
   v18 (kogaki#642): the Move is a Step's State component, and `validateSteps`
   refuses a Step without one, so a Move-less Candidate is unwritable rather
   than degraded. §7.5's no-mandatory-Moves rider is superseded there by name.
   Bind from the **existing** library; minting a Move is not this workflow's
   act (§7.5's never-minted rider stands), so a transition that types against
   no entry is the reopen trigger §4.1 names and is raised, never papered over
   with a filler entry.
   Carry **`introduces`** on any Step that puts a term or concept in front of
   the reader for the first time (§4.13, optional) — one entry per line, the
   term bare, or `term — one-line meaning anchor` where the Step's own grounds
   do not already supply the meaning. Do **not** compute what the reader
   already knows: the harness derives that as the union of the earlier Steps'
   entries, always computed and never stored, so a Step that declares its own
   introductions is the whole of what you owe. What it buys is that an
   unintroduced term becomes **addressable** — responsibility lands on the
   first Step carrying it, or on the Brief when no Step does.
   The Candidates differ in **reader experience** (§6), Journey register
   included (§6.1). Write them to the run workspace as the composed-Candidates
   JSON.
8. **Review each path** across the six areas `src/review.mjs` names
   (`grounds_test`, `entailment`, `prohibitions`, `semantic_economy`,
   `arc_integrity`, `evaluation_levels`), then
   `node src/review.mjs attach --candidates <json> --review <json> --brief theses/<slug>/brief.md --out <reviewed.json>`.
   Review does **not** fail a Candidate — see the revise routing below.
   **`--brief` is required, and it is what makes §4.11's bound countable**
   (kogaki#894): the slug names the run workspace `runs/brief/<slug>/`, where
   the attach records each Candidate's rounds. Do **not** carry the count
   yourself — the runtime refuses a third attach and states each Candidate's
   round tally in its own output, so re-running the attach with the same
   reasoning costs nothing and attaching *different* reasoning is what spends
   the revise round.
9. **Assemble the selection payload** —
   `node src/assemble.mjs assemble --reviewed <reviewed.json> --brief theses/<slug>/brief.md --out <selection.json>`.
   The runtime refuses a payload whose rendering leaks an internal identifier
   or a section reference; relay that refusal and fix the wording at source.
10. **Raise the Candidate-selection gate** through AskUserQuestion — the
    second of three owner questions (§4.12.3 added the third, kogaki#893) — rendering the payload's `rendering`
    entries and nothing else, per the rendering contract below. Since
    kogaki#859 that rendering is **empty**: nothing goes on screen above this
    question, yours included. Carry the
    premise's negation as a first-class option ("none of these — the Thesis or
    the settled set is what should change", §6), and free text.
11. **Judge the adopted path's Step↔Move instantiation** (§4.12) — a
    MANDATORY occasion with no skip, and yours: for **every** Step of the
    Candidate the owner chose, read its Move's `requires`/`effect` in
    `moves/<id>.md` and judge whether that Step's `reader_state_before` and
    `reader_state_after` are consistent **specializations** of them for this
    reader and these Strands. Record one verdict per Step — `consistent`,
    `contradicts`, or `cannot-determine`, with one sentence of why — in the
    shape `src/specialization-schema.json` declares. `cannot-determine` is a
    real answer and not a way past the gate: it refuses exactly as
    `contradicts` does, and saying so is better than a `consistent` you did not
    reach. **The runtime composes no verdict here and fills no default** — it
    validates your record and refuses without one, so there is nothing to
    inherit by leaving the flag off.
12. **Raise the specialization-ratification gate** (§4.12.3) — the THIRD and
    last owner question, and the only one after the Candidate is chosen.
    `node src/assemble.mjs ratify-specialization --brief theses/<slug>/brief.md --reviewed <reviewed.json> --candidate <id> --specialization <specialization.json>`
    composes the run declaration and prints the record: every Step, the Move it
    instantiates, its verdict, and the sentence you wrote. **Render exactly
    what it printed** — do not retype, summarize or re-order it; a gate whose
    evidence is retyped is a gate over the retyping. Then ask the
    declaration's question through AskUserQuestion, with its two options
    (`ratify` / `not-ratified`) and free text, and record the answer:
    `node src/assemble.mjs ratify-specialization --capture --tool-use-id <the AskUserQuestion tool_use_id> --option <ratify|not-ratified>` plus the same four flags.
    **The verdicts above are yours, and this is what stops them being the only
    thing between you and the write.** A record every one of whose verdicts
    reads `consistent` unlocks the Brief, and you composed it — so the owner
    reads it before it lands. **`not-ratified` is a real answer**: it is
    recorded, adoption refuses naming it, nothing is written, and the Steps the
    owner disagreed with are re-judged. A free-text answer is a comment and
    never a ratification.
    **The gate is raised over a record that already PASSES.** If the command
    refuses instead of declaring, your record does not pass §4.12 — repair the
    record, not the gate, and nothing reaches the owner.
13. **Adopt the owner's Candidate** —
    `node src/assemble.mjs adopt-candidate --brief theses/<slug>/brief.md --reviewed <reviewed.json> --candidate <id> --specialization <specialization.json> --ratification <the capture path the step above printed>`.
    Its Reader Path becomes the Brief's sequence; `thesis_closure` and
    `tradeoffs` fill from its reasoning. **With no owner answer nothing lands**
    — the runtime refuses, at the selection gate and at the ratification gate
    alike: without `--ratification` it refuses even a record whose every
    verdict passes, naming the gate and this flag (§4.12.3). It also refuses a Step whose `move` resolves to no
    record in `moves/` (§4.12), naming the Step and the id: bind an admitted
    Move, or admit the Move to the library first — the library grows by an
    admission act, never by a Brief naming an id. Relay either refusal and fix
    it at source; nothing is written to the Brief.
    The library is `moves/` **relative to the working directory**; add
    `--moves-dir <dir>` when driving from anywhere but the repository root, and
    note that `draft.mjs` takes the same flag for the same reason. A store it
    cannot read refuses as a store fault naming no Step — that is a wrong
    working directory, not a wrong Brief.
14. **Hand over the filled Brief** and stop. This is the end of the arc: name
    `theses/<slug>/brief.md` to the owner and never retype, summarize or
    restate it. The run's per-block Brief snapshots (before/after each
    landing write) sit at `runs/brief/<slug>/snapshots/` — in the tree,
    gitignored, and pruned to the last K runs by the next run (kogaki#750).

**THE INVOCATION ENDS AT A FILLED BRIEF, NEVER BEFORE** (§5.3 v19,
kogaki#522, owner ruling 2026-08-18). A command is named for the artifact it
completes and runs until that artifact is complete; `/brief` completes a Brief,
it does not create a Brief template. **A human gate is not a stop** — raise it
and continue on the answer. The only other legitimate ending is an owner answer
that ends the run: the premise's negation at any of the three gates, or "none of
these" at selection. At the ratification gate that negation is `not-ratified`,
and it ends the run the same way — the answer is recorded, adoption refuses
naming it, and nothing is written.

**There is NO named inspection-need in this flow, and that was checked rather
than assumed.** A legitimate mid-workflow stop exists only where the owner must
leave the conversation to read another console or surface before the next gate
can be answered honestly — Terrain's co-tag inspection is the precedent. No gate
here is such a point: all three are answerable from what the runtime renders
into them, the ratification gate included — `ratify-specialization --declare`
prints the record verdict by verdict, so the owner reads it in the conversation
rather than leaving to find it. If a later sitting finds one, it names the stop **there** with its
ground; it never restores a default stop.

**The specimen this replaces:** the 2026-08-18 dogfood run ended after the mint
with every composition field an unfilled slot, and the owner typed "keep going".

**When a Draft comes out strange, the first suspect is recorded** (kogaki#549).
Every Step field is LLM-authored with no harness — `validateSteps` checks shape
only, and no content conformance is checked outside path review's judgment. The
statement lives at the top of `src/path-review-agent.md`, which is where a
sitting diagnosing a Draft defect is already reading.

**Where a path review's finding goes** (SPEC §4.11, kogaki#524). Path review
is not a check and it does not fail a Candidate: when it finds a gap between
two adjacent Steps, that Candidate routes **back to composition**, a Bridge
Step is inserted, and the path is **re-reviewed** — then assembly. The routing
is bounded at **one revise round** per Candidate; a Candidate whose gap
survives its revise carries the residue to the selection gate rather than
looping. **The Harness counts the round** (kogaki#894): `attach` records each
Candidate's attaches in `runs/brief/<slug>/review-attach-ledger.json`, refuses
a third naming the Candidate and the attaches it counted, and writes the
residue entry itself onto a Candidate at the bound. The bound used to live in
the composing sitting's memory, which is to say nowhere a later act could
read — a Candidate re-reviewed three times reached assembly with no refusal
and no disclosure. **The residue entry is not yours to declare**: a Candidate
arriving with its own `revise_residue` is refused, for the reason `bridges`
one field over is model-declared and this is not. A Bridge Step mints **no Move** — it is an ordinary §4.1 Step
recognised by its insertion contract, so nothing here reaches the Move
substrate. Approval is **post-hoc**, and **its disclosure carrier is currently absent**:
there is no per-Bridge question, and the bridge disclosure it relied on rode
the Candidate-selection gate's evidence rendering, which kogaki#859 emptied.
The bridges are still derivable per Candidate from the composed path; nothing
records them in the payload and nothing shows them to the owner. This is a real consequence of that ruling
rather than an oversight in it, and it is carried as its own decision — see
`specs/spec-draft-pipeline/SPEC.md` §4.11.

## Rendering contract — the owner reads plain register

**The schema is internal; every owner-facing rendering is prose**
(`specs/spec-draft-pipeline/SPEC.md` §5.1.3, owner ruling 2026-08-20,
kogaki#566). A record may carry fields and this pipeline's records do — what
reaches the owner is written as ordinary prose, with no field label opening it.
Where a schema-style presentation reaches a surface at all it carries **at most
three fields**; beyond that the presentation defeats natural line breaks and
stops being readable. **This binds all three gates, not only the one it was
found at**: the thesis-determination gate's options, the Candidate-selection
gate's rendering and §4.12.3's per-Step record rendering are the same surface
class, and the §6 half's own carrier is
kogaki#568. What the mint records is the adopted **claim** — the sentence
saying how the other settled members serve it is gate scaffolding and does not
survive into the Brief.

Every ask this pipeline raises through AskUserQuestion is rendered from a
runtime payload, and **the payload has two halves that must not be
confused**: a machine-local *record*, which keeps the internal field names
so the run stays reconstructible, and a *rendering*, which is the only thing
a human ever sees.

- **Render the payload's `rendering` entries and nothing else.** They are
  printed in order, verbatim, as prose — nothing summarized, reordered or
  re-titled, and **never turned into a field list** (no heading per entry, no
  bold label, no table): plain words in a field layout still read as a form,
  and §5.1.3 governs the shape as well as the words.
- **At the Candidate-selection gate the `rendering` is EMPTY, so you print
  nothing above the question** (owner ruling 2026-09-04, kogaki#859). The gate
  is the options and nothing else: one option per Candidate labelled by its
  reader experience, the premise's negation, free text. The rule above still
  governs — it simply has nothing to carry here.
  **This is a prohibition on YOUR prose, not only on the payload's.** The
  measured defect was ~20,000 characters of Harness-composed evidence above a
  question whose labels decide it; a session that removed the payload's half
  and wrote its own summary in its place would reproduce it exactly. Do not
  introduce the Candidates, do not compare them, do not explain what the
  reasoning was — and note the payload does not carry it for you to relay: the
  reasoning stays in `reviewed.json` and the Candidates file, where a later act
  reads it if one needs to.
- **Never show an internal key name.** `thesis_closure`, `placement_count`,
  `grounds_test` and their siblings are this codebase's names for the
  record's fields, not the owner's names for anything. They stay in the
  payload's inputs — `reviewed.json` and the Candidates file — which the gate
  neither displays nor copies. Since kogaki#859 the
  Candidate-selection gate displays no evidence at all, so this rule binds
  there through the option **labels** — the reader-experience prose — and
  through any line you were tempted to add. The plain questions the labels
  used to carry ("Does the path close the claim?") are retained in the code's
  label table against a later ruling restoring one item, and reach the owner
  nowhere today (kogaki#520, kogaki#859).
- **Never show a section reference.** A pointer into a spec (`§6.1`) is a
  term of art to a reader who does not hold the spec.
- **The runtime denies a leak; it does not repair one.** `src/assemble.mjs`
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
- **`theses/` holds Briefs and nothing else** — the durable home §5.3
  declares: a directory per Brief, tracked in the repository, the one
  product class this pipeline adds to the tree.
