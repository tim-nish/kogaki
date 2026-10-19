#!/usr/bin/env node
// review-draft — the ReviewDraft Harness: the round-trip review of a
// CanonicalDraft against the Packets that produced it (kogaki#869 tracking,
// kogaki#870 this artifact).
//
// THE INPUTS ARE CLOSED, AND THAT IS THE WHOLE OF THE DESIGN. This command
// reads three things: `theses/<slug>/draft.md`; its frontmatter trace, which
// after kogaki#868 carries each Leg's line range and its Packet's path and
// sha; and the Packet files those entries name. It reads no Move file and no
// Strand, and of the Brief only its Defined Terms (kogaki#1331, owner decision
// 2026-10-10: "The review of the Draft may read it"). The owner's 2026-09-04
// ruling is why the inputs are otherwise closed:
//
//   "The Packet was specifically designed to be the only source required to
//    generate the Draft without reading the Leg or Move files separately.
//    Therefore, ReviewDraft should compare the Draft against the Packet. If
//    ReviewDraft later turns out to require Move information or any other
//    separate file, that should be treated as evidence that the Packet is
//    missing information, and that information should be added to the Packet
//    instead."
//
// So a check that needs anything else is a PACKET GAP and is filed against
// `src/packet-template.md`. It is never satisfied by a side read, and the
// absence of any such read here is the mechanical half of that ruling: there
// is no code path in this file that opens a Move or a Strand, which is a
// stronger statement than a rule saying not to. The one path that opens the
// Brief reads its `defined_terms` and the Leg each is introduced on, for the
// `defined-term-order` item, which is a Brief-sense check rather than a
// reconstruction and so has no Packet side to read instead.
//
// THE HARNESS OWNS THE ORDERING (the same ruling `.claude/skills/draft/SKILL.md`
// records for /draft): `outline` refuses a Leg whose Reverse Outline input it did not
// render, `compare` refuses while any Leg is still unoutlined, `check`
// refuses before `compare`, and `close` is reachable from `compare` with zero
// fails or from `check` in every state. A session does not sequence these acts
// and cannot get the sequence wrong.
//
// THE COMPARISON IS FIXED IN THE HARNESS (kogaki#872). `src/review-items.json`
// decides which Packet information must be reconstructible per item class, which
// items are preserved and which best-effort, and which are decided from string
// facts rather than put to a reader. The judging model sees ONE pair and ONE
// question and answers with one of three tokens — it never assigns severity,
// never ranks, and never sees two pairs at once, because the table already
// holds every consequence a verdict has.
//
// COMPLETION: the command runs to completion — it ends when `review.md` exists.
// Two passes at most (owner ruling 2026-09-04). It finishes with residue rather
// than reaching for a third pass, because the residue is the useful output:
// what survives two passes is information about ReviewDraft itself or about the
// Packet, and the owner classifies which.
//
// WHAT THIS ARTIFACT DOES NOT OWN, stated so a reader can tell a boundary from
// a hole. EVERY DECLARED BOUNDARY IS NOW FILLED, and each is named here as
// landed rather than dropped from the list, because a boundary that quietly
// stops being one cannot be told from a boundary a reader misremembered: the
// Reverse Outline input's record schema (kogaki#871); the item classes, the
// three-valued verdict and the mechanical checks (kogaki#872); and the
// correction path with its bounded second pass (kogaki#874).
//
// THE COLD READER IS GONE, AND ITS ABSENCE IS A RULING RATHER THAN A TRIM
// (owner, 2026-09-17; kogaki#1133). kogaki#873 added a second reader of the
// whole body, a Section ledger and five Section pairs. Reverse Outlining
// reconstructs the elements of a LEG, and the thesis is not a Leg element: of
// those five pairs the heading was preserved trivially by the Harness that
// renders it, the three belief pairs duplicated the reader-state items one level
// up, and the thesis pair -- the one check no Leg item makes -- had no act here
// at all, because corrections are Leg-level and a thesis fail could only ever
// become residue saying the Packets lack something. That is a Brief-time
// finding. So there is no Section ledger, no Section pair and no thesis check in
// this file.
//
// THE REOPEN TRIGGER IS NAMED, so a later reader can tell a ruling from an
// omission: a Draft whose every Leg holds the round trip and whose thesis the
// owner cannot find on reading it. If that happens the check is designed at
// BRIEF COMPOSITION, where the chain of `reader_state_after` values should reach
// the thesis, as an operation outside the Reverse Outlining item set -- and
// never as a sixth pair here.
//
// FIGURES REMAIN OUT OF SCOPE for this batch (kogaki#869) — they change the
// Leg schema and the Packet, so they are a later batch and not a hole here.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982).
// The rule these entries are written under -- what a copy is, what the two
// markers `[implemented-against: ...]` and `[see: ...]` mean, and why nothing
// names a section number or a line range -- lives in ONE place:
// `src/SPEC-REFERENCES.md`. It is not restated here; fifteen copies of it had
// already drifted into eight variants, which is what kogaki#982 collapsed.
//
// This file's own stronger property, established by kogaki#953's sweep and
// kept at the site because the carrier states only the general rule: NO
// OWNER-FACING STRING BELOW NAMES A SPEC AT ALL, not merely no spec section.
//
// The quoted heading beside a name is the spec content that name stands for.
// THE NAMES THIS FILE USES, and the spec each one names:
//   the figure decision
//       SPEC-draft-pipeline "The figure decision — `figure:` and `figure_roles` on a Leg"
//   the figure record
//       SPEC-draft-pipeline "The figure record — the form's instance, filled after the prose"
//   the renderer
//       SPEC-draft-pipeline "The renderer and the anchor — markup from the record, at the Leg"
//   the frontmatter trace
//       SPEC-draft-command "The three-layer boundary"
//
// A NODE BUILTIN, so the closed-input allowlist below is satisfied as it is
// WORDED ("only node builtins and ./runs.mjs") rather than widened past its
// own property. It is here for exactly one act: `correct` re-enters the
// realization lane as a subprocess, because a corrected Leg must be realized
// by the same renderer that wrote the Packets. Nothing here reads a Move or a
// Strand, and of the Brief it reads its defined terms alone (below) — the
// reviewer's blindness is a property of what this module READS.
// THE ONE READ OF THE BRIEF, AND THE OWNER'S RULING THAT ADMITS IT (kogaki#1331,
// owner decision 2026-10-10): "The review of the Draft may read it." It reads
// the Brief's `defined_terms` and which Leg's `introduces` carries each term,
// for the one mechanical item that asks whether a defined term reaches the
// prose before its introducing Leg — and nothing else of the Brief. The list
// lives in the Brief and ends there; copying it into a Packet so this module
// could stay blind would be the copy downstream that ruling refuses.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve, dirname, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { chosenJudged, findingEvidencePaths } from "./review-draft/close.mjs";
import { withReplyFile, draftLane, readJoin, figureItemIds, failingSides, correctionOwedProse, figureCorrectionOwed, seatsStillOwed, correctionEvidence, renderCorrectionBlock, driftOf, driftBlocks, correctionInputPath, correctFigure, passTwoBound } from "./review-draft/correction.mjs";
import { readItems, declaredFor } from "./review-draft/declared-side.mjs";
import { fail, sha256, argString, STDIN_LABEL, readReply, requireReply, readDraft, resolveInputs, checkJaTermsFreshness } from "./review-draft/draft-reader.mjs";
import { verdictKey, judgedByLine, recordVerdicts, buildJoin, comparisonLine } from "./review-draft/join.mjs";
import { regressedPairs, restoreRegressedLeg, PASS_OUTCOMES, buildPasses } from "./review-draft/regression.mjs";
import { renderReverseOutlineInput, validateFigureOutline, validateReverseOutline, nextOutlineOwed } from "./review-draft/reverse-outline.mjs";
import { slugOf, workspaceFor, readRun, writeRun, currentPass, REVIEWED_BASENAME, passPath, passPathAt, passReadPath, requireCurrent } from "./review-draft/workspace.mjs";

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
// acceptance item 3): `--only-legs` scopes the WHOLE run — outline, compare,
// correct, check and close all read `run.legs` and nothing else to decide
// which Legs this run reviews, so filtering it here is the whole of the
// scoping and no other command needs to know a scoped run exists. A Leg
// left out is never re-outlined and never re-compared, because there is no
// code path here that reaches a Leg `run.legs` does not name.
//
// `checkJaTermsFreshness` IS SKIPPED FOR A SCOPED OPEN, on purpose: the whole
// reason this path exists is that a term-list change leaves
// `terms_sha_at_lint` stale until the named Legs are corrected and the Draft
// is Linted again, and the ordinary freshness gate would refuse to let that
// correction start. `src/lint-ja.mjs correct-terms` is what names the Legs
// this flag takes.
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

