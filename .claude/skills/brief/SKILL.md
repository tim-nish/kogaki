---
name: brief
description: Start a Brief from a settled Strand set. Use when the owner wants to begin an article Brief from LessonDisplayIDs they settled on a pulled Full Report — "start a brief", "begin a brief for L2 and L5". Creates briefs/<slug>/brief.md; never composes, never fetches Strands.
---

# Brief — the entry point

A **brief** is the working plan for one article: the served material
(Strands) the owner settled on, and the composition fields — thesis,
sequence, coverage, obligations — filled in as composition proceeds. It is
the durable document a drafting sitting resumes from. (This definition also
opens every minted document — the term is owner-facing vocabulary and is
defined where the owner reads it.)

Governing spec: `specs/spec-draft-pipeline/SPEC.md` §5.3 (v7, kogaki#482);
runtime: `brief/brief.mjs`. Everything below is that contract driven through
the harness — none of it is discretion.

**THIS SITS OUTSIDE TERRAIN.** Terrain ends at Strand exploration (owner
correction 2026-08-09). This skill starts from a set the owner has ALREADY
settled and never surveys, widens, or fetches one. If the owner has not
settled a set yet, that is Terrain's flow, not this one's.

**THE RUNTIME IS THE PRODUCER; you compose inputs and hand over its
artifact.** Never retype, summarize, or restate the minted document — name
`briefs/<slug>/brief.md` to the owner as the first act after the command
returns, exactly as the Terrain skill hands over its artifacts. A runtime
refusal is relayed as it stands, never swallowed.

## The flow

1. **Collect the settled set as `LessonDisplayID`s** (`L<n>`) — SPEC-terrain
   §14.3's join key, stable within a pin. The ids stand in the Full Report's
   member headings. **Group/SubGroup ids (`G1`, `G1-1`) are not the input**
   and the runtime refuses them by name: they are per-report-identity tokens,
   at most how the owner *found* the members on the report.
2. **Ask the owner for a slug — a gate the run BLOCKS on** (kogaki#487).
   Raise the ask through AskUserQuestion with the declaration line
   `gate: mechanical` in the question text, a free-form answer always
   offered. Options may propose candidates in ordinary vocabulary,
   lowercase-and-hyphens — the name the owner will enumerate `briefs/` by —
   but the adopted slug is **the owner's recorded answer and nothing else**.
   A denied or unanswered ask stops the flow right here. Never derive a slug
   from a machine identity, the Lessons' theme, or anything the owner did
   not answer: §5.3's slug is owner-chosen at entry, so a mint that precedes
   the answer is machine-chosen by construction.
3. **Mint** —
   `node brief/brief.mjs start --survey <survey record> --ids L…,L… --slug <slug>`.
   **The survey record is the machine-local run-workspace JSON the Terrain
   survey wrote** (default under `~/.kogaki/runs/…` — the terrain runtime
   prints its path at survey time; set `KOGAKI_DEBUG=1` there to see it).
   It is the record that assigned the `L<n>` ids, which is what makes it the
   resolver — `reports/FullReport.md` is the rendering the owner READ the
   ids off, not the record that resolves them.
   The runtime resolves each id against the survey record at its pin,
   refuses an unknown id naming both sides, refuses a slug collision
   (a creator, never an editor), and writes `briefs/<slug>/brief.md`: the
   Strands with their cites, and **every §5.1 composition field as a typed
   unfilled slot**.
4. **Hand over the artifact** and stop. Composition — thesis, steps, Moves,
   path review — is a different sitting's work and is deliberately not
   carried here (kogaki#127's promotion rule; each piece enters on its own
   surfacing run).

## Hard lines

- **The Strand set is CLOSED at mint.** Growing it is an owner act that
  routes back through Terrain — never a fetch from inside a Brief
  (`topics/articles.md:13`: the grounds test, no-unsupported-completion and
  describe-never-generate all assume the material set is fixed).
- **The Thesis is never invented at entry** — composition determines it from
  the settled set (§3).
- **No filesystem write before the owner's slug answer** (kogaki#487). The
  mint — and any write under `briefs/`, `mkdir` included — happens only
  after the owner's recorded answer to the step-2 gate exists. The observed
  failure this line repairs: `briefs/derived-artifacts/` was minted under a
  session-derived slug while the slug question was still pending in the UI.
- **`briefs/` holds Briefs and nothing else** — the durable home §5.3
  declares: a directory per Brief, tracked in the repository, the one
  product class this pipeline adds to the tree.
