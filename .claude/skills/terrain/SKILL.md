---
name: terrain
description: Survey the served material and let the owner select article Strands. Use when the owner wants to browse the substrate for article material, "run terrain", "survey the strands", or asks what material exists without naming a story yet.
---

# Terrain — the survey/selection surface

Terrain is the entry point for browsing served material when the owner
cannot yet name a story. Governing spec: `specs/spec-terrain/SPEC.md`;
runtime: `terrain/terrain.mjs`. Everything below is that spec's three
contracts driven through the harness — none of it is discretion.

**The screens and the Full Report are the runtime's renderings, SERVED
VERBATIM** (SPEC.md §2.4's flow rule; kogaki#150, kogaki#164). You compose the
runtime's *inputs* — the claims, the subdivisions — and relay its *output*
as-is. The rule has two limbs and **both** bind:

- **Never** re-render, summarize, reformat, tabulate, or paraphrase what the
  runtime printed. The 2026-08-06 dogfood run re-rendered the screen as prose
  and three merged contracts (member IDs, SubGroup verdicts, ABNORMAL markers)
  silently vanished at once.
- **Always** relay the rendering **in full, in the user-visible reply, as the
  FIRST act after the command returns** — before any gate, any question, any
  other tool call. **A runtime refusal's stderr is relayed the same way and is
  never swallowed.** The 2026-08-07 run produced the whole `architecture`
  co-tag screen and never showed it: the flow moved straight into a question
  UI, and the owner saw nothing. Relaying nothing satisfies the first limb's
  letter, which is why the second exists.

A blank reply is impossible whether the runtime printed a screen or an error.
The rule binds here because this is the layer where it can be broken.

## The flow

1. **Survey** — `node terrain/terrain.mjs survey`. Composes from the seam
   (`element_survey`, served renderings only, never gateway internals) into
   the machine-local run workspace. The completeness line prints first:
   every figure names which family it counted, and `placed of total` comes
   from the composed placements, never from the candidate list.
2. **Navigate — the tag screen** —
   `view --survey <record> [--tag T] [--family F]`.
   This is the owner moving around: enumerate, sort, filter-by-owner.
   **Navigation narrows nothing** — say so if the owner asks, and never
   present a view as a shortlist. The tag screen's axis is the served tag
   vocabulary.
3. **Navigate — the co-tag screen** —
   `cotags --survey <record> --tag <T> --claims <F>
   --subdivisions <F> --judge-model <M> --judge-effort <E>`.
   **Nothing on that line is optional** — `--subdivisions` and its judge pin
   are unbracketed because kogaki#168 made the subdivision judgment REQUIRED
   (§6.2); see the SubGroups bullet below.

   **THE SUBDIVISION FILE IS A TYPED RECORD PER GROUP** (§12.1 v9,
   kogaki#199). Compose it as:

   ```json
   {
     "<tag> × architecture": { "judged": true, "subgroups": [ { "subgroup": "…", "claim": "…", "members": ["lesson:…"], "composes_honestly": true, "tighter_than_parent": true, "legible_at_a_glance": true } ] },
     "<tag> × cost":         { "judged": true, "subgroups": [] }
   }
   ```

   **`"subgroups": []` is the conformant record for a group whose judgment RAN
   and found no leaf split** — it is not the same as omitting the group, and
   the difference is the whole point. Omitting a group says *not judged*, which
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
     **This is not a third act.** It is the input step act (1) below has
     always required — a composer had to read material to write `--claims` at
     all — so it sits **inside** act (1), exactly where §6.3 puts the
     subdivision judgment, and the two-act window is unchanged.
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
   - **"Required" governs the JUDGMENT, never the OUTCOME.** You may not skip
     the judgment; it does not follow that every group subdivides. SubGroups
     appear exactly where §8 puts them: the CONJUNCTIVE leaf condition
     (composes honestly AND tighter than its parent's) plus the two
     disjunctive disclosures — **the screen judges and renders both**, and
     **refuses without a judge pin**, because a judged surface that records
     no judge cannot be seen to drift. A group whose leaf condition fails
     renders no SubGroups and is **fully conformant**; what is refused is a
     run that **never asked**. **Never a member count.**
     A number in that decision is a defect against §8 — the owner's "five or
     more" is calibration evidence for where the undiscriminating-claim
     condition binds, not a threshold, and "required" must not be read as
     re-admitting it.
   - The screen carries **no per-Strand Gloss line and no Journey line**. That
     material is the Full Report's (§12). **No per-row pin renders either**
     (§6.1 v5) — the pin is sited once, in the Full Report.
     **This is a RATIFIED divergence, not a defect to repair** — SPEC.md §2.4
     **register entry 4** (owner selection 2026-08-07, kogaki#167,
     alternative (b)). The WA baseline this spec inherits does promise a
     gloss and a journey per row; the owner declined restoring them on screen
     size read against kogaki#168, since SubGroups being REQUIRED would
     multiply those lines across every SubGroup of every group. Do not
     "repair" it — read entry 4 first.
   - **The same act generates the Full Reports, eagerly** (§11 decided, v5,
     kogaki#146): immediately after `cotags`, run
     `report --survey <record> --tag <T> --all-groups --claims <F>
     --subdivisions <F> --judge-model <M> --judge-effort <E>` — one report
     per composed group, idempotent per identity. A co-tag view that served
     the screen and generated no reports is the 2026-08-06 defect specimen.
     **`--subdivisions` is not optional here either**: §6.2 requires SubGroups
     in the Full Reports as well as on the screen, so an all-groups run
     without it produces the exact artifact the ruling calls a failed run.
   - **ONCE A TAG IS NAMED, EXACTLY TWO ACTS REMAIN** (SPEC.md §6.3;
     kogaki#166, owner ruling 2026-08-07): **(1)** run `cotags` and relay its
     screen verbatim, **(2)** run `report --all-groups`. **Nothing else runs
     until the owner speaks in chat.** The subdivision judgment is part of act
     (1) — you judge and render SubGroups inside the screen, never as a third
     step beside it — and **`compose-input` and the claim composition it feeds
     are part of act (1) for the same reason**: they are how act (1)'s
     arguments come to exist, not a step beside it. Two acts, still two.
     **No question UI may appear in this window. None** — not
     to pick a co-tag group, not to ask "what next", not to ask for a second
     tag. Reports are eager, so there is nothing left to authorize. After the
     screen, state the available acts in plain chat prose and stop.
4. **Read in full — the Full Report** — already generated by the co-tag
   screen; `report --survey <record> --tag <T> --group <G> --claims <F>
   --subdivisions <F> --judge-model <M> --judge-effort <E>` re-resolves one
   (idempotent — same identity, same artifact).
   **Carry the subdivisions and the judge pin through the re-resolve.** A
   re-resolve without them does not re-resolve anything: judge pin `none` is
   a **different identity**, so it writes a *second* Full Report carrying no
   SubGroups — a new artifact of exactly the shape §6.2 calls a failed run,
   sitting beside the conformant one. Compose from the same `compose-input`
   artifact the screen used and it costs no further read.
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
  machine-local state and is **never committed** (founding spec rider 3).
- If the seam is unavailable the runtime prints one
  `policy_source unavailable:` line and stops — Terrain has no material
  without it; do not improvise material from the repository, which is
  invisible by design.