// What `compare` is missing, computed once and rendered as the refusal's whole
// content: a reviewer told "something is missing" has to go looking, and the
// looking is the part the Harness can do.
//
// THE LEG OUTLINES ARE THE WHOLE OF WHAT IT CAN BE MISSING (kogaki#1133). The
// Section ledger and the cold reader's final claim were two further kinds of
// missing until that issue removed the reader that wrote them. The return stays
// a record rather than becoming a bare array, because a caller reading `.legs`
// says what it is asking about.
function missingFor(run) {
  const legs = run.legs.map((s) => s.leg_id).filter((id) => !run.outlineFields[id]);
  return { legs };
}

// ---------------------------------------------------------------------------
// THE PER-LEG COMPARISON FILES ARE GONE (kogaki#1134, owner 2026-09-17), AND
// THIS REVERSES kogaki#1097 BY NAME.
//
// #1097 wrote `comparison/<leg>.md` because the surface a person debugged from
// mid-run was then the verdicts file the session had handed in, which carried
// the model's answer and nothing about what the answer meant — not the item's
// class, not whether the fail sent the Leg to correction. kogaki#1100 removed
// those session-written files the same day, and `join.json` now carries
// `class`, `verdict`, `reason`, `model` and `span` on every row. Read against
// that record the comparison files were a legend plus one line per pair
// restating it, and harder to read than the record they rendered. Their one
// addition — the consequence word — is derivable from the row's class and
// verdict by the same rule `consequenceOf` held, so nothing is lost with them.
//
// The EMITTED comparison line stays: it is the pass's own report to the person
// running it, not a file in the run directory, and `comparisonLine` above is
// the whole of it.

function cmdCompare(args) {
  const draftPath = argString(args, "draft", "usage: review-draft compare --draft <draft.md>   (verdicts on standard input record them)");
  // BOTH PHASES ARE ONE COMMAND, AND THE STREAM IS WHAT SELECTS ONE
  // (kogaki#1100). With nothing piped in, `compare` renders what it owes; with
  // a verdicts reply piped in, it records. The flag that used to say which is
  // gone, so the reply itself is read once, here, before any refusal consumes
  // the stream.
  const reply = readReply();
  const draft = readDraft(draftPath);
  const ws = workspaceFor(args, slugOf(draftPath));
  const run = readRun(ws);
  requireCurrent(run, draft);

  // `compare` IS PASS ONE, AND PASS ONE ENDS AT THE FIRST CORRECTION (PR #1004
  // round 2 successor). `correct` moves `body_sha` with the article, so
  // `requireCurrent` admits a `compare` over the corrected Draft — and that
  // `compare` would re-render every pass-one join Packet from the CORRECTED
  // prose, over the inputs pass one's verdicts were actually given on, and
  // reset the pass-one record to an unbounded join. That is the loss
  // kogaki#994 was filed for, one pass over, and the pass ledger cannot catch
  // it: pass one writing over its own files is a permitted write. The pass over
  // a corrected Draft is `check`, and the refusal names it.
  if ((run.corrections || []).length) {
    fail(`this run has ${run.corrections.length} correction(s) recorded, so pass one is over: `
      + "`compare` would re-render pass one's join inputs from the corrected article, over the "
      + "inputs its verdicts were given on, and pass one's reading of the original would be lost.\n"
      + "The pass over a corrected Draft is `check`:\n"
      + `  node src/review-draft.mjs check --draft ${relative(process.cwd(), draft.path) || draft.path}`);
  }

  // EVERY MISSING INPUT IS NAMED IN ONE REFUSAL, BY LEG. A reviewer sent back
  // for "a missing outline" has to work out which; the Harness already knows.
  const missing = missingFor(run);
  if (missing.legs.length) {
    fail(`the join has inputs missing, so it would compare a partial review against a whole Draft `
      + `and report the gaps as agreement.\n  leg outline`
      + `${missing.legs.length === 1 ? "" : "s"}: ${missing.legs.join(", ")}`);
  }

  const items = readItems();

  // THE OWED SET IS COMPUTED BEFORE ANY VERDICT IS RECORDED, and that ordering
  // is what the file is validated against: what a run asks about is a property
  // of the Draft, the Packets and the item table, never of the answers it has
  // already been given.
  let pass = buildJoin(draft, run, items, ws, { pass: 1 });
  let recorded = 0;
  if (reply.trim() !== "") {
    recorded = recordVerdicts(run, reply, pass.owed, items);
    pass = buildJoin(draft, run, items, ws, { pass: 1 });
  }

  const { results, owed, modelCalls, mechanicalLog } = pass;
  const complete = owed.length === 0;
  run.join_complete = complete;
  run.compared_at = complete ? new Date().toISOString() : null;
  run.join_state = complete ? null
    : `${owed.length} pair(s) await a verdict — the join is unfilled, not clean`;
  run.findings = complete ? results.filter((r) => r.verdict !== "holds") : [];
  writeRun(ws, run);

  // PASS ONE'S RECORD, AND THE PASS IS NAMED RATHER THAN INHERITED. `compare`
  // IS pass one — `check` is the door pass two answers through, precisely so
  // this unbounded join is never rebuilt over a corrected Draft — so the
  // record lands in `pass-1/` whatever pass the run has since reached.
  const joinPath = passPathAt(ws, run, 1, "join.json");
  writeFileSync(joinPath, JSON.stringify({
    draft: run.draft, body_sha: run.body_sha, compared_at: run.compared_at,
    item_table_version: items.version,
    complete,
    results,
    owed,
    // WHICH ITEMS COST A MODEL CALL AND WHICH DID NOT, per pair. This is the
    // record that makes "decided mechanically" checkable rather than claimed —
    // a mechanical item appears in `mechanical` and in no `model_calls` entry,
    // for every Leg.
    model_calls: modelCalls,
    mechanical: mechanicalLog,
  }, null, 2) + "\n");

  if (recorded) process.stdout.write(`recorded: ${recorded} verdict(s)\n`);

  if (!complete) {
    // NO COMPARISON LINE IS EMITTED WHILE ANY PAIR IS UNANSWERED. There is no
    // fourth token for "not asked yet", and writing `cannot-decide` here would
    // round an absence into an answer — the one rounding the three-valued
    // verdict exists to refuse.
    process.stdout.write(
      `compare: every input present — ${run.legs.length} outlined Leg(s).\n`
      + `${mechanicalLog.length} pair(s) decided mechanically, no model call.\n`
      + judgedByLine(modelCalls)
      + `${owed.length} pair(s) await a verdict — one join Packet each, under ${passReadPath(ws, 1, "join")}:\n`
      + owed.map((o) => `  ${o.key}  ${o.packet}`).join("\n") + "\n"
      + "Answer each with one of holds / fails / cannot-decide plus one sentence, then\n"
      + `  <verdicts.json> | node src/review-draft.mjs compare --draft ${relative(process.cwd(), draft.path) || draft.path}\n`
      + `join record: ${joinPath}\n`);
    return;
  }

  // THE PASS LEDGER IS PERSISTED AFTER THE RECORD IS WRITTEN. `passPathAt`
  // registers each path it composes in `run.pass_files`, and that register is
  // what makes a second pass writing over this one refuse by name; a run that
  // composed `join.json`'s path and never wrote the record back would leave the
  // refusal unarmed for the one file this pass ends on.
  writeRun(ws, run);

  const fails = results.filter((r) => r.verdict === "fails");
  const preserved = fails.filter((r) => r.class === "preserved");
  const undecided = results.filter((r) => r.verdict === "cannot-decide");
  process.stdout.write(
    results.map(comparisonLine).join("\n") + "\n\n"
    + `compare: ${results.length} (Leg, item) pair(s) joined, `
    + `${mechanicalLog.length} decided mechanically and ${modelCalls.length} judged.\n`
    + judgedByLine(modelCalls)
    + (preserved.length
      ? `Legs sent to correction — a preserved item fails: ${[...new Set(preserved.map((r) => r.leg_id))].join(", ")}\n`
      : "No preserved item fails, so no Leg is sent to correction.\n")
    + (undecided.length
      ? "cannot-decide, listed with its pair and never rounded: "
        + undecided.map((r) => `${r.leg_id}/${r.item}`).join(", ") + "\n"
      : "")
    + `join record: ${joinPath}\n`
    + (fails.length
      ? "`check --draft <draft.md>` is pass two.\n"
      : "`close --draft <draft.md>` writes the owner record.\n"));
}

