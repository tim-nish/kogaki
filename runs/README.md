# `runs/` — where every lane's run intermediates live

**Purpose.** This directory holds the machine state a run produces: survey
records, proposal records, gate declarations and captures (Terrain), Brief and
Draft workspaces with their snapshots, packets and run records. It is the one
home for all of it. Before kogaki#750 the same material accumulated under
`~/.kogaki`, where nothing pruned it and nobody read it — 187MB by the time it
was measured, in directory families no contributor knew existed.

**Layout.** One subdirectory per lane, and the lanes are a closed set:

    runs/terrain/terrain-<timestamp>/   one run workspace per invocation
    runs/terrain/reports/               report records, keyed by identity digest
    runs/brief/<slug>/                  one workspace per Brief, overwritten in place
    runs/brief/entries/<timestamp>/     pre-Thesis run records, bounded separately
    runs/draft/<slug>/                  one workspace per Draft, overwritten in place
    runs/review/<slug>/                 one workspace per reviewed Draft, overwritten in place
    runs/project/<slug>/                one workspace per projected Article, overwritten in place

Terrain mints a new directory per run because a survey has no identity to
overwrite; Brief, Draft, Review and Project key on the slug, so a re-run over
the same Draft replaces its own workspace rather than adding one.

`runs/project/<slug>/run.json` is Projection's own run record (`src/project.mjs`,
kogaki#1149): the reviewed Draft's path, the profile, the Article it wrote,
the source body sha, every converter that fired and its count, and whether
that run's own recoverability check passed. It is the machine-local twin of
`theses/<slug>/projection.md`'s `## Record` section, which is the owner-facing
half — this workspace exists for the same reason `runs/review/<slug>/` does:
so a re-run's evidence has a home that is not the artifact itself.

`runs/brief/entries/` is the exception, and it exists because the Brief lane
holds two kinds of thing with two lifetimes. Before a Thesis is adopted there is
no slug to key on, so `brief enter` writes a timestamped record and one arrives
per invocation; a slug workspace, by contrast, lives as long as its Brief is
being worked. Under one budget the front door would evict the work — ten entries
and every Brief in flight loses its snapshot trace — so the entries sit in their
own directory, exempt from the lane's prune and bounded inside it. `runs/terrain/reports/` is
the one entry pruning never touches — a report is identified by its digest, and
running the same identity twice is ONE report (SPEC-terrain §12.1), which a
pruned-and-timestamped home would make false.

## The review lane, file by file

`review-draft` is the one lane whose workspace is split by PASS, and the split is
its contract rather than a convention: every pass writes only under its own
directory, and a write that would land on a file another pass wrote is refused by
name. Pass one is `compare`, pass two is `check`, and a later third pass would be
`pass-3/` with nothing else moving.

    runs/review/<slug>/pass-1/{outline-input,outline,join,corrections,join.json}
    runs/review/<slug>/pass-2/{outline-input,outline,join,check.json}
    runs/review/<slug>/snapshots/
    runs/review/<slug>/run.json

Every file below, with who writes it, what it is the input to, and what reads it.
`<pass>` is `pass-1` or `pass-2`; both passes write the first three.

| File | Writer | Input to | Read by |
|---|---|---|---|
| `<pass>/outline-input/<step>.md` | `outline`, before the Step is read | the **Blind Reader** — the model that writes the Reverse Outline, which meets the Step's prose and nothing from the Packet that produced it | nobody else; `outline` refuses a Step whose input it did not render |
| `<pass>/outline/<step>.md` | `outline`, recording the reply | — | kept as the Reverse Outline exactly as it was written, beside the parsed form |
| `<pass>/outline/<step>.json` | `outline`, parsing that reply into the Brief's field names | `compare` and `check`, which join it against the Step's declared side | the owner record's evidence pointers |
| `<pass>/outline/<step>.figure.json` | `outline`, on a Step whose reader met a figure | the figure's own Round Trip | the same pointers, for a `figure_only` row |
| `<pass>/join/<step>.<item>[.<pair>].md` | `compare` (pass one) and `check` (pass two) | the **Judge** — one pair, one fixed question, one of `holds`/`fails`/`cannot-decide` plus a sentence | the owner record, which points a residue line at the Packet its verdict was given on |
| `pass-1/corrections/<step>.md` | `correct`, rendering the input a correction is written from | the realization lane (`draft.mjs`), which re-realizes the Step | `correct` refuses a record not written against a rendered input |
| `pass-1/corrections/<step>.figure.md` | `correct --figure`, the same for the figure seat | `draft.mjs figure`, which re-designs the figure record | the same refusal |
| `pass-1/join.json` | `compare`, when every pair is answered | — | `check`, which carries pass one's rows for Steps it does not re-judge; `close`, which composes the owner record from it |
| `pass-2/check.json` | `check`, when its own pairs are answered | — | `close` |
| `snapshots/NN-{before,after}-<step>[.figure].md` | `correct`, around each correction | — | a reader asking what a correction moved; the Draft itself is the artifact |
| `run.json` | every act | — | every act: it holds the Draft, the body sha, the pass, the bound, the findings, the residue and the register of every path the Harness wrote |

**`join.json` and `check.json` are the surface to debug a run from.** Every row
carries the item, its class, the verdict, the reason, the span, `judged` —
whether a Judge was asked at all — and the model that answered where one was,
with every pair's own answer under `pairs`. A `comparison/` directory rendering
those rows as prose stood in each pass until kogaki#1134 removed it; it was a
legend plus one line per pair restating the record beside it.

**The owner-facing outputs are not here.** `close` writes `theses/<slug>/review.md`,
the record the owner reads and classifies residue in, and
`theses/<slug>/draft.reviewed.md`, the corrected article — and it restores
`theses/<slug>/draft.md` to the Draft the run reviewed. Everything under
`runs/review/` is the evidence those two point back at.

**Lifetime — read this before relying on anything here.** Everything under
`runs/` is machine state with the lifetime of a run, and **`rm -rf runs/` is
always safe**. Nothing an owner is meant to read lives here: the Full Report
rendering lands in `reports/`, a Brief in `theses/<slug>/`, a Draft where the
Draft command writes it. If something you need can only be found under `runs/`,
that is a defect in the lane that wrote it, not a reason to keep the directory.

**Growth is bounded in-band.** Each run, as its first act, prunes its own lane
back to the last K runs, K from `src/runs.json`. A lane never prunes another
lane. There is no scheduler and no background reader: the bound holds exactly
when a run runs, which is also the only time it can be exceeded. Deleting
anything here by hand stays available and needs no ceremony.

**Tracked and untracked.** This README is the only tracked file under `runs/`;
`.gitignore` excludes everything else. The material is machine-facing and
derives from uncommitted survey records, so committing it would be a
publication decision nothing here grants — the same reading `reports/` and
`policy/shape.md` already carry.
