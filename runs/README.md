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

Terrain mints a new directory per run because a survey has no identity to
overwrite; Brief and Draft key on the slug, so a re-run of the same Brief
replaces its own workspace rather than adding one.

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