function cmdCorrect(args) {
  const usage = "usage: review-draft correct --draft <draft.md> --leg <id> [--figure]\n"
    + "       (the corrected prose, or the corrected figure record, on standard input records it)";
  const draftPath = argString(args, "draft", usage);
  const legId = argString(args, "leg", usage);
  // THE STREAM SELECTS THE PHASE, as it does in `compare` and `check`
  // (kogaki#1100), and it is read once here so both seats see the same answer.
  const reply = readReply();
  // THE FLAG SAYS WHICH SEAT IS BEING CORRECTED, and it is a flag rather than a
  // fact derived from what failed (kogaki#880). A Leg can owe both a prose and
  // a figure correction, and the two take different inputs — prose in one and a
  // JSON record in the other — so a runtime that inferred the seat would decide
  // what form the session's file had to be in after the session wrote it.
  const figureMode = args.figure === true;
  const draft = readDraft(draftPath);
  const ws = workspaceFor(args, slugOf(draftPath));
  const run = readRun(ws);
  requireCurrent(run, draft, legId);

  if (!run.compared_at) {
    fail("`correct` is what pass one sends a Leg to, and pass one has not completed — run "
      + "`compare --draft <draft.md>` first. A correction composed before the join has answered "
      + "would be a rewrite against findings nobody recorded.");
  }
  const known = run.legs.map((s) => s.leg_id);
  if (!known.includes(legId)) fail(`unknown leg \`${legId}\` — this Draft's Legs are ${known.join(", ")}`);

  const items = readItems();
  const owed = figureMode ? figureCorrectionOwed(run, items) : correctionOwedProse(run, items);
  if (!owed.includes(legId)) {
    const sides = failingSides(run, items, legId);
    // THE REFUSAL NAMES THE OTHER SEAT WHERE THAT IS WHY IT REFUSED. A Leg
    // owing a figure correction and asked for a prose one is not a Leg with
    // nothing owed, and reporting it as one would send a session looking for a
    // finding that is recorded and readable.
    if (!figureMode && sides.figure.length) {
      fail(`leg ${legId} carries no failing PRESERVED item of the PASSAGE, and it does carry one `
        + `of the FIGURE (${sides.figure.join(", ")}). What is re-realized there is the figure `
        + `record, not the prose:\n  node src/review-draft.mjs correct --draft `
        + `${relative(process.cwd(), draft.path) || draft.path} --leg ${legId} --figure`);
    }
    if (figureMode && sides.prose.length) {
      fail(`leg ${legId} carries no failing PRESERVED FIGURE item, and it does carry one of the `
        + `passage (${sides.prose.join(", ")}). Drop --figure to correct the prose.`);
    }
    fail(`leg ${legId} carries no failing PRESERVED ${figureMode ? "figure " : ""}item, so pass `
      + "one did not send it to correction. A best-effort fail rides along when its Leg is "
      + `re-realized anyway and never sends one here.\n  owed: ${owed.length ? owed.join(", ") : "(none — no Leg is owed a correction)"}`);
  }
  // PATH ORDER IS ENFORCED, not requested. Corrections run in path order so
  // each later one sees the earlier ones in its own "article so far" block —
  // which is the mechanism the whole correction path rests on, and a session
  // correcting out of order would silently get the opposite: a Leg realized
  // against prose that is about to change under it.
  //
  // ORDER IS TRACKED PER SEAT (kogaki#880): a Leg's recorded figure correction
  // does not discharge the prose correction owed on an earlier Leg, and the
  // seat a record carries is what says which it discharged.
  const seat = figureMode ? "figure" : "prose";
  const already = new Set((run.corrections || [])
    .filter((c) => (c.seat || "prose") === seat).map((c) => c.leg_id));
  const earlier = owed.slice(0, owed.indexOf(legId)).filter((id) => !already.has(id));
  if (earlier.length) {
    fail(`corrections run in path order and leg ${legId} is not next — ${earlier.join(", ")} `
      + `${earlier.length === 1 ? "is" : "are"} owed a ${seat} correction first. Each correction `
      + "re-renders the next Leg's Packet against the article as it then stands, so correcting out "
      + "of order realizes a Leg against prose that is about to move under it.");
  }
  // THE PASSAGE IS CORRECTED BEFORE THE FIGURE IT CARRIES, and this is the
  // figure record's
  // own ordering rather than a convention chosen here: the record's caption is
  // stated in what the reader holds after reading THIS passage, and its
  // elements are worded against prose that must already exist. A record
  // corrected against prose that is about to change is corrected against
  // nothing.
  if (figureMode) {
    const proseOwed = correctionOwedProse(run, items).includes(legId);
    const proseDone = (run.corrections || []).some((c) => c.leg_id === legId && (c.seat || "prose") === "prose");
    if (proseOwed && !proseDone) {
      fail(`leg ${legId} owes a correction on its PASSAGE as well, and the passage is corrected `
        + "first: the record's caption is stated in what the reader holds after reading this "
        + "passage, and its elements are worded from prose that must already exist.\n"
        + `  node src/review-draft.mjs correct --draft ${relative(process.cwd(), draft.path) || draft.path} --leg ${legId}`);
    }
  }

  const joinRec = readJoin(ws);
  if (figureMode) { correctFigure(args, { draft, draftPath, ws, run, items, joinRec, legId, reply }); return; }

  // --- phase A: render the correction input ------------------------------
  if (reply.trim() === "") {
    // RESOLVED BEFORE THE LANE IS ENTERED, and only here. Phase A still holds a
    // consistent Draft — the trace and every Packet agree — and re-rendering
    // this Leg's Packet is what ends that agreement, so the previous prose is
    // read out first and recorded. Phase B reads it back from that record
    // rather than resolving a Draft it knows is mid-correction.
    const leg = resolveInputs(draft).legs.find((x) => x.leg_id === legId);
    const r = draftLane("packet", draft, args, ["--leg", legId]);
    // THE LANE IS ASKED WHERE IT STORED THE PACKET, never guessed at from the
    // workspace layout. A path composed here would be a second answer to a
    // question the renderer already answers, and the two would diverge the
    // moment the draft lane's workspace rule changed.
    const prefix = `packet ${legId}: `;
    const line = (r.stderr || "").split("\n").find((l) => l.startsWith(prefix));
    if (!line) {
      fail("the realization lane rendered a Packet and did not say where it stored it, so this "
        + "cannot show a reviewer the input the correction is written from. Its output, "
        + `verbatim:\n${(r.stderr || r.stdout || "(no output)").trim()}`);
    }
    const freshPath = line.slice(prefix.length).trim();
    if (!existsSync(freshPath)) fail(`the realization lane named a Packet at ${freshPath} and no file is there`);
    const fresh = readFileSync(freshPath, "utf8");
    const block = renderCorrectionBlock(leg, correctionEvidence(joinRec, legId, items));
    const dest = correctionInputPath(ws, run, legId);
    writeFileSync(dest, (fresh.endsWith("\n") ? fresh : fresh + "\n") + block);
    run.correction_inputs = run.correction_inputs || {};
    run.correction_inputs[legId] = {
      path: dest, packet: freshPath, packet_sha: sha256(fresh),
      prose: leg.prose, rendered_at: new Date().toISOString(),
    };
    run.correcting = { leg_id: legId, input: dest, since: new Date().toISOString() };
    writeRun(ws, run);
    process.stdout.write(
      `correction input: ${dest}\n`
      + "  It is the Packet re-rendered against the article AS IT NOW STANDS — the \"article so\n"
      + "  far\" block holds the current preceding prose, corrections included — with one\n"
      + "  Correction block appended carrying the previous realization, what failed, and what\n"
      + "  must go on holding.\n"
      + `Realize the Leg from it, then record with\n`
      + `  <the corrected prose> | node src/review-draft.mjs correct --draft ${relative(process.cwd(), draft.path) || draft.path} --leg ${legId}\n`
      + "Until then this run is MID-CORRECTION on this Leg: its Packet is the freshly rendered\n"
      + "one and its prose is still the old realization, so every other act refuses by name\n"
      + "rather than reporting a comparison between prose and an input that did not produce it.\n");
    return;
  }

  // --- phase B: record the corrected realization -------------------------
  const input = (run.correction_inputs || {})[legId];
  // THE RENDERED-INPUT GUARD, the same one `outline` has and for the same
  // reason. Prose handed back for a Leg whose correction input was never
  // rendered was written against something else — the old Packet, or the
  // finding text alone — and afterwards there is no way to tell which.
  if (!input) {
    fail(`leg ${legId} has no rendered correction input, so this prose was not written against `
      + `one. Render it first:\n  node src/review-draft.mjs correct --draft `
      + `${relative(process.cwd(), draft.path) || draft.path} --leg ${legId}`);
  }

  // THE PREVIOUS PROSE AND THE FRESH PACKET COME FROM THE PHASE-A RECORD, not
  // from the Draft. The Draft is mid-correction by construction here — its
  // trace names the re-rendered Packet beside prose the old one produced — so
  // resolving it would refuse on a state this act exists to end.
  const before = input.prose;
  const declared = declaredFor({ leg_id: legId, packet_path: input.packet }, items);
  const packetLines = driftBlocks(declared, items);

  // SNAPSHOTS LAND IN THE REVIEW WORKSPACE, before and after each correction —
  // the Draft is the artifact and this is the only record of what a correction
  // moved. Written before the lane is entered, so a correction the lane refuses
  // still leaves the before-state.
  const snapDir = join(ws, "snapshots");
  mkdirSync(snapDir, { recursive: true });
  const seq = String((run.corrections || []).length + 1).padStart(2, "0");
  writeFileSync(join(snapDir, `${seq}-before-${legId}.md`), draft.text);

  withReplyFile(reply, `${legId}.prose.md`, (p) =>
    draftLane("section", draft, args, ["--leg", legId, "--file", p]));
  draftLane("emit", draft, args, []);

  // The Draft is a different document now: new prose, new line ranges, and a
  // new body sha. Re-read it rather than patching the record — the trace is the
  // join key and `emit` is what writes it.
  const after = readDraft(draftPath);
  const afterLegs = resolveInputs(after).legs;
  const corrected = afterLegs.find((s) => s.leg_id === legId);
  if (!corrected) fail(`leg ${legId} is absent from the re-emitted Draft's trace`);
  writeFileSync(join(snapDir, `${seq}-after-${legId}.md`), after.text);

  const drift = driftOf(before, corrected.prose, packetLines, items.thresholds.verbatim_overlap_words);
  const ev = correctionEvidence(joinRec, legId, items);
  run.corrections = run.corrections || [];
  run.corrections.push({
    leg_id: legId,
    seat: "prose",
    // PASS ONE, AND IT IS THE PASS WHOSE VERDICTS SENT THE LEG HERE rather
    // than whichever pass the run has reached — the same reading
    // `correctionInputPath` files the input under.
    pass: 1,
    what: `re-realized from a Packet re-rendered against the article as it stood, with a Correction `
      + `block carrying ${ev.failed.length} failed item(s) and ${ev.held.length} held preserved item(s)`,
    failed_items: ev.failed.map((f) => f.item),
    held_preserved: ev.held.map((h) => h.item),
    input: input.path,
    packet_sha: input.packet_sha,
    snapshot_before: join(snapDir, `${seq}-before-${legId}.md`),
    snapshot_after: join(snapDir, `${seq}-after-${legId}.md`),
    corrected_at: new Date().toISOString(),
    ...drift,
  });

  // The run record follows the Draft. And the corrected Leg's Reverse Outline is
  // discarded: the blind reviewer read prose that no longer exists, so keeping
  // the record would let pass two re-judge new prose against an old reading —
  // which is the failure mode this whole Harness is about, one layer in.
  run.body_sha = after.body_sha;
  delete run.correcting;
  // A CORRECTION RE-OPENS THE NEXT PASS. Its bound gains this Leg and this
  // Leg's successor, and the answers already given for pairs the widened bound
  // now covers were given about prose that has since moved.
  delete run.pass_open_at;
  delete run.pass_cleared;
  run.legs = afterLegs.map((s) => ({
    leg_id: s.leg_id, section: s.section, section_title: s.section_title,
    lines: s.lines, packet: s.packet, packet_sha: s.packet_sha,
  }));
  delete run.outlineFields[legId];
  delete run.rendered[legId];
  writeRun(ws, run);

  const stillOwed = seatsStillOwed(run, items);
  process.stdout.write(
    `corrected: ${legId}\n`
    + `  drift   ${drift.change_share}\n`
    + `          ${drift.packet_overlap}\n`
    + `  reported, never gated — what a high share means is the owner's reading\n`
    + `  snapshots ${join(snapDir, `${seq}-before-${legId}.md`)}\n`
    + `            ${join(snapDir, `${seq}-after-${legId}.md`)}\n`
    + (stillOwed.length
      ? `still owed a correction, in path order: ${stillOwed.join(", ")}\n`
      : "every Leg pass one sent to correction has been corrected. `check --draft <draft.md>` is pass two.\n"));
}

