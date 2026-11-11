#!/usr/bin/env node
// review-draft — the ReviewDraft Harness: the round-trip review of a
// CanonicalDraft against the Packets that produced it (kogaki#869, #870).
// THE INPUTS ARE CLOSED (owner ruling 2026-09-04): the Draft, its frontmatter
// trace, the Packets the trace names, and of the Brief only its `defined_terms`
// (kogaki#1331). No code path under src/review-draft/ opens a Move or a
// Strand; a check that needs one is a PACKET GAP filed against
// `src/packet-template.md`. THE HARNESS OWNS THE ORDERING of the commands, the
// item table (`src/review-items.json`, kogaki#872) holds every consequence a
// verdict has, and the run ends at `review.md` after at most two passes. The
// cold reader is gone by ruling (kogaki#1133); figures landed at kogaki#880.
// Its stage modules under src/review-draft/ are cut at its named sections (kogaki#1458), the
// pass commands into passes.mjs (kogaki#1792); this entry keeps `open`, `outline` and dispatch.

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`, and no owner-facing string below
// names a spec at all (kogaki#953). THE NAMES THIS FILE USES:
//   the renderer
//       SPEC-draft-pipeline "The renderer and the anchor — markup from the record, at the Leg"
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readItems } from "./review-draft/declared-side.mjs";
import { STDIN_LABEL, argString, checkJaTermsFreshness, fail, readDraft, requireReply, resolveInputs, sha256 } from "./review-draft/draft-reader.mjs";
import { buildJoin } from "./review-draft/join.mjs";
import { nextOutlineOwed, renderReverseOutlineInput, validateFigureOutline, validateReverseOutline } from "./review-draft/reverse-outline.mjs";
import { passPath, readRun, requireCurrent, slugOf, workspaceFor, writeRun } from "./review-draft/workspace.mjs";
import { cmdCheck, cmdClose, cmdCompare, cmdCorrect, missingFor } from "./review-draft/passes.mjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) args[key] = true;
      else { args[key] = next; i++; }
    } else if (!args._cmd) args._cmd = a;
  }
  return args;
}

// ---------------------------------------------------------------------------
// The commands.

// THE TERM-LIST CHANGE PATH'S RE-ENTRY (kogaki#1165, discharging kogaki#1160
// acceptance item 3): `--only-legs` scopes the WHOLE run — every command reads
// `run.legs` and nothing else to decide which Legs it reviews, so filtering
// here is the whole of the scoping. `checkJaTermsFreshness` IS SKIPPED FOR A
// SCOPED OPEN on purpose: a term-list change leaves `terms_sha_at_lint` stale
// until the named Legs are corrected and the Draft is Linted again.
// `src/lint-ja.mjs correct-terms` names the Legs this flag takes.
function scopeToOnlyLegs(legs, sections, onlyLegsArg) {
  const onlyLegs = onlyLegsArg.split(",").map((s) => s.trim()).filter(Boolean);
  const known = new Set(legs.map((s) => s.leg_id));
  const unknown = onlyLegs.filter((id) => !known.has(id));
  if (unknown.length) {
    fail(`--only-legs names leg id(s) not in this Draft's trace: ${unknown.join(", ")} — known Legs are ${[...known].join(", ")}`);
  }
  if (!onlyLegs.length) {
    fail("--only-legs names no Leg — a term-list change path with nothing to correct has nothing to "
      + "open. Run `node src/lint-ja.mjs correct-terms --draft <draft.ja.md>` to see which Legs (if any) "
      + "Lint still names after the mechanical fix.");
  }
  const onlySet = new Set(onlyLegs);
  const scopedLegs = legs.filter((s) => onlySet.has(s.leg_id));
  const scopedSections = sections
    .map((sec) => ({ ...sec, legs: sec.legs.filter((id) => onlySet.has(id)) }))
    .filter((sec) => sec.legs.length > 0);
  return { legs: scopedLegs, sections: scopedSections, onlyLegs };
}

