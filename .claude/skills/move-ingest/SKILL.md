---
name: move-ingest
description: Ingest owner-authored Moves into moves/ — split the input, normalize to the §4.2 schema, review as judgment, present one selection screen, save what the owner accepts, regenerate INDEX. Use when the owner has written or extended a Moves file and wants Moves admitted to the library.
---

# Move ingestion

The intake for the Move library. `specs/spec-draft-pipeline/SPEC.md` §7 admits
`moves/` and `moves/INDEX.md`; §6.9 through §6.9.4 says how a Move gets there,
and this skill executes that text. **It re-opens no fork** — the file interior,
the filename, the INDEX row and the derivation vehicle are all settled there,
and arm (b) of the interior selection stays declined on §6.9.1's grounds.

**The mechanical half is `tools/move_ingest.py` and is not reimplemented here.**
Splitting, the four admission conditions, normalization, rendering and INDEX
regeneration all live there, with `--self-test` carrying a case per condition.
This file owns the half that is judgment, which is the half a script must not
hold.

## Argument handling

- **A path** — ingest that file.
- **Empty** — ingest repository-root `moves.md`, the owner's filing convention.

## The one thing to get right

**A whole-file YAML parse SUCCEEDS.** The specimen's 22 records share eight key
names, collide key-for-key, last wins, and **21 Moves are lost with no error**.
The parser cannot see this from its return value — it gets a well-formed Move.

So: the split precedes the parse, and **the parsed record count is shown at the
selection screen, always, before anything else**. It is the only instrument that
can catch `1` where the owner wrote `22`, and it is arithmetic the command
already holds, displayed rather than withheld. Never suppress it, never render
it only on a mismatch, and never compare it against a stored expectation — there
is nothing to compare against, and a human reading `22` is the whole mechanism.

## Steps

1. **Split and admit.** Run `python3 tools/move_ingest.py <input>`. It prints
   the count line and one row per record — admitted, or refused with its
   condition and the offending line named.

   A refused record does **not** stop the run: the owner sees the whole file at
   one screen, and one malformed record does not hide the other twenty-one.
   Relay refusals verbatim; do not repair the owner's file on their behalf.

   **The input is not markdown and must not be required to be.** The specimen
   carries a `.md` extension and contains zero markdown constructs — the
   extension is the owner's filing convenience, not a promise about the
   interior.

2. **Review — judgment, and nothing else.** Read every admitted proposal and
   form a view. §6.9 fixes what to look at:

   - **one transition, not an arc** — a Move that is really several proposes a
     split;
   - **separable from content** — topic-free, or it is not a Move;
   - **the `id` names the operation in established terms**;
   - **`effect` differs from `requires`** — if they restate each other, nothing
     transitions;
   - **statable invalidity** — `constraints` and `failure_modes` say when the
     Move does not apply, and are not paraphrases of `intent`;
   - **dedupe against the existing ids** — a near-duplicate proposes a `sources`
     amendment, **never a new entry**;
   - **honest `status`** — `observed` or `generalized` at extraction.
     **`validated` is never assignable here**, on any path, for any reason;
   - **`sources` naming real passages** — no fabricated citations. A `sources`
     value you cannot resolve is a finding to raise at the screen, not a value
     to improve.

   **No score, no pass/fail, no lint, no verdict machinery** (§6.9.2). Review
   produces *readings the owner acts on*, and the moment it produces a number
   the screen stops being a decision and becomes a rubber stamp. Semantic
   economy binds authoring and is applied here as judgment: one local
   transition, the five-warrant sentence test, one proposition per field,
   provenance-only `sources`.

   Review **may split or rename**. What the owner sees is therefore the
   *reviewed proposal*, not the authored record — say so on the screen wherever
   the two differ, and show what changed.

