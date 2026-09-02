---
name: terrain
description: Survey the served material and let the owner select article Strands. Use when the owner wants to browse the substrate for article material, "run terrain", "survey the strands", or asks what material exists without naming a story yet.
---

# Terrain — the survey/selection surface

Terrain is the entry point for browsing served material when the owner
cannot yet name a story. Governing spec: `specs/spec-terrain/SPEC.md`;
runtime: `src/terrain.mjs`. Everything below is that spec's three
contracts driven through the harness — none of it is discretion.

**DELIVER THE ARTIFACT THE RUNTIME WROTE, NEVER A QUOTATION OF IT**
(SPEC.md §14.4; kogaki#319, kogaki#347). There is exactly ONE producer of
owner-facing text, and it is `src/terrain.mjs`. You compose the runtime's
*inputs* — the claims, the subdivisions — and you **hand over its output**. You
never re-type it.

- **The Full Report: name `reports/FullReport.md`.** The runtime names it for
  you — `announceArtifacts` prints `Full Report — READ THIS ONE (owner
  rendering, SPEC.md §12.2): <path>`. Hand that artifact over. Do not open the
  file, read it, and write its contents into your reply; that is retyping with
  extra steps, and `cat`-ing it into a tool call is the same delivery through
  the same unreliable channel with an extra process.
- **The Screen: name `reports/Screen.md`.** A Screen is the rendering written
  AFTER a tag has been selected — nothing else (§6.0, owner ruling 2026-08-28,
  kogaki#682) — so it has exactly ONE writing state, `cotag_screen`, and no
  second (the neighborhood rides the Full Report since §13.1 v20). It writes its
  rendering to `reports/Screen.md` and prints the line `Screen — READ THIS ONE
  (owner rendering, SPEC-terrain §14.4.1): <path>`. That file is the rendering.
  **Do not treat the printed screen text as the delivery** — a tool call's
  stdout is displayed to the model, not reliably to the owner, which is the
  defect §14.4.1 (v18) was ruled against.
- **The pre-selection listings are the OWNER'S to run, and you do not run them
  for them** (§6.0). The executor's `TAG_SELECTION` stop prints the invocation:
  `node src/terrain.mjs tags --survey <record>`, and
  `tag-rows --survey <record> --tag <T>` when the owner asks to browse rows.
  **Hand the command over; do not execute it and do not relay its output.**
  Running it yourself puts the rendering back on the channel this arm exists to
  avoid — the same stdout defect one step down — and relaying it is the
  retyping §14.4.1 v19 replaced. Neither command writes anything, so there is
  no artifact to name for either.
- **A runtime refusal is delivered the same way and is never swallowed.**
  `fail()` writes to stderr and exits non-zero. Relay that stream as it stands.
- **Retyping, summarizing, re-formatting, tabulating or paraphrasing runtime
  output into your reply is PROHIBITED.** So is "quoting it accurately" —
  accuracy is not the property; not being a second producer is. **Handing over
  an artifact is not retyping it**, which is why the hand-over below is
  permitted by the very clause that prohibits the relay: §14.4.1 narrows
  §14.4, it does not repeal it.

**THE HAND-OVER IS OWED, AND ITS FORM IS YOURS** (SPEC.md §14.4.1). Two
properties, and they are separable — do not collapse them:

- **You MUST name the artifact to the owner**, as the **first act after the
  command returns** — before any gate, any question, any other tool call. This
  is §2.4's positive limb (v19) and §6.3 act 1. Writing the file is the
  runtime's act and is **not** delivery: a run that produces `reports/Screen.md`
  and tells the owner nothing has produced exactly the state kogaki#434 was
  filed against. **"Delivering nothing is still a failure" discharges on the
  HAND-OVER, never on the write.**
- **HOW you name it is yours, and this skill fixes no form.** A pointer to the
  path in your reply, an owner-executed `!`-prefixed command, a harness
  file-send — these are interchangeable and none is required. §14.4.1 makes the
  mechanism non-normative on purpose, and a projection that picked one would
  re-import the harness binding the ruling removed. **What is not free is
  skipping it.**

Whether the owner then *reads* the artifact is outside every carrier here —
but that is a statement about the owner, not a discharge for you.

**WHY THERE IS NOTHING HERE TO POLICE.** This is a REMOVAL, not a new duty
(§14.4: *"nothing new is prohibited, so nothing new has to be policed"*). The
relay stops being a **producer** of owner-facing text, so the class of defect
where a retyped screen diverges from the screen cannot occur — rather than
being caught after it occurs. Do not add, and do not ask for, a lint over model
output: that is the detect-side answer this decision declined, and it would
re-create the producer it removes in order to have something to check.

**THE SPECIMEN THIS REPLACES.** The 2026-08-09 hands-on transcript carried two
lines fused **mid-token** — a SubGroup header claiming `(6 Lessons: …)` spliced
into a 19-member SubGroup's list, and a claim line splicing into a different
group's claim. A runtime cannot fuse two lines mid-word. A model retyping a
screen can, and the 2026-08-06 run lost three merged contracts (member IDs,
SubGroup verdicts, ABNORMAL markers) the same way. The earlier form of this
rule asked the relay to retype *faithfully*, which is advisory at exactly the
layer where it breaks.

**Delivering nothing is still a failure.** The artifact reaches the owner as
the FIRST act after the command returns — before any gate, any question, any
other tool call. The 2026-08-07 run produced the whole `architecture` co-tag
screen and never showed it: the flow moved straight into a question UI and the
owner saw nothing. Silence satisfies "do not retype" perfectly, which is why
this sentence is here.

## Invoking the executor

**There is ONE entry point, and the ORDER IS NOT HERE** (SPEC.md §15;
kogaki#625, kogaki#654). The flow's sequencing — which state runs when, where
the run stops, which states are conditional, what ends a run — is read from
`src/workflow.json` on every run and is held **nowhere in this
file**. This section is how to invoke the executor; it is not a description of
what the executor will do, and a reader who wants that reads the table.

```
node src/terrain.mjs run [--run-dir D] [--workflow F]
node src/terrain.mjs run --run-dir D --input '<what the owner said>'
node src/terrain.mjs run --run-dir D --enter <STATE>
node src/terrain.mjs run --run-dir D --status
```

- **The executor stops; the owner speaks; you re-enter.** At a wait the
  runtime prints where it stopped and what the owner supplies, and the run
  ends there. Re-enter with `--input`. **Nothing is asked** — the executor
  renders no question UI, and §6.3's question allowlist for the post-tag window
  stays empty.
- **A wait that declares a gate now WRITES its declaration, and you render it.**
  The executor composes the run declaration and names its path; you render it
  through `AskUserQuestion` exactly as declared — options verbatim, nothing
  pre-selected, free text always on — and re-enter with
  `--capture-option <id> --tool-use-id <id>` (or `--capture-free-text`). That
  answer IS the owner input for the wait: there is no separate adopt, ratify or
  capture act, because there is no separate command left to perform one.
  **Composing and recording are the engine's; deciding is the owner's and
  rendering is yours.**
- **Six commands are gone and refuse with a pointer.** `claim`, `adopt`,
  `subdivide`, `act`, `gate` and `capture` are states of the table, reachable
  only through `run`. If you reach for one, its refusal names the state and the
  invocation that gets you there — read it rather than working around it.
- **An owner input is admitted by the WAIT, never by its own shape.** An
  `--input` with no outstanding wait is refused, and so is one naming a state
  the run is not awaiting.
- **A conditional state is entered only by `--enter`**, never scheduled. The
  table marks which states those are.
- **`--status` reads a run's counts from its record alone**, beside the
  baseline derived from the table's states array. It is a read; the registered
  check `check-terrain-workflow.sh` is what refuses on a disagreement.
- **A resumption across a table version change is refused rather than
  guessed** — start a fresh run directory.

**WHY THIS FILE CARRIES NO STEP LIST.** It used to carry seven numbered steps,
a stop instruction and an enumeration of the acts remaining after a tag was
named. Those were a **second copy** of a sequencing the table already held, and
a second copy is not documentation — it is a surface that can disagree with the
one the executor reads, silently, while looking authoritative. The removal is
the repair; re-adding a step list here would re-create exactly the divergence
`workflow.json` exists to make impossible.

## Composing the executor's inputs

**This is what the skill still owes: the runtime VALIDATES the typed records
and never composes them** (SPEC.md §15.6). The judgment is yours; the ordering
is the table's; the rendering is the runtime's. The invocation forms below are
the ones the judgment states consume — `cotags --survey <record> --tag <T>
--claims <F> --subdivisions <F> --judge-model <M> --judge-effort <E>` for the
co-tag screen, and `report --survey <record> --tag <T> --ids <G…> --claims <F>
--subdivisions <F> --judge-model <M> --judge-effort <E>
[--thesis-candidates <F>]` for the Full Report, whose ID set the owner enters.
**Nothing on either line is optional, with ONE declared exception**, bracketed
above rather than left for you to discover.

   **`--thesis-candidates` IS THE EXCEPTION, and omitting it is a DECISION you
   are making on the owner's behalf** (§12.3, kogaki#760). Absence is legal and
   renders the section carrying an explicit *no Thesis candidates were composed
   for this pull* line — it is disclosed, never silent, so an owner can always
   tell a pull you composed none for from one where the section does not apply.
   That is the fallback and not an invitation: the section exists to give the
   owner an early image of the Theses this Strand set supports, and **compose it
   unless you have a reason not to.**

   Compose it as a JSON array of exactly `limits.thesis_candidates` objects
   (initially 3, read from `src/report-format.json` — the count
   is EXACT, and a different length refuses the render):

   ```json
   [
     { "claim": "<one sentence>", "strands": ["L6", "L32", "L173"] }
   ]
   ```

   Each `strands:` list holds **2 to 8** display ids and **every one must be a
   member of the report you are generating** — an id that resolves elsewhere in
   the survey record is refused by name. You do not supply `TC<n>` ids; the
   runtime mints them positionally. **The claims are yours and the design is
   not**: every rendered line is a fixed grammar class, and the section
   constrains the Brief's eventual Thesis not at all.

   **THE SUBDIVISION FILE IS A TYPED RECORD PER GROUP** (§12.1 v9,
   kogaki#199). Compose it as:

   ```json
   {
     "<tag> × architecture": { "judged": true, "subgroups": [ { "subgroup": "…", "claim": "…", "members": ["lesson:…"], "coherence": "tight", "coherence_why": "one sentence", "legible_at_a_glance": true } ] },
     "<tag> × cost":         { "judged": true, "subgroups": [] }
   }
   ```

   **`coherence` IS THE JUDGMENT: THREE AFFINITIES AND A RESIDUAL** (§8 v30,
   kogaki#683; reworked at kogaki#738). `tight` — the members share one
   mechanism. `related` — they share a theme, not one mechanism. `loose` — an
   affinity weaker than a shared theme, and still a real one. `other` — the
   RESIDUAL, the members you could place nowhere. Select exactly one and supply
   `coherence_why`, ONE sentence.
   The runtime **refuses** a value outside the set and refuses a label with no
   reason: the two are one instrument, and a default would be the engine
   supplying the judgment the label exists to carry. It REPLACES
   `composes_honestly` / `tighter_than_parent`, which are gone. <!-- retired-vocab-ok: states they are gone. -->

   **`other` IS A CLAIM YOU ARE MAKING, not a bin for the leftovers.** Putting
   members there asserts you looked and found no subset of M or more at
   loose-or-better affinity among them. Nothing can check that — it is your
   duty, stated so you know you are making it. What the runtime DOES enforce is
   that **every member appears in a SubGroup you composed**: a classification
   leaving any member unplaced is refused, naming the members it left. There is
   no catch-all; the engine composed one until kogaki#738 and stamped it with a
   verdict nobody reached.

   **AND THE RESIDUAL IS CAPPED.** `other` is not somewhere to park members: a
   classification whose residual exceeds N is refused, naming the remainder
   count against N, and you compose more SubGroups until it fits.

   **COMPOSE `tight` FIRST, then `related`, then `loose`, and let what is left
   go to `other` explicitly.** The weaker labels are permitted and never
   required. A single pass — there is no iterative regrouping and none is
   coming.

   **FIVE LIMITS, ALL ENFORCED** (§8, kogaki#738): a per-label member cap for
   `tight`, `related` and `loose`; a minimum SubGroup size M below which an
   affinity SubGroup is refused — **unless it holds the whole group, which is
   exempt**, so a small group can still carry one honest affinity claim rather
   than being forced into the residual; and a maximum residual size N. **The numbers
   are NOT reproduced here** — they live in
   `src/report-format.json`'s `limits` block, which is the one
   place they can be edited, and a copy in this file would be a second carrier
   for an owner-editable number. Read them there.

   **THE SPLIT DECISION IS NOT YOURS AT TEN OR MORE.** A composed group of 10+
   members MUST serve SubGroups; `"subgroups": []` for such a group is refused
   at render, engine-side. Membership assignment stays your judgment; whether
   to split does not. Below ten, a judged-empty outcome is still conformant.

   **`"subgroups": []` is the conformant record for a group UNDER TEN whose
   judgment RAN and found no split** — it is not the same as omitting the
   group, and the difference is the whole point. Omitting a group says *not judged*, which
   the co-tag path **refuses**: `report` will not mint a judge pin of `none`,
   because a report carrying `none` is indistinguishable from a run that never
   asked (§12.1 v9). **Write an entry for every composed group.**

   A bare array — the pre-v9 form — is **refused by name** rather than read as
   the old shape, so a stale composer fails loudly instead of silently getting
   back the accidental semantics that made judged-empty unrecordable.
   **This is where a tag selection lands, not a second `view --tag`.** The
   owner names a tag and the flow goes **straight here** — the tag screen's
   row view runs only when the owner asks to browse rows, and **no question
   mediates that fork** (SPEC.md §6.3; kogaki#162's fork half). A flat
   list of Lesson slugs beside a count table is what the co-tag screen
   REPLACES: it lets no image of a possible Thesis form, which is the purpose
   Terrain exists to serve (`specs/spec-terrain/SPEC.md` §6.1).

   - **FIRST, bound the input — `compose-input --survey <record> --tag <T>`**
     (kogaki#163 lever 3, story 1.33; SPEC.md §9's *"one shard pair per viewed
     tag"*). It writes one tag-scoped artifact, and **every GroupClaim and
     every SubGroupClaim is composed from that artifact** — never from the
     whole survey, never from per-group material. `material` is keyed by
     member id and `groups` carry ids only, so a member in several groups is
     read once and no group has per-group material to re-read. The same
     artifact serves the §8 judgment and spends no further read.
     Measured, not argued (tag `architecture`, PR #193's live run against
     `product-lab@12ba65dd`): composing per-group spent one served-material
     read per **placement** — 131 reads over 70 Lessons, ~19 minutes between
     naming the tag and anything appearing. Through `compose-input` the same
     tag, grown to 172 placements, spent **4** reads and 2 min 23 s. The read
     count is bounded by the CANDIDATES and does not grow with the placements.
     **This is not a separate act.** It is the input step composing `--claims`
     has always required — a composer had to read material to write them at
     all. Where it sits in the sequence is the workflow table's to say, not
     this file's: `compose_input` is a state, and the table places it.
     **This line is advisory and is NOT a carrier, and saying so is part of
     it.** A rule written into a skill file is *"advisory, real, worth
     writing, and NOT a carrier"* (`product-lab@98195e0a
     topics/articles.md:106`) — the layer where this one breaks is the
     composer's own composition step, which no artifact here owns. What IS
     carried: the bound is structural **inside** the artifact (`groups` carry
     ids only, so a per-group copy is unwritable), and
     `checks/check-terrain-composition.sh` counts the reads a stub gateway
     served and holds them fixed while the placements multiply. Neither
     observes whether a given session took the artifact at all — that gap is
     real, is named at kogaki#194, and this bullet narrows it rather than
     closing it.
   - **You compose the claims; the runtime renders them.** `--claims` is a
     JSON map from group name to that group's composed "in common:" line —
     the plain-register statement of what its members share. §7 binds the
     pinning, the gate event and the record's shape and leaves the wording to
     the composer, which is why the text arrives as an argument and is not
     invented in the runtime.
   - **Every group gets one.** A group with no claim renders an explicit
     ABNORMAL marker and nothing is substituted for it — the same discipline
     a missing Gloss rendering already gets.
   - **THE SUBDIVISION JUDGMENT IS REQUIRED — a run without it is a FAILED
     run** (SPEC.md §6.2 and §8.1; kogaki#168, owner ruling 2026-08-07). The
     verdict came back stronger than the offering §8.1's ordering
     anticipated: **REQUIRE, not offer.** SubGroups on the screen and in the
     Full Reports are a required part of the served surface, and until a run
     serves them **every Terrain run is a contract violation and is treated
     as a FAILED run** — so a dogfood verdict taken on any *other* aspect of
     such a run is a verdict on a failed specimen. This is why
     `--subdivisions` is unbracketed everywhere it appears in this skill.
   - **"Required" governs the JUDGMENT; above ten it governs the OUTCOME too**
     (§8 v30, kogaki#683). You may not skip the judgment — that is unchanged,
     and a run that never asked is still refused. **At 10 or more members the
     split is not yours to decline**: such a group must serve SubGroups, and
     `"subgroups": []` for one is refused at render. Below ten, a group whose
     only named SubGroup you label `other` renders no SubGroups and is fully
     conformant. SubGroups otherwise appear where your **coherence label** and
     §8's two disjunctive disclosures put them — **the screen judges and
     renders both**, and **refuses without a judge pin**, because a judged
     surface that records no judge cannot be seen to drift.

## Hard lines

- **Never serve a co-tag screen or a Full Report without the subdivision
  judgment** (SPEC.md §6.2/§8.1; kogaki#168). It is REQUIRED, it carries a
  judge pin, and a run that skipped it is a FAILED run whose other output may
  not be verdicted. "Required" governs the judgment, not the outcome — no
  member count, ever.
- **Compose from `compose-input`, never from the whole survey** (SPEC.md §9;
  kogaki#163). One tag-scoped shard pair per run feeds every GroupClaim and
  every SubGroupClaim. Composing per group spends one read per placement,
  which is what the ~19-minute 2026-08-07 run bought.

  **THIS LINE IS NOW ENFORCED, not merely stated** (SPEC.md §11 v10,
  kogaki#212). `compose-input` emits a **composition pin** carrying the member
  set it served per group; the claims artifact carries that pin **with** the
  claims, and `cotags` refuses claims whose members are not a **subset** of it,
  **naming the members that fall outside**. So the claims file is a typed
  record:

  ```json
  {
    "composition_pin": { "tag": "<T>", "pin": "<survey record pin>",
                         "groups": { "<T> × architecture": ["lesson:alpha", "lesson:bravo"] } },
    "claims": { "<T> × architecture": "…" }
  }
  ```

  **Copy `composition_pin` straight out of `compose-input`'s output** — do not
  hand-write it. A bare `{group: claim}` map is **refused by name**, as
  `--subdivisions` refuses its withdrawn bare array, and a pin computed against
  a different survey record is refused too rather than silently re-resolved.

  Composing a claim over a **subset** of the served members is normal work and
  is accepted; what is refused is a claim naming material the bounded read never
  served. The pin carries the **set**, not a hash, because a hash could refuse
  and could not tell you *which* member was outside.
- **After a tag has been selected, never launch a question UI** (SPEC.md §6.3).
  Never ask which co-tag group or SubGroup to open, never ask whether to run a
  step, never ask "what next". Render, then state the available acts in plain
  chat prose. Navigation is never a question — the owner navigates by naming
  things in chat, and free text reaches everything. **This bounds the
  post-selection window only**; the opening of the flow is parked design
  (SPEC.md §10) and this line makes no claim about it.
- **Relay the runtime's output before doing anything else** — the flow rule's
  positive limb above. A gate, a question, or another tool call placed ahead of
  the relay is the kogaki#164 defect.
- An act that is neither proposal (`rank`, `trim`, `hide`) nor navigation
  (`enumerate`, `sort`, `filter-by-owner`) is a **report** — the runtime
  writes it as one; never classify it yourself.
- Quote served material at the pin the seam returned; on public surfaces
  use the gloss-register renderings (founding spec rider 2).
- The run workspace (`~/.kogaki/runs/…` or `$KOGAKI_RUN_DIR`) is
  machine-local state and is **never committed** (founding spec rider 3). It
  holds things whose lifetime is the RUN. Anything whose lifetime is the
  OWNER's — `reports/FullReport.md` and `reports/Screen.md` — lives in the
  tree instead
  (`specs/SPEC.md` §2.5.1), and **never name a machine-local path on an owner
  surface outside debugging**.
- If the seam is unavailable the runtime prints one
  `policy_source unavailable:` line and stops — Terrain has no material
  without it; do not improvise material from the repository, which is
  invisible by design.
