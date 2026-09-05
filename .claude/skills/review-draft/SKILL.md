---
name: review-draft
description: Review a CanonicalDraft against the Packets that produced it. Use when the owner wants a finished Draft checked — "review the draft", "run /review-draft", "check the draft for <slug>". Reads the Draft, its frontmatter trace and the Packets that trace names, and nothing else — no Brief, no Move file, no Strand. Runs to completion: the run ends when theses/<slug>/review.md exists, after at most two passes, and finishes with residue rather than reaching for a third.
---

# ReviewDraft — invoking the Harness

**This file names entry points and carries no flow ordering.** The ordering
lives in the Harness (`src/review-draft.mjs`), the same ruling
`.claude/skills/draft/SKILL.md` records for /draft: `recover` refuses a Step
whose recovery input it did not render, `compare` refuses while any Step or
Section entry is missing, `check` refuses before `compare`, and `close` is
reachable from `compare` with zero fails or from `check` in every state. A
session does not sequence those acts and cannot get the sequence wrong.

## The closed input set

The Harness reads `theses/<slug>/draft.md`, its frontmatter trace — which
carries each Step's line range and its Packet's path and sha — and the Packet
files that trace names. **It reads no Brief, no Move file and no Strand**, by
the owner's 2026-09-04 ruling: the Packet was designed to be the only source a
Step needs, so a check that turns out to need anything else is evidence the
**Packet** is missing information. File that against `src/packet-template.md`;
never satisfy it with a side read here.

## Entry points

    node src/review-draft.mjs open    --draft <draft.md>
    node src/review-draft.mjs recover --draft <draft.md> --step <id> --file <recovered>
    node src/review-draft.mjs read    --draft <draft.md> --section <n> --file <ledger>
    node src/review-draft.mjs compare --draft <draft.md>
    node src/review-draft.mjs correct --draft <draft.md> --step <id> --file <prose>
    node src/review-draft.mjs check   --draft <draft.md>
    node src/review-draft.mjs close   --draft <draft.md>

`open` verifies the inputs, opens `runs/review/<slug>/` and renders the first
recovery input. `recover` records one blind recovery and renders the next.
`read` records the cold reader's entry for one Section. `compare` runs the
deterministic join. `correct` records a re-realized Step and `check` runs the
bounded second pass. `close` writes the owner record.

## The two readers, and why each is blind to something

**The recovering reviewer has never seen the Packet.** It reads the article
before one passage, then that passage, and writes down the Step record it
believes the passage realizes. A recovered record that agrees with the input
because it guessed at the input measures nothing, which is why the Harness
renders prose alone — the wording is `src/recovery-template.md`, which holds no
thesis, no grounds, no Move, no reader states and no term list — and refuses a
record for a Step whose input it did not render.

The record it returns is one JSON object validated against
`src/recovered-schema.json`: `claims` (each with the draft line span it rests
on), `reader_state_after`, `purpose`, `terms_introduced`, `shape`, `concessions`
and `restates`. Every field is a fact about the prose, so every field can be
checked by pointing at the prose. A missing field, a span outside the passage,
and a verdict or a piece of advice are each **refused by name** — an empty array
is an answer, an absent key is not.

**The cold reader reads the body only** — no headings taken on trust, no trace,
no Packet — and writes, after each Section, the question it answered and what
they now believe.

## The owner record

`theses/<slug>/review.md`, one per Draft, overwritten on re-run, headed by the
Draft's body sha and the Packet shas it was reviewed against. It lists the
findings, the corrections, and the **residue** — what survived every pass. Each
residue line carries an empty `classified:` field for the owner to fill with
`packet` or `reviewdraft`. **The tool never fills it**: what a surviving item is
evidence about is the judgment the two-pass bound exists to hand over.

Run `node src/review-draft.mjs` with no arguments for the current usage; that
output is the Harness's own and is never restated here.