function cmdOpen(args) {
  const draftPath = argString(args, "draft",
    "usage: review-draft open --draft <draft.md> [--only-legs <id[,id...]>]");
  // retired-vocab-ok — `regenerat` is on checks/check-review-draft-retired-
  // vocabulary.sh's list (kogaki#1013 retired it with the deleted act it
  // named), and every use in this block is a MUST-NOT-APPEAR TRIPWIRE rather
  // than a lapse: `--regenerate` exists so a session reaching for a
  // whole-Draft re-derivation is told BY NAME that ReviewDraft does not do
  // that, citing src/lint-ja.mjs's Terminology List Decision. It names the
  // retired act to refuse it, never to perform it.
  if (args.regenerate) {
    fail("open refuses --regenerate: the Terminology List Decision (src/lint-ja.mjs) states a term-list "
      + "change is a CORRECTION, never a whole-Draft re-derivation — the owner does not require the Draft "
      + "to be uniquely reproducible, so re-deriving it from a moved term list is not owed. Only the Legs "
      + "`node src/lint-ja.mjs correct-terms` names are corrected; open with `--only-legs` naming them.");
  }
  const onlyLegsArg = typeof args["only-legs"] === "string" && args["only-legs"] !== "" ? args["only-legs"] : null;
  if (!onlyLegsArg) checkJaTermsFreshness(draftPath);
  const draft = readDraft(draftPath);
  // THE FULL TRACE IS KEPT BESIDE THE SCOPED SET, and the two are not
  // interchangeable (PR #1169 round 1). `run.legs` answers *which Legs this
  // run reviews* and is scoped; the article a Blind Reader is shown before a
  // passage answers *what the reader has read by then* and is NEVER scoped —
  // it is a property of the Draft, not of this run's scope. Handing the scoped
  // array to the renderer made the first named Leg read as the article's
  // first passage and withheld the prose actually preceding it, and it
  // disagreed with `cmdOutline` and pass two's re-render, which both build the
  // same block from the full trace.
  const resolved = resolveInputs(draft);
  const allLegs = resolved.legs;
  let { legs, sections } = resolved;
  let onlyLegs = null;
  if (onlyLegsArg) {
    ({ legs, sections, onlyLegs } = scopeToOnlyLegs(legs, sections, onlyLegsArg));
  }
  const slug = slugOf(draftPath);
  const ws = workspaceFor(args, slug);

  const run = {
    draft: resolve(draftPath),
    slug,
    body_sha: draft.body_sha,
    opened_at: new Date().toISOString(),
    only_legs: onlyLegs,
    legs: legs.map((s) => ({
      leg_id: s.leg_id, section: s.section, section_title: s.section_title,
      lines: s.lines, packet: s.packet, packet_sha: s.packet_sha,
    })),
    sections: sections.map((s) => ({ index: s.index, title: s.title, legs: s.legs })),
    // THE PASS THE RUN IS ON, AND THE LEDGER OF WHAT EACH PASS WROTE
    // (kogaki#994). `pass_files` maps a workspace-relative path to the pass
    // that wrote it, and `passPath` refuses a write that would land on another
    // pass's file. The split by directory already makes the collision
    // impossible; the ledger is what makes it REFUSED rather than merely
    // unreachable, so a later site composing a path by hand cannot reintroduce
    // the overwrite silently.
    pass: 1,
    pass_files: {},
    rendered: {},
    outlineFields: {},
    correction_inputs: {},
    findings: [],
    corrections: [],
    residue: [],
    compared_at: null,
    checked_at: null,
    closed_at: null,
  };

  const first = legs[0];
  const input = renderReverseOutlineInput(ws, run, draft, first, allLegs);
  run.rendered[first.leg_id] = input;
  writeRun(ws, run);

  process.stdout.write(
    `ReviewDraft opened: ${slug}\n`
    + (onlyLegs ? `  scope     term-list change path — only ${onlyLegs.join(", ")} (no other Leg is re-outlined, re-compared or re-realized)\n` : "")
    + `  draft     ${resolve(draftPath)} (body sha ${draft.body_sha.slice(0, 16)})\n`
    + `  legs     ${legs.length} — ${legs.map((s) => s.leg_id).join(", ")}\n`
    + `  sections  ${sections.length} — ${sections.map((s) => `${s.index}. ${s.title ?? "(untitled)"}`).join(" | ")}\n`
    + `  packets   ${legs.length} verified against the trace's shas\n`
    + `  workspace ${ws}\n`
    + `\nfirst Reverse Outline input: ${input}\n`);
}