function cmdCheck(args) {
  const draftPath = argString(args, "draft", "usage: review-draft check --draft <draft.md>   (verdicts on standard input record them)");
  // The same two-phase selection `compare` makes, and read at the same point
  // and for the same reason (kogaki#1100).
  const reply = readReply();
  // `let`, BECAUSE THE RESTORE RE-READS IT (kogaki#1135). A regressed Leg is
  // put back through the realization lane, which re-emits the article — so from
  // that point on the Draft this act holds is a different document, and the
  // join is rebuilt against the one on disk rather than against the one this
  // line read.
  let draft = readDraft(draftPath);
  const ws = workspaceFor(args, slugOf(draftPath));
  const run = readRun(ws);
  requireCurrent(run, draft);
  // The ordering refusal is THIS artifact's and lands now, because it is a
  // property of the flow rather than of the second pass: pass two re-checks
  // what pass one found, and there is nothing to re-check before `compare`.
  if (!run.compared_at) {
    fail("`check` is pass two and there is no pass one — run `compare --draft <draft.md>` first. "
      + "Pass two re-runs outline and the join only for the corrected Legs, their successors' "
      + "continuity items and the mechanical items, so it has nothing to narrow to until the join has run.");
  }

  const items = readItems();
  const bound = passTwoBound(run, items);
  const priorJoin = readJoin(ws);

  // A RE-JUDGED PAIR'S PASS-ONE ANSWER IS DISCARDED WHEN THE PASS OPENS, AND
  // EXACTLY ONCE. `buildJoin` reads recorded verdicts, so leaving them would
  // make every in-bound judged pair answer itself with pass one's reading and
  // report a second pass that asked nothing — and clearing them on EVERY
  // invocation would delete pass two's own answers as fast as they were
  // recorded, which is the same silence one turn later. `correct` clears the
  // marker, so a correction landing after the pass opened re-opens it.
  //
  // AND THE PASS NUMBER MOVES HERE, BEFORE ANY EVIDENCE IS WRITTEN (kogaki#994).
  // The Reverse Outlining below is THIS pass's reading, so it belongs in this
  // pass's directory; setting the number after it would file pass two's re-read
  // under pass one and overwrite exactly the record the split exists to keep.
  //
  // THE NUMBER IS THE PASS THIS COMMAND IS, NOT A COUNTER. `check` IS pass two,
  // and a correction landing after it re-OPENS pass two — a widened bound and
  // cleared verdicts over the same corrected Legs — rather than starting a
  // third. So a re-entry sets 2 again, and its re-rendered inputs land beside
  // the ones it is replacing, which is within-pass and is what `correct`
  // discarding the Reverse Outline already means. A genuine third pass would
  // be a third act, and it gets `pass-3/` with nothing else moving.
  if (!run.pass_open_at) {
    const verdicts = run.verdicts || {};
    let cleared = 0;
    for (const key of Object.keys(verdicts)) {
      const call = (priorJoin.model_calls || []).find((c) => verdictKey(c.leg_id, c.item, c.pair) === key);
      if (call && bound.inBound(call.leg_id, call.item)) { delete verdicts[key]; cleared++; }
    }
    run.verdicts = verdicts;
    run.pass = 2;
    run.pass_open_at = new Date().toISOString();
    run.pass_cleared = cleared;
    writeRun(ws, run);
  }

  // REVERSE OUTLINING IS RE-RUN FOR THE CORRECTED LEGS AND FOR NO OTHERS. `correct`
  // discarded each corrected Leg's Reverse Outline because the reviewer read
  // prose that no longer exists; this renders the input again and refuses until
  // it comes back, which is the same blind round trip pass one made and not a
  // cheaper stand-in for it.
  const legs = resolveInputs(draft).legs;
  const owedOutline = [...bound.corrected].filter((id) => !run.outlineFields[id]);
  if (owedOutline.length) {
    const order = run.legs.map((s) => s.leg_id);
    owedOutline.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    for (const id of owedOutline) {
      if (run.rendered[id]) continue;
      run.rendered[id] = renderReverseOutlineInput(ws, run, draft, legs.find((s) => s.leg_id === id), legs);
    }
    writeRun(ws, run);
    fail(`pass two re-runs Reverse Outlining for every corrected Leg, and `
      + `${owedOutline.length} ${owedOutline.length === 1 ? "is" : "are"} outstanding. The prose `
      + "these Legs carry now is not the prose the first Reverse Outline read, so the recorded reading is "
      + `about text that is gone.\n`
      + owedOutline.map((id) => `  ${id}  ${run.rendered[id]}`).join("\n") + "\n"
      + "Read each blind and record it with `<reverse outline> | outline --draft <draft.md> --leg <id>`, "
      + "then run `check` again.");
  }

  // PASS TWO ANSWERS ITS OWN OWED SET, through `check`'s own stream and never
  // through `compare`'s. Routing them through `compare` would rebuild the
  // UNBOUNDED join against the corrected Draft — re-rendering a join Packet for
  // every pair, overwriting the pass-one record this pass carries from, and
  // resetting `compared_at` to a comparison nobody made. The two passes have
  // different owed sets by construction, so they need different doors.
  let pass = buildJoin(draft, run, items, ws,
    { pass: currentPass(run), bound: bound.inBound, carry: priorJoin.results || [] });
  let recorded = 0;
  if (reply.trim() !== "") {
    recorded = recordVerdicts(run, reply, pass.owed, items);
    pass = buildJoin(draft, run, items, ws,
      { pass: currentPass(run), bound: bound.inBound, carry: priorJoin.results || [] });
  }
  // --- THE REGRESSION GUARD (kogaki#1135) ---------------------------------
  // It fires only on a COMPLETE pass: a pair still owed has no pass-two answer,
  // and a Leg restored on a partial reading would be put back for a regression
  // the rest of the pass might not have found — and the restore is not an act
  // that can be taken twice.
  //
  // A LEG ALREADY RESTORED IS NOT RESTORED AGAIN. Verdicts are revisable by
  // design, so a later answer can fail the same pair a second time; the prose
  // is already pass one's by then, and a second restore would write a second
  // record of one event.
  const restoredAlready = new Set((run.restores || []).map((r) => r.leg_id));
  let restoredNow = [];
  if (pass.owed.length === 0) {
    const regressed = regressedPairs(run, priorJoin, pass.results)
      .filter((r) => !restoredAlready.has(r.leg_id));
    // IN PATH ORDER, the order every act that moves prose runs in.
    const order = run.legs.map((s) => s.leg_id);
    const legs = [...new Set(regressed.map((r) => r.leg_id))]
      .sort((a, b) => order.indexOf(a) - order.indexOf(b));
    for (const legId of legs) {
      draft = restoreRegressedLeg(args, {
        draft, draftPath, ws, run, legId, priorJoin,
        regressed: regressed.filter((r) => r.leg_id === legId),
        passTwoRows: pass.results.filter((r) => r.leg_id === legId),
      });
      restoredNow.push(legId);
    }
    if (restoredNow.length) {
      writeRun(ws, run);
      // THE JOIN IS REBUILT AGAINST THE RESTORED ARTICLE, and this is what
      // makes the rest of this command true rather than a report about a Draft
      // that no longer exists: the pair inputs are re-rendered from the prose
      // the reader now meets, and the verdicts they carry are the ones pass one
      // gave on exactly that prose.
      pass = buildJoin(draft, run, items, ws,
        { pass: currentPass(run), bound: bound.inBound, carry: priorJoin.results || [] });
    }
  }
  const restoredLegs = new Set((run.restores || []).map((r) => r.leg_id));
  // A ROW ON A RESTORED LEG SAYS SO. Its verdict is pass one's and its prose
  // is pass one's, and a reader who could not tell it from a pair pass two
  // re-judged and found holding would read the regression as never having
  // happened.
  for (const r of pass.results) if (restoredLegs.has(r.leg_id)) r.restored = true;

  const { results, owed, modelCalls, mechanicalLog } = pass;
  const complete = owed.length === 0;
  const cleared = run.pass_cleared || 0;
  if (recorded) process.stdout.write(`recorded: ${recorded} verdict(s)\n`);

  const joinPath = passPath(ws, run, "check.json");
  writeFileSync(joinPath, JSON.stringify({
    draft: run.draft, body_sha: run.body_sha,
    checked_at: complete ? new Date().toISOString() : null,
    item_table_version: items.version,
    complete,
    // THE BOUND IS RECORDED, not only applied. A reader of this file can see
    // which Legs and items pass two actually re-judged, which is what makes
    // "bounded" checkable rather than claimed — the same move the pass-one
    // record makes for "decided mechanically".
    bound: {
      corrected: [...bound.corrected],
      successors: [...bound.successors],
      successor_items: bound.successorItems,
      mechanical_items: [...bound.mechanical],
      verdicts_cleared: cleared,
    },
    // WHAT PASS TWO PUT BACK (kogaki#1135), on the pass's own record rather
    // than only in `run.json`: a reader of this file sees rows carrying pass
    // one's verdicts on a corrected Leg, and without this line the only
    // reading of that is a second pass that agreed with the first.
    restores: (run.restores || []).map((r) => ({
      leg_id: r.leg_id, seats: r.seats, regressed: r.regressed,
      snapshot_before: r.snapshot_before, snapshot_after: r.snapshot_after,
      restored_at: r.restored_at,
    })),
    results,
    owed,
    model_calls: modelCalls,
    mechanical: mechanicalLog,
  }, null, 2) + "\n");

  if (!complete) {
    process.stdout.write(
      `check: pass two, bounded — ${bound.corrected.size} corrected Leg(s), `
      + `${bound.successors.size} successor(s), ${bound.mechanical.size} mechanical item(s) over the whole Draft.\n`
      + `${mechanicalLog.length} pair(s) decided mechanically, no model call.\n`
      + `${owed.length} pair(s) await a verdict — one join Packet each:\n`
      + owed.map((o) => `  ${o.key}  ${o.packet}`).join("\n") + "\n"
      + "Answer each with one of holds / fails / cannot-decide plus one sentence, then\n"
      + `  <verdicts.json> | node src/review-draft.mjs check --draft ${relative(process.cwd(), draft.path) || draft.path}\n`
      + `check record: ${joinPath}\n`
      + "The regression guard and `passes.json` land when the pass is complete: a pair with no\n"
      + "answer yet has no pass-two verdict to compare against pass one's.\n");
    // THE RUN RECORD IS WRITTEN ON THIS EXIT TOO (PR #1004 round 1, finding 3).
    // `buildJoin` registered pass two's join inputs in `run.pass_files` and
    // `recordVerdicts` may have taken answers into `run.verdicts`; a return
    // that dropped both would keep the pass ledger true only on the completing
    // call and hand a partially-answered pass back to the reviewer to answer
    // again.
    writeRun(ws, run);
    return;
  }

  run.findings = results.filter((r) => r.verdict !== "holds");
  // RESIDUE IS WHAT SURVIVED TWO PASSES, and only a PRESERVED item's fail is
  // residue — the same class rule that decides what withholds `close`.
  //
  // EVERY LINE STATES WHICH IT IS (PR #906 round 1, finding 1). Declining to
  // correct is a legitimate route — `close` is reachable from `check` in every
  // state, by the owner's two-pass ruling — but a run that took it was writing
  // "still failing after pass two" onto pairs pass two never re-judged, which
  // is a provenance claim the run did not earn, handed to the owner as the
  // basis for classifying the item `packet` or `reviewdraft`. The route stays
  // open and the claim is now true either way: a re-judged fail says it
  // survived, a carried one says its Leg was never corrected so nothing
  // re-read it.
  run.residue = run.findings
    .filter((f) => f.verdict === "fails" && f.class === "preserved")
    .map((f) => ({
      leg_id: f.leg_id, item: f.item,
      // WHAT THE OWNER RECORD'S POINTERS ARE COMPOSED FROM, kept on the row: the
      // pass that read it (a carried row is pass one's whatever pass the run
      // reached) and whether a judge was handed a Packet for the chosen pair.
      pair: f.pair, carried: Boolean(f.carried), judged: chosenJudged(f),
      // A RESTORED LEG'S RESIDUE SAYS WHICH PROSE IT IS ABOUT (kogaki#1135).
      // Its Leg was corrected and the correction was UNDONE, so "still failing
      // after pass two" is true of the item and silent about the article: the
      // prose the owner will open is pass one's, and the correction that was
      // meant to fix this item is not in it.
      ...(f.restored ? { restored: true } : {}),
      why: f.carried
        ? `${f.reason} — carried from pass one and NOT re-judged: this Leg was not corrected, `
          + "so nothing in pass two read it again"
        : (f.restored
          ? `${f.reason} — still failing, and the correction made for it was UNDONE: pass two `
            + "failed an item this Leg had held, so the Leg was restored to its pass-one prose "
            + "and this is that prose's own finding, unchanged"
          : `${f.reason} — still failing after pass two`),
    }));
  run.checked_at = new Date().toISOString();

  // `passes.json` AT THE RUN ROOT (kogaki#1135). Written once the pass is
  // COMPLETE and not before: a row whose `pass_2` is "not answered yet" would
  // need a sixth outcome word for a state that is not an outcome, and the two
  // records this one is derived from are already on disk for anyone reading a
  // pass mid-flight.
  //
  // AT THE ROOT rather than under a pass, and that is the layout's own rule
  // rather than an exception to it: it is the one record that is about BOTH
  // passes, like `run.json` and `snapshots/`, so it belongs where they are. A
  // copy under `pass-2/` would be pass two writing a claim about pass one's
  // reading in pass one's own vocabulary.
  const passesPath = join(ws, "passes.json");
  const passes = buildPasses(run, priorJoin, results);
  writeFileSync(passesPath, JSON.stringify({
    draft: run.draft, body_sha: run.body_sha, written_at: run.checked_at,
    outcomes: passes.counts,
    // A key pass two produced that pass one never answered. Empty on every run
    // this Harness can currently produce, and named rather than dropped: the
    // five outcome words are all about a pair with two readings, and a pair
    // with one is a disagreement between the passes about what exists.
    pass_two_only: passes.pass_two_only,
    rows: passes.rows,
  }, null, 2) + "\n");
  run.passes_file = passesPath;

  writeRun(ws, run);

  const judged = modelCalls.length;
  // NAMED IN THE RUN'S OWN OUTPUT, not only in the record. A pass two that
  // completed because nothing was corrected and a pass two that completed
  // because every correction was made produce the same exit, and telling them
  // apart is exactly what "stopping early and finishing produce the same
  // silence" warns about.
  // PER SEAT, NOT PER LEG (kogaki#945). `bound.corrected` holds every Leg
  // carrying ANY correction, so keying this line on it reported nothing for a
  // Leg that owed both seats and received one — the seat still owed went
  // unnamed while its preserved fails were carried as residue.
  const uncorrected = seatsStillOwed(run, items);
  process.stdout.write(
    results.filter((r) => !r.carried).map(comparisonLine).join("\n") + "\n\n"
    + `check: pass two over ${results.filter((r) => !r.carried).length} re-judged (Leg, item) pair(s); `
    + `${results.filter((r) => r.carried).length} carried unchanged from pass one.\n`
    + `  corrected Legs      ${[...bound.corrected].join(", ") || "(none)"}\n`
    + `  successors re-checked ${[...bound.successors].join(", ") || "(none)"} on ${bound.successorItems.join(", ")}\n`
    + `  mechanical items      re-run over every Leg\n`
    + `${mechanicalLog.length} pair(s) decided mechanically and ${judged} judged.\n`
    + judgedByLine(modelCalls)
    + (uncorrected.length
      ? `UNCORRECTED — pass one sent these to correction and they are still owed: ${uncorrected.join(", ")}.\n`
        + "  An entry marked `(--figure)` is the figure seat; the rest are the passage. A Leg can\n"
        + "  appear on both, and a Leg that received one seat still appears for the other.\n"
        + "  Their preserved fails are residue CARRIED from pass one, not re-judged by this pass;\n"
        + "  the owner record says so per line. `correct --leg <id> [--figure]` is the act that changes that.\n"
      : "")
    + (restoredNow.length
      ? `RESTORED — pass two failed an item these Legs had HELD in pass one, so each is back at `
        + `its pass-one prose: ${restoredNow.join(", ")}.\n`
        + "  The correction was undone, not adjusted, and the item it was made for is residue\n"
        + "  again. Only the regressed Leg moved: a later corrected Leg keeps its corrected\n"
        + "  prose and carries no mark, because Leg-to-Leg continuity is the Reader Path's and\n"
        + "  not this Harness's.\n"
        + (run.restores || []).filter((r) => restoredNow.includes(r.leg_id))
          .map((r) => `  ${r.leg_id}  held then failed: `
            + `${r.regressed.map((x) => x.item).join(", ")}\n`
            + `          snapshots ${r.snapshot_before}\n`
            + `                    ${r.snapshot_after}\n`).join("")
      : "")
    + (run.residue.length
      ? `residue — preserved item(s) reaching the owner to classify: `
        + `${run.residue.map((r) => `${r.leg_id}/${r.item}`).join(", ")}\n`
      : "no preserved item fails after pass two, so the residue is empty.\n")
    + `check record: ${joinPath}\n`
    + `both passes:  ${passesPath} — one row per Leg, item and pair, with each pass's\n`
    + "              verdict and one outcome word: "
    + `${PASS_OUTCOMES.join(", ")}.\n`
    + "`close --draft <draft.md>` writes the owner record.\n");
}

