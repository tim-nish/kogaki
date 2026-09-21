---
name: draft
description: Realize an adopted Brief into its CanonicalDraft. Use when the owner wants the article written from a filled Brief — "draft it", "run /draft", "realize the brief for <slug>". The third owner act of the pipeline (/terrain → /brief → /draft → /variant), invoked by the owner and never launched by /brief. Runs to completion — the run ends when the CanonicalDraft exists; there is no default mid-workflow stop, and the only legitimate earlier stop is a named inspection-need. Reads only the Brief plus its pinned Strand renderings; never fetches Strands.
---

# Draft — invoking the Harness

**This file names entry points and carries no flow ordering.** The ordering
lives in the Harness (`src/draft.mjs`), by the ruling at
`specs/spec-brief-draft-design/DESIGN.md` §3: the Packet is rendered by the
Harness as the leg immediately before realization, and `section` refuses a Leg
whose Packet is absent or stale. A session does not sequence those acts and
cannot get the sequence wrong.

The reduction is the point rather than tidiness. This file was untracked, so
kogaki#765's rename sweep could not see it and it went on naming a path removed
on 2026-09-02 while never mentioning the Packet at all — the same shape as
kogaki#680, where a skill's own text drove a session outside the flow and the
conformance check reported nothing wrong because it reads the record. Prose here
is advisory; what binds is in the Harness.

## Entry points

    node src/draft.mjs resolve  --brief <brief.md>
    node src/draft.mjs material --brief <brief.md> --strand <L-id>
    node src/draft.mjs packet   --brief <brief.md> --leg <leg_id>
    node src/draft.mjs section  --brief <brief.md> --leg <leg_id> --file <prose>
    node src/draft.mjs figure   --brief <brief.md> --leg <leg_id> --file <record.json>
    node src/draft.mjs emit     --brief <brief.md>

`resolve` opens the run and renders the first UNREALIZED Leg's Packet — not the
path's first Leg, which differ once a run is resumed mid-way. `material` prints
one Strand's citations and every `claim (strand <L-id>)` line the Brief carries
for it; it takes no Leg. `packet` re-renders a Packet on demand. `section`
records a Leg's realized prose and renders the next unrealized Leg's Packet —
except for a Leg carrying `figure:`, where it renders that Leg's figure input
instead and the next Packet follows the record. `figure` accepts one Leg's
figure record, the instance of its Move's declared form, and is reachable only
after that Leg's prose is recorded. `emit` assembles the CanonicalDraft and
refuses while any Leg lacks its section, or while a Leg that declared a figure
lacks its record, naming what it still owes.

**Realize each Leg from its Packet and nothing else** — §3 makes the Packet a
Leg's entire input, and the Harness refuses a `section` whose Packet it cannot
account for.

Run `node src/draft.mjs` with no arguments for the current usage; that output is
the Harness's own and is never restated here.