3. **One selection screen.** Present every proposal once, with per-Move
   **accept / decline / free-form**, and the count line at the top.

   **ADMISSION IS THE OWNER'S ACT AT THIS SCREEN, NEVER THE COMMAND'S.** Nothing
   self-admits — including a proposal review left untouched, and including a
   file where every record was admitted by the grammar. Write nothing to
   `moves/` before the selection.

   An id collision surfaces **here**, as review's dedupe judgment — both
   between two Moves accepted in the same batch **and** against an id already
   saved by an earlier run. `save_accepted()` refuses rather than overwriting in
   either case, seeding its collision set from `moves/` on disk, so a collision
   reaching it is a bug in this step.

   **The second-run case is not hypothetical**: the first live run of this skill
   is kogaki#177's backfill over the ~20 already-admitted Moves, which is exactly
   an ingestion into a non-empty `moves/`. Dedupe there is the whole job, not an
   edge case.

4. **Save, and write the derivation pointer in the same act.** Call
   `save_accepted(moves_dir, accepted, provenance=<prose>)`.

   Each accepted Move lands at `moves/<id>.md` — the id as the whole stem —
   with the §4.2 mapping in §4.2's order as the body, no fence and no `---`.
   `moves/INDEX.md` is then rewritten **whole** from the files on disk.

   **The derivation pointer is written here, not later** (§6.9.4). This run is
   the only moment holding an accepted Move and its served ruling line together;
   a follow-up pass would re-derive that link by guess. It goes **inside
   `sources`** — no ninth field.

   **Its form is prose provenance, not a `path:line@sha` pin** — owner decision
   at kogaki#417 D1, on the corpus's own survival measurement: 148 unpinned
   `file:line` citations broke repeatedly against 1,127 issue anchors of which
   every one survived every relocation. Do not re-litigate it per run.

   **A `sources` value may point at an analysis document, and that is the only
   legal home for an observed sequence** (SPEC §4.9, §4.9.1). If review or the
   owner notices that several Moves recur together in the source, that
   observation goes to `analysis/<source-slug>.md` as prose — **never** into a
   `sources` field as a sequence, and **never** into `moves/` as structure. The
   pointer is prose naming the passage, exactly as above; nothing in
   `tools/move_ingest.py` knows the analysis document exists, and nothing needs
   to.

5. **Report** what was accepted, declined, and refused, and name the INDEX
   regeneration. State the record count again beside the saved count — if they
   differ, say why in one line.

## Rules

- **Never admit a Move.** Every acceptance is the owner's click. A run that
  ends without the owner having selected has saved nothing, and that is the
  correct outcome.
- **Never attach a score, verdict, or lint result** to a proposal.
- **Never assign `status: validated`.**
- **Never repair the owner's input file.** Refusals are reported with the
  offending line named; editing `moves.md` is the owner's act.
- **Never compose an INDEX column.** Every column is read off a file, which is
  what makes the regeneration contract bind freshness only.
- **Never hand-edit `moves/INDEX.md`.** It is rewritten whole; an edit is lost
  at the next run and is indistinguishable from drift until then.
- Nothing reads INDEX to decide anything — it is a reader's table of contents.

## The stated residue, inherited and not repaired

**A markdown note bullet written among the items of a legal column-0 sequence is
indistinguishable from data.** Under a bare key, `- note to self` *is* a sequence
item, and no grammar can separate it from `- one`. It is admitted silently, as
content.

This is the one place §6.9.0 does not deliver "no quiet failure", and it is
written down rather than claimed away. The exposure is exact: **only** inside a
block sequence, **only** where the owner chose a sequence for a field §6.9.1a
expects to be prose, and it costs a **wrong value** rather than a lost Move.

**The selection screen is where a human sees it** — which is the same instrument
§6.9 already relies on for the record count. Do not add a lint for it; the
bound is stated so a reader knows where to look, not so a check can be written
against a case no grammar can decide.

## Downstream, so it is not re-derived

- **kogaki#177** — the ~20 already-admitted Moves carry no served pin. §6.9.4
  makes the **first ingestion run** the vehicle that backfills them, so the
  first live run of this skill is what discharges it.
- **kogaki#220 and #127** consume this library. This skill fills it and
  constructs no pipeline over it.
