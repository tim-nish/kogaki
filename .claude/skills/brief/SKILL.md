---
name: brief
description: Start a Brief from a settled Strand set. Use when the owner wants to begin an article Brief from LessonDisplayIDs they settled on a pulled Full Report — "start a brief", "begin a brief for L2 and L5". Runs entry → thesis-determination gate → mint (SPEC-draft-pipeline §5.3 v9); creates briefs/<slug>/brief.md only after a Thesis is adopted; never composes Steps, never fetches Strands.
---

# Brief — the entry point

A **brief** is the working plan for one article: the served material
(Strands) the owner settled on, and the composition fields — thesis,
sequence, coverage, obligations — filled in as composition proceeds. It is
the durable document a drafting sitting resumes from. (This definition also
opens every minted document — the term is owner-facing vocabulary and is
defined where the owner reads it.)

Governing spec: `specs/spec-draft-pipeline/SPEC.md` §5.3 (v7, kogaki#482;
**re-sequenced v9, kogaki#494** — entry → thesis-determination gate → mint);
runtime: `brief/brief.mjs`. Everything below is that contract driven through
the harness — none of it is discretion.

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
   register with its round-trip concession stated.
3. **Raise the thesis-determination gate** (`gates/registry.json:
   brief-thesis-adoption`) through AskUserQuestion, offering exactly what
   the runtime declared: the composed candidates, the premise's negation as
   a first-class option ("the settled set is what should change — back
   through Terrain, never a Brief fetch"), and free text (the owner's own
   Thesis, taken verbatim). **No owner answer, no next step** — the gate
   blocks and nothing exists under `briefs/`.
4. **Adopt** —
   `node brief/brief.mjs adopt --run-state <path> --thesis <candidate id | the owner's free text>`.
   The runtime records the adopted Thesis and derives exactly **one slug
   candidate from it** — no slug exists before adoption, and there is no
   entry-time slug ask anywhere in this flow (it ceased to exist at v9).
5. **Raise the slug-approval ask** (`gates/registry.json:
   brief-slug-approval`) through AskUserQuestion: approve the derived slug,
   decline the mint (negates_premise), or override with a free-form slug
   (lowercase-and-hyphens). **No answer, no mint.**
6. **Mint** —
   `node brief/brief.mjs mint --run-state <path> --slug <approved slug>`.
   The runtime refuses without an adopted Thesis, refuses a slug collision
   (a creator, never an editor), and writes `briefs/<slug>/brief.md`: the
   Strands with their cites, **`thesis` filled at mint by construction**,
   and every downstream §5.1 composition field as a typed unfilled slot.
7. **Hand over the artifact** and stop. Step composition, Move binding,
   path review, Candidate selection — those are the composition sittings'
   work (stories 1.73–1.75), not this entry's.

## Hard lines

- **The Strand set is CLOSED at mint.** Growing it is an owner act that
  routes back through Terrain — never a fetch from inside a Brief
  (`topics/articles.md:13`: the grounds test, no-unsupported-completion and
  describe-never-generate all assume the material set is fixed).
- **The Thesis is composed from the settled set, never invented** — the
  candidates the gate shows are read from the set's own members (§3), and
  the owner's free-form answer is the owner's, taken verbatim.
- **The slug is thesis-derived and owner-approved** — one candidate, after
  adoption, never a machine identity (§5.3 v9; SPEC-terrain §12.2's repair
  kept by the v9 route).
- **`briefs/` holds Briefs and nothing else** — the durable home §5.3
  declares: a directory per Brief, tracked in the repository, the one
  product class this pipeline adds to the tree.