function cmdClose(args) {
  const draftPath = argString(args, "draft", "usage: review-draft close --draft <draft.md>");
  const ws = workspaceFor(args, slugOf(draftPath));
  const run0 = readRun(ws);
  // Read once for the whole record: every evidence pointer below needs to know
  // whether its row's reverse side is the passage's Reverse Outline or the
  // figure's, and that is a fact about the item table.
  const figureIds = figureItemIds(readItems());
  // THE RE-RUN REFUSAL COMES FIRST, BEFORE THE DRAFT IS READ (kogaki#994), AND
  // IT IS KEYED ON THE RESTORE RATHER THAN ON THE CLOSE. A close that restored
  // has put `draft.md` back to the Draft it reviewed, so `requireCurrent` would
  // meet the restored original and report it as a Draft edited under the run —
  // true of the bytes and false about what happened; and a second `close` that
  // got past it would copy that original over the reviewed Draft, which is the
  // loss this issue exists to end, one file over.
  //
  // A close that restored NOTHING is a different act and stays re-runnable: no
  // correction was made, `draft.md` never moved, and the record is one per Draft
  // and overwritten on re-run, which is a contract this refusal must not take
  // away to buy a guard against a write that cannot happen.
  if (run0.restored_from) {
    fail(`this run is closed. The reviewed Draft was written to ${run0.reviewed_draft}, and `
      + `${resolve(draftPath)} was restored to the Draft that was reviewed. Running \`close\` again `
      + "would copy that restored original over the reviewed Draft.\n"
      + `  record  ${join(dirname(resolve(draftPath)), "review.md")}\n`
      + "To review the corrected article, `open` a new run on it.");
  }
  const draft = readDraft(draftPath);
  const run = run0;
  requireCurrent(run, draft);

  if (!run.compared_at) {
    // AN UNFILLED JOIN AND AN UNRUN ONE ARE DIFFERENT REFUSALS, because they
    // have different repairs: one needs `compare` run, the other needs the
    // verdicts it is still waiting on. Reporting both as "compare has not run"
    // would send a reviewer who has already compared back to the act they just
    // performed.
    if (run.join_state) {
      fail(`the join has run and is UNFILLED — ${run.join_state}. \`close\` writes the owner `
        + "record, and a record written over unanswered pairs would render them as no findings, "
        + "which reads as a clean review. Answer the join Packets under the workspace's `join/` "
        + "directory and record them with `<verdicts.json> | compare --draft <draft.md>`.");
    }
    fail("`close` is reachable from `compare` with zero fails, or from `check` in every state — "
      + "and neither has run. Run `compare --draft <draft.md>` first.");
  }
  // ONLY A **PRESERVED** ITEM'S FAIL WITHHOLDS `close` (kogaki#872). The item
  // table makes the class the CONSEQUENCE: a preserved fail sends its Leg to
  // correction, and a best-effort fail rides along only when that Leg is
  // re-realized anyway. A guard counting every fail would send a Leg to pass
  // two for a best-effort finding, which is the opposite of riding along — and
  // it would make `close` unreachable on a Draft whose only findings are ones
  // the design says to carry rather than to act on. Found on the first live
  // drive, where a best-effort item fired on every Leg.
  // A LOCALIZED SECTION FAIL WITHHELD IT THE SAME WAY (kogaki#873) UNTIL THE
  // READER THAT PRODUCED ONE WAS REMOVED (kogaki#1133). A failing preserved
  // LEG item is now the whole of what withholds this record.
  const fails = (run.findings || []).filter((f) => f.verdict === "fails" && f.class === "preserved");
  if (fails.length && !run.checked_at) {
    fail(`the join found ${fails.length} failing PRESERVED item(s), so \`close\` is reachable only `
      + "through `check` — pass two is what turns a failing preserved item into a correction or into "
      + `residue. A best-effort fail does not withhold the record; it rides along. Failing: `
      + `${fails.map((f) => `${f.leg_id}/${f.item}`).join(", ")}`);
  }

  const out = join(dirname(resolve(draftPath)), "review.md");
  const reviewedPath = join(dirname(resolve(draftPath)), REVIEWED_BASENAME);
  // THE DRAFT THAT WAS REVIEWED is the article as the first correction found
  // it — the snapshot that correction took before entering the realization
  // lane. With no correction, nothing moved and the reviewed Draft is the
  // Draft: both files are written and both are the same bytes, which is the
  // true report rather than a missing file the reader has to interpret.
  const firstSnapshot = (run.corrections || [])[0]?.snapshot_before ?? null;
  if (firstSnapshot && !existsSync(firstSnapshot)) {
    fail(`the first correction's snapshot is gone — ${firstSnapshot}. It is the Draft this run `
      + `reviewed, and \`close\` restores ${resolve(draftPath)} from it. Without it the reviewed `
      + "article and the reviewed Draft cannot both be produced, so this refuses rather than "
      + "leaving the corrected article at the path the record calls the original.");
  }
  const now = new Date().toISOString();
  const lines = [
    `# Review — ${run.slug}`,
    "",
    "This record is the owner's. The residue at the end carries one empty",
    "`classified:` field per line, and this tool never fills it: what a surviving",
    "item is evidence about — the Packet, or ReviewDraft itself — is the judgment",
    "the two-pass bound exists to hand over.",
    "",
    "## What was reviewed",
    "",
    // BOTH FILES ARE NAMED (kogaki#994). The record's reader is looking for
    // the review's product, and a record naming only the path it restored
    // would send them to the article the review started from.
    `- **Draft reviewed.** \`${relative(dirname(out), resolve(draftPath)) || basename(draftPath)}\``
      + " — restored to the article this run read, byte for byte.",
    `- **Reviewed Draft.** \`${relative(dirname(out), reviewedPath) || REVIEWED_BASENAME}\``
      + (firstSnapshot
        ? ` — the article with this run's ${run.corrections.length} correction(s) in it`
          // A RESTORED LEG'S CORRECTION IS NOT IN IT (kogaki#1135), and the
          // count above is of corrections MADE. Saying only the count would
          // describe a document that does not exist.
          + ((run.restores || []).length
            ? `, less the ${run.restores.length} undone by pass two `
              + `(${run.restores.map((r) => r.leg_id).join(", ")}).`
            : ".")
        : " — no correction was made, so it is byte-identical to the Draft above."),
    `- **Body sha.** \`${run.body_sha}\``,
    `- **Opened.** ${run.opened_at}`,
    `- **Closed.** ${now}`,
    `- **Passes.** ${run.checked_at ? "two (compare, check)" : "one (compare)"}`,
    "",
    "### The Packets it was reviewed against",
    "",
    ...run.legs.map((s) => `- \`${s.leg_id}\` — \`${s.packet}\` sha \`${s.packet_sha}\``),
    "",
    // ITEM 4 OF kogaki#994. A finding names a Leg and an item; the two
    // artefacts that make it checkable — the input the judge was handed and
    // the record the blind reviewer wrote — live in the pass directory, and
    // until this the record pointed at neither. `runs/` is machine state and is
    // pruned, so the paths are named as the form they have rather than
    // promised to be there: a reader whose workspace has been pruned learns
    // what was pruned rather than that nothing was written.
    "### Where this run's evidence is",
    "",
    `The workspace is \`${ws}\` — machine state, gitignored and pruned to the last few`,
    "runs. Each pass wrote only under its own directory:",
    "",
    ...evidenceLines(ws, run, dirname(out)),
    "",
    "## Findings",
    "",
  ];
  if (!run.findings.length) {
    lines.push(run.join_state
      ? `_None recorded — ${run.join_state}. This is an unfilled join, not a clean review._`
      : "_None._", "");
  } else {
    // EVERY FINDING CARRIES ITS CLASS, because the class is the consequence:
    // a preserved item's `fails` sends the Leg to correction and a
    // best-effort one's rides along if that Leg is re-realized anyway. A
    // findings list that rendered the verdict alone would leave the owner to
    // look the consequence up.
    for (const f of run.findings) {
      lines.push(`- **${f.leg_id} / ${f.item}** — ${f.verdict} (${f.class ?? "unclassed"})`);
      if (f.reason) lines.push(`  - ${f.reason}`);
      // THE QUOTED MATERIAL LIVES HERE, and this is the other half of the
      // comparison line's no-numbers rule: the line refuses to carry a quote,
      // so the owner record is where a finding becomes actionable rather than
      // merely located.
      for (const e of [].concat(f.evidence ?? [])) lines.push(`  - evidence: ${e}`);
      if (f.declared) lines.push(`  - declared: ${f.declared}`);
      if (f.reverse) lines.push(`  - reverse: ${f.reverse}`);
      if (f.span) lines.push(`  - span: ${JSON.stringify(f.span)}`);
      // THE TWO ARTEFACTS BEHIND THE VERDICT (kogaki#994 item 4). `run.findings`
      // is pass two's once `check` has run and pass one's before, and a carried
      // row is pass one's either way — the row says which, and the pointer
      // follows the row.
      for (const l of findingEvidencePaths(ws, run, f, figureIds, dirname(out))) lines.push(l);
    }
    lines.push("");
  }

  lines.push("## Corrections", "");
  if (!run.corrections.length) {
    lines.push(run.checked_at
      ? "_None made — pass two ran over the mechanical items and carried the rest._"
      : "_None — `correct` is the act that makes one, and it has not run._", "");
  } else {
    for (const c of run.corrections) {
      lines.push(`- **${c.leg_id}** (pass ${c.pass}) — ${c.what}`);
      if (c.change_share !== undefined) lines.push(`  - change share: ${c.change_share}`);
      if (c.packet_overlap !== undefined) lines.push(`  - packet overlap: ${c.packet_overlap}`);
      // THE RESTORE IS RECORDED UNDER THE LEG IT UNDID (kogaki#1135), beside
      // the correction rather than in a list of its own: what the owner is
      // reading here is what happened to this Leg, and a correction whose
      // effect was removed is not a correction the article carries.
      for (const r of (run.restores || []).filter((x) => x.leg_id === c.leg_id)) {
        lines.push(`  - **RESTORED in pass two.** ${r.what}. The corrected prose is not in the `
          + "article; this Leg carries the prose it carried in pass one.");
        for (const g of r.regressed) {
          lines.push(`    - \`${g.item}\`${g.pair === null || g.pair === undefined ? "" : ` pair ${g.pair}`}`
            + ` — held in pass one, failed in pass two: ${g.reason}`);
        }
        lines.push(`    - before: \`${relative(dirname(out), r.snapshot_before) || r.snapshot_before}\``,
          `    - after: \`${relative(dirname(out), r.snapshot_after) || r.snapshot_after}\``);
      }
    }
    lines.push("");
  }

  lines.push("## Residue", "",
    "Each line is an item that survived every pass this run made. Fill",
    "`classified:` with `packet` or `reviewdraft`.", "");
  if (!run.residue.length) {
    lines.push("_None._", "");
  } else {
    for (const r of run.residue) {
      lines.push(`- **${r.leg_id} / ${r.item}** — ${r.why}`);
      // A RESIDUE LINE PASS TWO RE-JUDGED POINTS AT PASS TWO; ONE IT CARRIED
      // POINTS AT PASS ONE, which is the only pass that read it. The row carries
      // the distinction its own `why` was written from.
      for (const l of findingEvidencePaths(ws, run, r, figureIds, dirname(out))) lines.push(l);
      lines.push("  classified:");
    }
    lines.push("");
  }

  // A trailing newline, like every other write in this file: `review.md` is
  // repo-visible and committed, so without one it lands as a no-final-newline
  // file in every diff that touches it (PR #882 round 1, finding 6).
  writeFileSync(out, lines.join("\n") + "\n");

  // THE TWO ARTICLE WRITES ARE THE LAST ACTS, AND THEIR ORDER IS NOT A
  // PREFERENCE. The reviewed Draft is written first, so a failure between the
  // two leaves the corrections on disk under BOTH names rather than under
  // neither; restoring first and failing second would lose them outright.
  writeFileSync(reviewedPath, draft.text);
  if (firstSnapshot) writeFileSync(resolve(draftPath), readFileSync(firstSnapshot, "utf8"));

  run.reviewed_draft = reviewedPath;
  run.reviewed_at = now;
  run.restored_from = firstSnapshot;
  run.closed_at = now;
  writeRun(ws, run);
  process.stdout.write(
    `review record:  ${out}\n`
    + `reviewed Draft: ${reviewedPath}\n`
    + (firstSnapshot
      ? `restored:       ${resolve(draftPath)} — the Draft this run reviewed, from ${firstSnapshot}\n`
      : `unchanged:      ${resolve(draftPath)} — no correction was made\n`));
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