function cmdOutline(args) {
  const usage = "usage: <reverse outline> | review-draft outline --draft <draft.md> --leg <id>";
  const draftPath = argString(args, "draft", usage);
  const legId = argString(args, "leg", usage);
  const draft = readDraft(draftPath);
  const ws = workspaceFor(args, slugOf(draftPath));
  const run = readRun(ws);
  requireCurrent(run, draft);

  const known = run.legs.map((s) => s.leg_id);
  if (!known.includes(legId)) {
    fail(`unknown leg \`${legId}\` — this Draft's Legs are ${known.join(", ")}`);
  }
  // THE RENDERED-INPUT GUARD IS WHAT MAKES REVERSE OUTLINING BLIND. A record handed
  // back for a Leg whose input was never rendered was written against
  // something else — the Packet, the Brief, or the reviewer's memory of the
  // article — and there is no way to tell which afterwards. So the refusal is
  // here, at the only moment the distinction is still observable.
  if (!run.rendered[legId]) {
    fail(`leg ${legId} has no rendered Reverse Outline input, so this record was not written against one.\n`
      + "The Harness renders inputs in the path's recorded order — `open` renders the first and each "
      + `\`outline\` renders the next. The Leg now owed is ${nextOutlineOwed(run)?.leg_id ?? "(none)"}.`);
  }
  // READ AFTER THE GUARDS, not before them. The reply arrives on standard input
  // and the refusals above are about the Leg rather than about the reading, so
  // consuming the stream first would make an unknown Leg's refusal depend on a
  // reply nobody needed to write.
  //
  // VALIDATED BEFORE IT IS RECORDED (kogaki#871). A record written to the
  // workspace and validated later would leave `compare` to discover the defect,
  // by which point the reviewer who could fix it has finished reading.
  const content = requireReply(usage);
  // THE LEG COMES FROM THE DRAFT, NOT FROM THE RUN RECORD (kogaki#880). The
  // run record carries the Leg's identity and its ranges; whether the Leg has
  // a figure — and where its block sits — is resolved from the trace, which is
  // the same read the Reverse Outline input was rendered from. Validating against the
  // run record's copy would let the conditional eighth field be owed at render
  // and unowed at validation, which is the two-answers-to-one-question pattern
  // this Harness refuses everywhere else.
  const { legs } = resolveInputs(draft);
  const leg = legs.find((x) => x.leg_id === legId);
  const projected = validateReverseOutline(content, leg, STDIN_LABEL);

  // THE FIGURE'S HALF, VALIDATED IN THE SAME ACT (kogaki#1018). Owed where the
  // trace says the reader met a block, and REFUSED where it says they did not —
  // the two refusals are the figure's counterpart of the Leg block's own, and
  // they are here rather than at `compare` for the reason the Leg's are: the
  // reviewer who could fix it has finished reading by then.
  let figureProjected = null;
  const hasFigureBlock = /^```figure\n/m.test(content);
  if (leg.figure) {
    figureProjected = validateFigureOutline(content, leg, STDIN_LABEL);
  } else if (hasFigureBlock) {
    fail(`the Reverse Outline for ${legId} (${STDIN_LABEL}) carries a fenced \`figure\` block, and this Leg `
      + "renders no figure. A reading of a block the reader never met is an invention, and the "
      + "comparison downstream would treat it as evidence, so it is refused rather than dropped.");
  }

  // BOTH ARE KEPT, AND THE OUTLINE IS THE EVIDENCE. The `.md` is the Reverse
  // Outline exactly as it was written — the artifact a later reader checks the
  // Round Trip against — and the `.json` is the reading the Harness compares,
  // under the Brief's own field names. Writing only the second would leave the
  // run's own record unable to show what the Blind Reader actually said.
  const outlinePath = passPath(ws, run, "outline", `${legId}.md`);
  writeFileSync(outlinePath, content.endsWith("\n") ? content : content + "\n");
  const out = passPath(ws, run, "outline", `${legId}.json`);
  writeFileSync(out, JSON.stringify(projected, null, 2) + "\n");
  run.outlineFields[legId] = out;
  run.outlines = run.outlines || {};
  run.outlines[legId] = outlinePath;

  // THE FIGURE'S READING IS ITS OWN FILE, for the reason it is its own fence:
  // it is written in the FIGURE RECORD's field names, and the Leg's reading is
  // written in the BRIEF's. One file per vocabulary is what keeps either from
  // acquiring a key belonging to the other.
  run.figureOutlineFields = run.figureOutlineFields || {};
  if (figureProjected) {
    const fout = passPath(ws, run, "outline", `${legId}.figure.json`);
    writeFileSync(fout, JSON.stringify(figureProjected, null, 2) + "\n");
    run.figureOutlineFields[legId] = fout;
  }

  const next = nextOutlineOwed(run);
  let nextInput = null;
  if (next) {
    const full = legs.find((s) => s.leg_id === next.leg_id);
    nextInput = renderReverseOutlineInput(ws, run, draft, full, legs);
    run.rendered[next.leg_id] = nextInput;
  }
  writeRun(ws, run);

  process.stdout.write(`recorded: ${legId} -> ${out}\n`);
  if (nextInput) process.stdout.write(`next Reverse Outline input: ${nextInput}\n`);
  else process.stdout.write("every Leg is outlined. `compare --draft <draft.md>` is the join.\n");
}

// ---------------------------------------------------------------------------

const COMMANDS = {
  open: cmdOpen,
  outline: cmdOutline,
  compare: cmdCompare,
  correct: cmdCorrect,
  check: cmdCheck,
  close: cmdClose,
};

const USAGE = `review-draft — the round-trip review of a CanonicalDraft against its Packets

                        node src/review-draft.mjs open    --draft <draft.md>
  <reverse outline>   | node src/review-draft.mjs outline --draft <draft.md> --leg <id>
  [<verdicts.json>]   | node src/review-draft.mjs compare --draft <draft.md>
  [<corrected prose>] | node src/review-draft.mjs correct --draft <draft.md> --leg <id>
  [<record.json>]     | node src/review-draft.mjs correct --draft <draft.md> --leg <id> --figure
  [<verdicts.json>]   | node src/review-draft.mjs check   --draft <draft.md>
                        node src/review-draft.mjs close   --draft <draft.md>

The Harness owns the ordering: \`outline\` refuses a Leg whose Reverse Outline input it
did not render, \`compare\` refuses while any Leg outline is missing,
\`check\` refuses before \`compare\`, and \`close\` is reachable from \`compare\` with
zero fails or from \`check\` in every state.

THE WORKSPACE IS SPLIT BY PASS, and the layout is this command's contract rather
than a convention:

  runs/review/<slug>/pass-1/{outline-input,outline,join,corrections,join.json}
  runs/review/<slug>/pass-2/{outline-input,outline,join,check.json}
  runs/review/<slug>/snapshots/    before/after per corrected Leg, and per restore
  runs/review/<slug>/passes.json   both passes side by side, one row per pair
  runs/review/<slug>/run.json

Every pass writes only under its own directory, and a write that would land on a
file another pass wrote is REFUSED BY NAME. A later third pass is \`pass-3/\` and
nothing else moves. \`snapshots/\`, \`passes.json\` and \`run.json\` stay at the
root: a snapshot pair spans the correction that separates two passes,
\`passes.json\` is the one record ABOUT both passes, and the run record is the
one file every pass writes. \`corrections/\` is PASS ONE'S ONLY — \`correct\`
discharges a verdict pass one recorded, and pass two turns a still-failing item
into residue rather than into another correction — so pass two has none.

\`join.json\` and \`check.json\` are the pass's whole reading and the surface to
debug a run from: every row carries the item, its class, the verdict, the reason,
the span, \`judged\` — whether a Judge was asked at all — and the model that
answered where one was. A \`comparison/\` directory rendering those rows as prose
stood beside them until kogaki#1134 and was harder to read than the record it
rendered; the consequence word it added is the class and the verdict together —
a \`preserved\` fail is what sends its Leg to correction and a \`best-effort\` one
rides along.

EVERY REPLY REACHES THIS HARNESS ON STANDARD INPUT, and no act takes a path to
one. \`runs/\` holds what the Harness wrote and nothing else: the Reverse
Outline lands at \`outline/<leg>.md\`, the verdicts in \`join.json\` and
\`check.json\`, and a correction in
the Draft itself with its before-and-after pair under \`snapshots/\` — one copy
each, under the Harness's own name. A reply the session wrote to a file of its
own naming was a duplicate of that copy, and a write into machine state with no
owner.

\`close\` writes the corrected article to \`theses/<slug>/draft.reviewed.md\` and
RESTORES \`theses/<slug>/draft.md\` to the Draft the run reviewed, so the Draft is
byte-identical before and after a run and the diff between the two files is the
review. \`review.md\` names both. A second \`close\` on a closed run refuses.

\`correct\` runs in TWO PHASES like \`compare\`, and STANDARD INPUT selects the
phase: with nothing piped in it renders the
correction input — the Leg's Packet RE-RENDERED against the article as it now
stands, so the "article so far" block carries the current preceding prose
including Legs corrected earlier in the same pass, with one Correction block
appended holding the previous realization, what failed, and what held and must
go on holding. With the corrected prose piped in it records it through the
realization lane and reports the drift: the share of sentences changed and the
verbatim overlap with the Packet's claim and state lines. Both are REPORTED and
neither gates. Corrections run in path order, and a Leg out of order refuses.

\`--figure\` corrects the Leg's FIGURE RECORD instead of its passage, and it is
the seat a failing preserved figure item sends the Leg to. Phase A renders the
Packet as it now stands, the passage, the block as the reader currently meets
it, the previous record verbatim, and what failed and held; phase B takes the
re-designed record and hands it to \`draft.mjs figure\`, which re-validates it,
and \`emit\`, which re-renders the block from it. You write no markup. A Leg
owing both corrections takes the passage first: the record's caption is stated
in what the reader holds after reading that passage.

\`check\` is pass two and is BOUNDED: it re-runs Reverse Outlining for the
corrected Legs, then re-judges their own failed and held preserved items, the
continuity item on each corrected Leg's successor, and every mechanical
item over the whole Draft. Every other pair is CARRIED from pass one, marked as
carried, at no model call. A preserved item still failing after pass two is
residue, and \`close\` hands it to the owner with an empty \`classified:\` field.

\`check\` REFUSES A REGRESSION. A corrected Leg that FAILS in pass two a
preserved item it HELD in pass one is RESTORED to its pass-one prose, through
the realization lane that wrote it, and the item the correction was made for
returns to residue as still failing. Only the regressed Leg moves: a later
corrected Leg keeps its corrected prose and carries no mark, because
Leg-to-Leg continuity was settled at Reader Path design and is not this
Harness's. The restore is recorded in \`run.json\`, in \`check.json\`, and in
\`review.md\` under the Leg it undid, with a snapshot pair of its own.

A completed \`check\` also writes \`passes.json\` at the run root: one row per
Leg, item and pair, carrying pass one's verdict, pass two's, and one outcome
word — held, fixed, still-failing, regressed, carried. Comparing the two passes
meant reading \`pass-1/join.json\` and \`pass-2/check.json\` side by side by hand,
and \`regressed\` is the word neither of them carries.

\`compare\` decides the mechanical items itself and renders one join Packet per
judged pair; a verdicts reply piped in records the answers. It emits one line per (Leg,
item) once every pair is answered, and never before: there is no fourth token
for "not asked yet", and \`cannot-decide\` is a real answer rather than a place
to round one.

EVERY VERDICT NAMES THE MODEL THAT PRODUCED IT — \`{leg_id, item, pair?,
verdict, reason, model}\`, and a verdict with no \`model\` is refused. The id
rides the verdict, the \`model_calls\` log and the emitted \`judged by DECLARED
model(s)\` line. It is a DECLARATION: the Harness invokes no judge, pins no
model and verifies nothing about the value, which is why the record must carry
what the spawn was pinned to rather than leaving it to be inferred from a run
that no longer exists.

It reads the Draft, its trace and the Packets that trace names — no Brief, no
Move file, no Strand. A check that needs anything else is a Packet gap and is
filed against src/packet-template.md.
`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._cmd;
  if (!cmd || !COMMANDS[cmd]) {
    process.stdout.write(USAGE);
    process.exit(cmd ? 1 : 0);
  }
  // THE RETIRED ARGUMENTS ARE REFUSED BY NAME, NEVER IGNORED (kogaki#1100). A
  // call still carrying `--file` or `--verdicts` was written against the old
  // interface and is piping nothing, so silently dropping the argument would
  // give it phase A — a rendered input where it asked to record — and the
  // session would read that as the act having run. The refusal names the pipe.
  for (const k of ["file", "verdicts"]) {
    if (args[k] !== undefined) {
      fail(`\`--${k}\` is gone: a reply reaches this Harness on standard input, so that it can be `
        + "piped straight from the spawn that produced it and `runs/` holds no file the Harness did "
        + `not write.\n  <the reply> | node src/review-draft.mjs ${cmd} …`);
    }
  }
  COMMANDS[cmd](args);
}

// THE CLI RUNS ONLY AS THE ENTRY POINT (kogaki#1447), so a check can import the join and
// the item table and drive them over a fixture without the usage text exiting the process.

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

export { sha256, readDraft, resolveInputs, slugOf, missingFor, readItems, buildJoin };
