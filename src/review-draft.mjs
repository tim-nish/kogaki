#!/usr/bin/env node
// review-draft — the ReviewDraft Harness: the round-trip review of a
// CanonicalDraft against the Packets that produced it (kogaki#869 tracking,
// kogaki#870 this artifact).
//
// THE INPUTS ARE CLOSED, AND THAT IS THE WHOLE OF THE DESIGN. This command
// reads three things: `theses/<slug>/draft.md`; its frontmatter trace, which
// after kogaki#868 carries each Step's line range and its Packet's path and
// sha; and the Packet files those entries name. It reads no Brief, no Move
// file, no Strand. The owner's 2026-09-04 ruling is why:
//
//   "The Packet was specifically designed to be the only source required to
//    generate the Draft without reading the Step or Move files separately.
//    Therefore, ReviewDraft should compare the Draft against the Packet. If
//    ReviewDraft later turns out to require Move information or any other
//    separate file, that should be treated as evidence that the Packet is
//    missing information, and that information should be added to the Packet
//    instead."
//
// So a check that needs anything else is a PACKET GAP and is filed against
// `src/packet-template.md`. It is never satisfied by a side read, and the
// absence of any such read here is the mechanical half of that ruling: there
// is no code path in this file that opens a Brief, a Move or a Strand, which
// is a stronger statement than a rule saying not to.
//
// THE HARNESS OWNS THE ORDERING (the same ruling `.claude/skills/draft/SKILL.md`
// records for /draft): `recover` refuses a Step whose recovery input it did not
// render, `compare` refuses while any Step or Section entry is missing, `check`
// refuses before `compare`, and `close` is reachable from `compare` with zero
// fails or from `check` in every state. A session does not sequence these acts
// and cannot get the sequence wrong.
//
// THE COMPARISON IS FIXED IN THE HARNESS (kogaki#872). `src/review-items.json`
// decides which Packet information must be recoverable per item class, which
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
// recovery input's record schema (kogaki#871); the item classes, the
// three-valued verdict and the mechanical checks (kogaki#872); the cold
// reader's Section pairing and where a Section finding goes (kogaki#873); and
// the correction path with its bounded second pass (kogaki#874).
//
// FIGURES REMAIN OUT OF SCOPE for this batch (kogaki#869) — they change the
// Step schema and the Packet, so they are a later batch and not a hole here.
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
//       SPEC-draft-pipeline "The figure decision — `figure:` and `figure_roles` on a Step"
//   the figure record
//       SPEC-draft-pipeline "The figure record — the form's instance, filled after the prose"
//   the renderer
//       SPEC-draft-pipeline "The renderer and the anchor — markup from the record, at the Step"
//   the lifetimes rule
//       specs/spec-brief-draft-design/DESIGN.md "Lifetimes: what is owner state and what is machine state"
//   the frontmatter trace
//       SPEC-draft-command "The three-layer boundary"
//
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, resolve, dirname, basename, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
// A NODE BUILTIN, so the closed-input allowlist below is satisfied as it is
// WORDED ("only node builtins and ./runs.mjs") rather than widened past its
// own property. It is here for exactly one act: `correct` re-enters the
// realization lane as a subprocess, because a corrected Step must be realized
// by the same renderer that wrote the Packets. Nothing here reads a Brief, a
// Move or a Strand — the reviewer's blindness is a property of what this
// module READS, and it reads none of them.
import { spawnSync } from "node:child_process";
import { enterRun } from "./runs.mjs";
// ONE PARSER FOR A `step` BLOCK, and it is the Brief's (kogaki#1014). The
// Reverse Outline is a Brief Step block, so it is read by the function
// `parseBrief` calls per fenced block rather than by a second reader here.
import { parseStepBlock, stepField } from "./draft.mjs";

function fail(msg) {
  process.stderr.write(`review-draft: ${msg}\n`);
  process.exit(1);
}

function sha256(s) {
  return createHash("sha256").update(s).digest("hex");
}

// The omitted-value guard draft.mjs carries, inherited unchanged: a bare
// `--draft` parses as boolean true and String(true) reaches readFileSync as a
// filename.
function argString(args, key, usage) {
  const v = args[key];
  if (typeof v !== "string" || v === "") fail(usage);
  return v;
}

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
// Reading the Draft. The trace is the join key between prose and Packet, and
// every refusal below names the Step rather than the file: a reviewer holding
// a Step id can act, and one holding "the trace is malformed" cannot.

// THE FRONTMATTER IS READ, NEVER PARSED AS GENERAL YAML. `emit` writes each
// trace entry as exactly one `  - {json}` line (src/draft.mjs cmdEmit), so the
// reader that matches that write is a line scan — and a general parser would be
// a second grammar that can disagree with the writer about what was written.
function readDraft(draftPath) {
  if (!existsSync(draftPath)) fail(`no Draft at ${draftPath}`);
  const text = readFileSync(draftPath, "utf8");
  const lines = text.split("\n");
  if (lines[0] !== "---") {
    fail(`${draftPath} opens with no frontmatter — a CanonicalDraft carries its record half in `
      + "frontmatter, and without it there is no trace to review against");
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") { end = i; break; }
  }
  if (end === -1) fail(`${draftPath} has an unterminated frontmatter block`);

  const trace = [];
  let inTrace = false;
  // THE `brief:` LINE IS READ AND NOTHING ELSE IS DONE WITH IT HERE. It is the
  // one frontmatter field `correct` needs — the correction path goes back
  // through the realization lane, and that lane is entered by its Brief — and
  // it is read by the same line scan the trace is, for the same reason: `emit`
  // writes it as one line and a general YAML parser would be a second grammar
  // that can disagree with the writer.
  //
  // THIS IS NOT THE CLOSED-INPUT ALLOWLIST BREAKING (the owner's 2026-09-04
  // ruling). The ruling binds what the REVIEWER reads: a comparison that needs
  // the Brief, a Move or a Strand is a Packet gap. Nothing here reads the
  // Brief's content — the path is handed to `src/draft.mjs`, the renderer that
  // wrote the Packets in the first place, as an argument to a subprocess. The
  // reviewer's blindness is untouched, and this module still imports only node
  // builtins and ./runs.mjs.
  let brief = null;
  for (let i = 1; i < end; i++) {
    const m = lines[i].match(/^brief: (.+?)\s*$/);
    if (m) { brief = m[1]; break; }
  }
  for (let i = 1; i < end; i++) {
    const l = lines[i];
    if (l === "trace:") { inTrace = true; continue; }
    if (inTrace) {
      const m = l.match(/^ {2}- (\{.*\})\s*$/);
      if (m) {
        try { trace.push(JSON.parse(m[1])); }
        catch (e) { fail(`trace entry ${trace.length + 1} in ${draftPath} is not readable JSON (${e.message})`); }
        continue;
      }
      // A non-entry line ends the block: `emit` writes the trace last, so
      // anything else at this indent is a different key.
      if (!l.startsWith("  ")) inTrace = false;
    }
  }
  if (!trace.length) {
    fail(`${draftPath} carries no trace entries — ReviewDraft reviews the Draft against the `
      + "Packets its trace names, and a Draft with no trace names none");
  }

  // The body is everything after the closing `---` and the blank line the
  // `\n\n` join leaves. Line numbers in the trace are 1-based over the FILE,
  // frontmatter included, which is what an editor shows.
  //
  // THE FINAL EMPTY ELEMENT IS DROPPED, AND THAT IS WHAT MAKES `body_sha` THE
  // SAME NUMBER ON BOTH SIDES (PR #882 round 1, finding 2). `emit` writes
  // `fm + "\n\n" + body + "\n"` and records `sha256(body)`; splitting that file
  // on newlines leaves a trailing "" that the naive slice re-joins as a final
  // "\n", so this hashed `body + "\n"` and an owner comparing
  // `runs/draft/<slug>/last-emit.json` against the `**Body sha.**` line in
  // `review.md` saw two different hexes for an unedited Draft. Nothing broke —
  // `requireCurrent` only ever compared this value against itself — which is
  // exactly why it could ship: the divergence is invisible to every reader
  // except the owner, who is the one it misleads.
  const bodyLines = lines.slice(end + 2);
  if (bodyLines.length && bodyLines[bodyLines.length - 1] === "") bodyLines.pop();
  const body = bodyLines.join("\n");
  return { path: draftPath, text, lines, frontmatterEnd: end, body, body_sha: sha256(body), trace, brief };
}

// Verify the trace's inputs and hand back the Steps and Sections. Three
// refusals, each naming its Step: no line range, a Packet that is absent, and
// a Packet whose sha differs from the trace's — the last one meaning the Draft
// was not produced from this Packet, which is the condition that makes every
// later comparison meaningless rather than merely wrong.
function resolveInputs(draft) {
  const dir = dirname(draft.path);
  const steps = [];
  for (const t of draft.trace) {
    const id = typeof t.step_id === "string" ? t.step_id : "(unnamed)";
    if (!Array.isArray(t.lines) || t.lines.length !== 2
        || !Number.isInteger(t.lines[0]) || !Number.isInteger(t.lines[1])) {
      fail(`step ${id} carries no line range in the trace — ReviewDraft locates each Step's prose `
        + "by the range kogaki#868 writes, and a Draft emitted before that lands must be re-emitted "
        + "(node src/draft.mjs emit --brief <brief.md>)");
    }
    if (typeof t.packet !== "string" || typeof t.packet_sha !== "string") {
      fail(`step ${id} names no Packet in the trace — the Packet is the only source ReviewDraft `
        + "compares against, so a Step without one cannot be reviewed; re-emit the Draft after "
        + "rendering its Packets");
    }
    const packetPath = resolve(dir, t.packet);
    if (!existsSync(packetPath)) {
      fail(`step ${id}: the Packet the trace names is absent — ${packetPath}. The run workspace is `
        + "machine state and is pruned; re-render it with "
        + "`node src/draft.mjs packet --brief <brief.md> --step " + id + "`");
    }
    const actual = sha256(readFileSync(packetPath, "utf8"));
    if (actual !== t.packet_sha) {
      fail(`step ${id}: the Packet's sha differs from the trace's — the Draft was not produced from `
        + `this Packet.\n  trace  ${t.packet_sha}\n  file   ${actual}\n  at     ${packetPath}\n`
        + "Reviewing prose against an input that did not produce it compares two unrelated things, "
        + "so this refuses rather than reporting findings nobody can act on.");
    }
    // The range is 1-based over the file; slice is 0-based and end-exclusive.
    const prose = draft.lines.slice(t.lines[0] - 1, t.lines[1]).join("\n");
    // THE FIGURE IS RESOLVED ON THE SAME TERMS THE PACKET IS (kogaki#880).
    // The renderer rule gives a figure-carrying Step a `figure` entry naming the validated
    // record, its sha and its own line range, and a Step declaring none carries
    // NO `figure` KEY AT ALL — an absent field rather than a null one — so the
    // presence test below is the same fact the spec writes.
    //
    // THREE REFUSALS, EACH THE FIGURE'S COUNTERPART OF A REFUSAL ABOVE, and
    // they are here rather than at the first item that reads the record because
    // a Draft whose figure record moved is one whose whole figure half is
    // meaningless — the same reason the Packet's sha is checked before any item
    // is computed rather than at the item that first needs a block.
    let figure = null;
    if (t.figure !== undefined && t.figure !== null) {
      const f = t.figure;
      if (!Array.isArray(f.lines) || f.lines.length !== 2
          || !Number.isInteger(f.lines[0]) || !Number.isInteger(f.lines[1])) {
        fail(`step ${id}: its trace entry carries a figure with no line range — the renderer records the `
          + "figure's own range beside the Step's prose range, and without it the blind recovery "
          + "has no block to quote; re-emit the Draft (node src/draft.mjs emit --brief <brief.md>)");
      }
      if (typeof f.record !== "string" || typeof f.record_sha !== "string") {
        fail(`step ${id}: its trace entry carries a figure naming no record — the record is the `
          + "declared side of every figure item, so a figure without one cannot be reviewed");
      }
      const recordPath = resolve(dir, f.record);
      if (!existsSync(recordPath)) {
        fail(`step ${id}: the figure record the trace names is absent — ${recordPath}. The run `
          + "workspace is machine state and is pruned; re-record it with "
          + `\`node src/draft.mjs figure --brief <brief.md> --step ${id} --file <record.json>\``);
      }
      const recordText = readFileSync(recordPath, "utf8");
      const recordActual = sha256(recordText);
      if (recordActual !== f.record_sha) {
        fail(`step ${id}: the figure record's sha differs from the trace's — the Draft was not `
          + `emitted from this record.\n  trace  ${f.record_sha}\n  file   ${recordActual}\n`
          + `  at     ${recordPath}\n`
          + "The rendered block the reader met came from the record as it stood at emit; comparing "
          + "it against a record edited since compares two unrelated things.");
      }
      let record;
      try { record = JSON.parse(recordText); }
      catch (e) {
        fail(`step ${id}: the figure record at ${recordPath} is not readable JSON (${e.message}) `
          + "— it was written by `draft.mjs figure` and validated then, so a record unreadable now "
          + "was edited outside the Harness");
      }
      figure = {
        position: f.position,
        record: f.record,
        record_path: recordPath,
        record_sha: f.record_sha,
        lines: f.lines,
        rendered: draft.lines.slice(f.lines[0] - 1, f.lines[1]).join("\n"),
        record_json: record,
      };
    }
    steps.push({
      step_id: id,
      section: t.section,
      section_title: t.section_title,
      lines: t.lines,
      packet: t.packet,
      packet_path: packetPath,
      packet_sha: t.packet_sha,
      prose,
      figure,
    });
  }
  // Sections come from the trace's own grouping, never from a heading scan of
  // the body: `emit` maps each Step to its Section (kogaki#823), and re-deriving
  // it here would be a second answer to a question the trace already answers.
  const sections = [];
  for (const s of steps) {
    let sec = sections.find((x) => x.index === s.section);
    if (!sec) { sec = { index: s.section, title: s.section_title, steps: [] }; sections.push(sec); }
    sec.steps.push(s.step_id);
  }
  sections.sort((a, b) => a.index - b.index);
  return { steps, sections };
}

// ---------------------------------------------------------------------------
// The workspace. Machine state under `runs/review/<slug>/`, the same lifetime
// rule every other lane's workspace has: disposable, pruned to
// the last K, never the artifact.

function slugOf(draftPath) {
  return basename(dirname(resolve(draftPath)));
}

// `--workspace` IS A BASE AND THE SLUG IS JOINED ONTO IT — the same reading
// `src/draft.mjs`'s own `workspaceFor` gives the flag (PR #882 round 1,
// finding 3). Returning the flag verbatim made two Drafts driven under one
// `--workspace` share a single `run.json`, so the second `open` overwrote the
// first run's rendered inputs and recoveries with no error and no trace. Two
// commands whose flag has the same name and different arity is the homonym
// defect; the sibling's reading is the one that was already load-bearing.
function workspaceFor(args, slug) {
  if (typeof args.workspace === "string" && args.workspace !== "") {
    const dest = join(args.workspace, slug);
    mkdirSync(dest, { recursive: true });
    return dest;
  }
  return enterRun("review", slug);
}

function runRecordPath(ws) { return join(ws, "run.json"); }

function readRun(ws) {
  const p = runRecordPath(ws);
  if (!existsSync(p)) {
    fail(`no run record at ${p} — the run has not been opened; run `
      + "`node src/review-draft.mjs open --draft <draft.md>` first");
  }
  try { return JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { fail(`the run record at ${p} is not readable (${e.message})`); }
}

function writeRun(ws, run) {
  writeFileSync(runRecordPath(ws), JSON.stringify(run, null, 2) + "\n");
}

// ---------------------------------------------------------------------------
// THE WORKSPACE IS SPLIT BY PASS, AND THE SPLIT IS THE CONTRACT (kogaki#994).
//
// Until this, pass two wrote `recovery/<step>.md`, `recovered/<step>.json` and
// `join/<step>.<item>.md` at the paths pass one had used, so the corrected
// Steps' first-pass evidence was overwritten in place. `runs/` is gitignored,
// so nothing else held a copy: pass one's blind reading of the ORIGINAL Draft,
// and every pair input judged against it, were gone — and the surviving
// verdicts in `join.json` indexed into recovered records that no longer
// existed. A rule saying "do not overwrite" would be prose where a refusal
// belongs, so the layout is the Harness's:
//
//   runs/review/<slug>/pass-1/{recovery,recovered,join,ledger,corrections,
//                              cold-reader.md,join.json}
//   runs/review/<slug>/pass-2/{recovery,recovered,join,check.json}
//   runs/review/<slug>/snapshots/     — before/after per corrected Step
//   runs/review/<slug>/run.json
//
// A later third pass is `pass-3/` and NOTHING ELSE MOVES: the pass number is a
// run-record field, so a pass gains a directory rather than the layout gaining
// a rule. `snapshots/` and `run.json` stay at the workspace root deliberately —
// a snapshot pair spans the correction that separates two passes, and the run
// record is the one file every pass writes.

// The pass the run is ON. Absent on a record written before this split, which
// reads as pass one — the pass such a record's evidence was in fact written by.
//
// WHAT THAT DEFAULT DOES NOT DO IS RESOLVE THE OLD PATHS (PR #1004 round 1,
// finding 4). A pre-split run's evidence sits at the workspace ROOT, not under
// `pass-1/`, so a run open across this change meets `readJoin` refusing at
// `pass-1/join.json` and is repaired by re-opening it — `runs/` is machine
// state, pruned by design, and re-opening is the repair the workspace's own
// lifetime rule already assumes. The default is about the pass a record BELONGS
// to, never about where its files are.
function currentPass(run) {
  const p = run.pass;
  if (p === undefined || p === null) return 1;
  if (!Number.isInteger(p) || p < 1) {
    fail(`the run record carries an unreadable pass number (${JSON.stringify(p)}). The pass is what `
      + "names the directory this act's evidence belongs in, so there is nowhere to write until it "
      + "is a whole number of at least 1.");
  }
  return p;
}

function passDirFor(ws, pass) { return join(ws, `pass-${pass}`); }

// A pass a CALLER named, checked rather than trusted. Both join builders take
// one, and a missing or malformed value is a wiring defect in this file rather
// than a state a run can reach, so it refuses by naming the site.
function requirePass(pass, site) {
  if (!Number.isInteger(pass) || pass < 1) {
    fail(`${site} was called without the pass it is building for `
      + `(${JSON.stringify(pass)}). The pass is the caller's — \`compare\` is one and \`check\` is `
      + "two — and there is no default, because a wrong default files a pass's pair inputs under "
      + "another pass's directory.");
  }
  return pass;
}

// THE REVIEWED DRAFT HAS ITS OWN FILENAME, AND `draft.md` STAYS THE DRAFT THAT
// WAS REVIEWED (kogaki#994). `correct` re-realizes a Step through the draft
// lane, and that lane emits to `theses/<slug>/draft.md` — so during a run the
// article at that path IS the correction in progress, which is what makes each
// later correction's "article so far" block current. What was wrong was leaving
// it there: the only signal a review had happened was a modified working tree,
// and the Draft that was actually reviewed was reachable only through git or
// through the first snapshot. `close` ends the run by writing the corrected
// article beside the original under this name and restoring `draft.md` from the
// snapshot the first correction took, so a reader has both documents and the
// diff between them is the review.
const REVIEWED_BASENAME = "draft.reviewed.md";

// The workspace-relative key a path is registered under. Relative so the ledger
// survives a workspace that moves, and posix-separated so the key a run records
// on one platform is the key it reads back on another.
function passKey(ws, dest) {
  return relative(resolve(ws), resolve(dest)).split(sep).join("/");
}

// COMPOSE A PATH UNDER THE PASS THE RUN IS ON, AND REGISTER IT. Two refusals,
// and they are different mistakes:
//
//   - the composed path leaves this pass's directory — a segment escaped, so
//     the write would land where no pass owns it;
//   - the path was written by ANOTHER pass — the overwrite this issue exists to
//     make impossible, refused by name and naming both passes.
//
// The registration rides the run record the caller already persists, so the
// ledger is written by the same `writeRun` the act's other state is.
function passPath(ws, run, ...segments) {
  return passPathAt(ws, run, currentPass(run), ...segments);
}

// The same act with the pass NAMED rather than read off the record. One caller:
// `compare`, which IS pass one whatever pass the run has since reached.
function passPathAt(ws, run, pass, ...segments) {
  const dir = passDirFor(ws, pass);
  const dest = resolve(join(dir, ...segments));
  const root = resolve(dir) + sep;
  if (!dest.startsWith(root)) {
    fail(`pass ${pass} composed a path outside its own directory — ${dest}. Every pass writes only `
      + `under ${dir}, so a segment that escapes it is refused rather than written somewhere no `
      + "pass owns.");
  }
  const key = passKey(ws, dest);
  run.pass_files = run.pass_files || {};
  const owner = run.pass_files[key];
  if (owner !== undefined && owner !== pass) {
    fail(`refused: pass ${pass} would write over a file pass ${owner} wrote — ${dest}. Each pass's `
      + "evidence is its own record of what a reviewer read and judged, and pass "
      + `${owner}'s reading is not recoverable once this write lands. Pass ${pass}'s copy belongs `
      + `under ${dir}.`);
  }
  run.pass_files[key] = pass;
  mkdirSync(dirname(dest), { recursive: true });
  return dest;
}

// A path REGISTERED to a pass, read back. `check` reads pass one's join record
// from the directory pass one wrote it in, which is a read across the boundary
// and is not what the refusal above is about: carrying pass one's verdicts
// forward is the whole design of the bounded second pass.
function passReadPath(ws, pass, ...segments) {
  return join(passDirFor(ws, pass), ...segments);
}

// THE RUN RECORD IS BOUND TO THE DRAFT IT WAS OPENED ON. A Draft edited between
// `open` and a later act is a different document, and continuing against the
// old record would judge prose nobody rendered an input for. This is the same
// staleness the Packet-sha check refuses at `open`, one layer over.
function requireCurrent(run, draft, allowCorrecting = null) {
  if (run.body_sha !== draft.body_sha) {
    fail(`the Draft has changed since this run was opened.\n  opened on  ${run.body_sha}\n`
      + `  now        ${draft.body_sha}\n`
      + "Re-open the run (`open --draft <draft.md>`) — the recovery inputs already rendered were "
      + "rendered from prose that is no longer there.");
  }
  // THE MID-CORRECTION STATE IS NAMED RATHER THAN MET AS A SHA MISMATCH
  // (kogaki#874). Rendering a correction input re-renders that Step's Packet —
  // it must, since the whole point is a Packet carrying the article as it NOW
  // stands — so between the render and the recording the trace names a Packet
  // the prose was not produced from, which is TRUE and is exactly what
  // `resolveInputs` refuses on. That refusal is right in general and useless
  // here: it sends a reviewer to re-emit the Draft, which would discard the
  // correction they are in the middle of. So the state is recorded when it
  // opens and reported by name while it is open.
  const c = run.correcting;
  if (c && c.step_id !== allowCorrecting) {
    fail(`this run is mid-correction on step ${c.step_id} — its Packet has been re-rendered against `
      + "the current article and its prose has not been re-realized yet, so the Draft's trace names "
      + `a Packet that did not produce the prose beside it.\n  input  ${c.input}\n`
      + "Realize the Step from that input and record it with\n"
      + `  node src/review-draft.mjs correct --draft <draft.md> --step ${c.step_id} --file <prose>\n`
      + "Re-emitting the Draft would discard the correction instead of completing it.");
  }
}

// ---------------------------------------------------------------------------
// Rendering a recovery input. The reviewer is BLIND: it sees the prose and
// never the Packet, which is what makes the recovered record evidence about the
// prose rather than a re-reading of the input.
//
// The RECORD's schema is kogaki#871's and is deliberately not fixed here — this
// artifact renders the input and records what comes back. The line below names
// that boundary in the rendered file itself, so a reviewer reading an input
// before #871 lands can see which half is missing rather than inventing one.
// THE ARTICLE BEFORE THIS PASSAGE, re-derived from the CURRENT Draft rather
// than read from the Packet that produced the prose (kogaki#871). Two reasons,
// and only the second is about blindness: the Packet's own "article so far"
// block was true when the Step was written and a later correction may have
// moved it, so the current Draft is the article the reader actually meets; and
// reading the Packet for it would put Packet bytes into a reviewer whose
// ignorance is the instrument.
//
// Grouped under the Section headings the trace declares, never by scanning the
// body for `##` lines — the trace already maps each Step to its Section
// (kogaki#823), and a heading scan would be a second answer to a question the
// trace answers.
function articleBefore(steps, stepId) {
  const idx = steps.findIndex((s) => s.step_id === stepId);
  if (idx <= 0) {
    return "(nothing yet — this is the article's first passage, so nothing precedes it.)";
  }
  const out = [];
  let openSection = null;
  for (const s of steps.slice(0, idx)) {
    if (s.section !== openSection) {
      if (out.length) out.push("");
      out.push(`## ${s.section_title ?? `Section ${s.section}`}`, "");
      openSection = s.section;
    }
    out.push(s.prose, "");
  }
  while (out.length && out[out.length - 1] === "") out.pop();
  return out.join("\n");
}

// The passage, one line per line, each carrying its DRAFT line number so the
// reviewer's spans and the trace's ranges are in one coordinate system. A
// reviewer counting lines itself would be inventing the join key.
function numberedProse(step) {
  return numberedRange(step.prose, step.lines);
}

// The same rendering for any contiguous draft range, so the figure block and
// the prose are numbered by ONE function rather than by two that agree until
// one is edited. The width comes from the range's own last line, which is what
// keeps a Step's own listing aligned with itself.
function numberedRange(text, lines) {
  const width = String(lines[1]).length;
  return text.split("\n")
    .map((l, i) => `${String(lines[0] + i).padStart(width, " ")} | ${l}`)
    .join("\n");
}

// THE INSTRUCTION NAMES NO SIDE (PR #946 round 1). It read "where it sits
// relative to the passage BELOW", which was true while the block was always
// rendered above the passage and became false for half the cases the moment
// kogaki#945 made the placement faithful — handing a blind reviewer a sentence
// asserting the opposite arrangement to the one on their page, which is the
// inverted-order reading `figure-position` exists to prevent, reintroduced in
// prose one line from the fix. The placement cases assert by slot index and
// cannot see a wrong word, so a case asserts the absence directly.
//
// THE FIGURE AS THE READER MET IT (kogaki#880) — the Draft's own bytes over the
// range the renderer records, numbered in the same coordinate the prose is, and
// NOTHING from the record. Two facts reach the blind reviewer from this and
// they are both facts about the article: what the block says, and where in the
// Draft it sits relative to the passage. The record's roles, ground addresses,
// relations, kind and position word reach it nowhere, which is what makes the
// element-to-ground join downstream a comparison rather than a restatement.
function numberedFigure(step) {
  return numberedRange(step.figure.rendered, step.figure.lines);
}

// WHERE THE READER MET THE FIGURE, read from the DRAFT'S OWN LINE NUMBERS and
// never from the record's `position` field. The distinction is the whole reason
// this is a function rather than a read of the record (kogaki#945): `position`
// is the DECLARED side, and the blind recovery input below must carry nothing
// from the record — arranging that input by `position` would show a blind
// reviewer the very value the `figure-position` item exists to join against
// their independent reading. Line numbers are already on the reviewer's page,
// so ordering by them discloses nothing they were not given.
function figureBeforePassage(step) {
  return step.figure.lines[0] < step.lines[0];
}

// The passage a JUDGING reader is shown: the prose, with the figure quoted
// beside it in draft-line order where the Step has one. The judging reader is
// not blind — it already sees the declared side — so withholding the block from
// it would leave three of the five figure items asking about something they
// cannot see.
function quotedPassage(step) {
  if (!step.figure) return numberedProse(step);
  const parts = figureBeforePassage(step)
    ? [numberedFigure(step), numberedProse(step)]
    : [numberedProse(step), numberedFigure(step)];
  return parts.join("\n\n");
}

// THE REVIEWER IS TOLD WHAT TO WRITE, NEVER WHAT THE FIGURE HOLDS. Every line
// below asks for a reading of the rendered block; none of it names a role, a
// ground, a relation or the record's own position word, so a reviewer who has
// only the article can answer all of it and a reviewer who has seen the record
// gains nothing by it.
const FIGURE_FIELD_INSTRUCTION = `- \`figure_reading\` — your reading of the figure above, as a reader who met it
  with this passage and nothing else.
  - \`shows\` — what the figure shows. One or two lines.
  - \`elements\` — the things you can name in it. A list of strings, in whatever
    order you met them.
  - \`reader_state_after\` — what you hold after looking at it. One or two
    sentences.
`;

// The number of fields the Blind Reader is asked to fill, COUNTED FROM THE
// DECLARATION rather than spelled in the instruction — so a disposition table
// gaining a field cannot leave the sentence the reader reads saying the old
// count. `figure` is not among them: the figure's own Round Trip compares the
// figure record's own fields.
function reverseOutlineFieldCount(step) {
  return RECONSTRUCTIBLE_FIELDS.length;
}

// THE CONDITION VOCABULARY IS CLOSED AND THE UNKNOWN TOKEN REFUSES. A schema
// naming a condition this runtime cannot evaluate would otherwise resolve
// false, and the field would be silently forbidden on every Step — an eighth
// field nobody could ever write, declared and unreachable.
function conditionHolds(when, step) {
  if (when === "figure") return Boolean(step.figure);
  fail(`the Reverse Outline declares the condition \`${when}\`, which this Harness cannot `
    + "evaluate — a condition the runtime does not know would resolve false for every Step, so the "
    + "field it guards would be declared and unreachable rather than conditional");
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve"];

// A COUNT WRITTEN AS A WORD, because it lands in the reviewer's instruction and
// this Harness's own rule is that a review carries no digit but a line number.
// Past the table it falls back to the numeral rather than refusing: the
// instruction is the reviewer's and a refusal here would withhold the whole
// input over a number nobody reads as a score.
function numberWord(n) {
  return NUMBER_WORDS[n] ?? String(n);
}

// The figure section of the blind recovery input. THE HEADING SAYS WHERE THE
// READER MET IT WITHOUT SAYING THE RECORD'S WORD: the draft line numbers on the
// block and on the passage below already carry the placement, and they are the
// article's own facts rather than the record's declaration of intent — which is
// exactly the pair `figure-position` exists to lay against each other.
function renderFigurePassage(step) {
  return ["## The figure the reader met with this passage",
    "",
    "It is rendered in the Draft, not written by the passage's author. Read it as",
    "the reader does — the numbers are its lines in the Draft, and this section",
    "sits on the side of the passage the reader met it on.",
    "",
    numberedFigure(step),
    "",
    ""].join("\n");
}

// THE BLIND READER'S INPUT IS THE BRIEF STEP SCHEMA AND THE PROSE (kogaki#1014).
//
// Reverse Outlining: read the passage, then write the outline entry the passage
// would have been written from — in the SAME FORM as the forward outline. So
// the input carries the Brief's own field list with the Brief's own
// definitions, and nothing else. There is no template file, because there is no
// second artifact to describe: the reader fills a `step` block.
//
// WHAT IS WITHHELD IS WITHHELD DELIBERATELY. The Forward Artifact is not shown —
// that is what makes the comparison worth making — and neither is the Move, its
// candidates, or any of the not-reconstructible fields. Supplying the Move
// would make the outcome ride on supplied information; its effect is carried by
// the reader states, which ARE compared.
//
// THE ARTICLE'S OWN TEXT GOES IN LAST. `article_so_far`, `step_prose` and the
// figure passage are the Draft's own bytes, and an article about this pipeline
// can quote a field name or a fenced block as its own subject matter — so
// nothing below substitutes into them.
function renderReverseOutlineInput(ws, run, draft, step, steps) {
  const figureBlock = step.figure ? renderFigurePassage(step) : "";
  const figureFirst = step.figure ? figureBeforePassage(step) : false;
  const fieldLines = RECONSTRUCTIBLE_FIELDS.map((f) => `- \`${f.name}\` — ${f.definition}`);
  const withheld = NOT_RECONSTRUCTIBLE_FIELDS.map((f) => `- \`${f.name}\` — ${f.why}`);
  const cmd = `node src/review-draft.mjs recover --draft ${relative(process.cwd(), draft.path) || draft.path} `
    + `--step ${step.step_id} --file <reverse-outline.md>`;

  const head = [
    `# Reverse Outline — ${step.step_id}`,
    "",
    "You are reading one passage of an article, and the article that came before it. You have",
    "not seen the outline the article was written from, and you will not: your reading is the",
    "other half of a comparison, and it is worth nothing if it was told the answer.",
    "",
    "Write the outline entry this passage would have been written from — what it is FOR, what a",
    "reader holds arriving at it and leaving it, and what it asks the reader to accept. Write it",
    `in the form below. Answer from the passage alone; where the passage does not settle a field,`,
    "say what the passage does say rather than what would make it come out well.",
    "",
    `## The ${numberWord(reverseOutlineFieldCount(step))} fields`,
    "",
    ...fieldLines,
    "",
    "`introduces`, `opens_section` and `concession` are each legitimately absent — a passage that",
    "introduces nothing, continues a section, or concedes nothing carries no such line. `grounds`",
    "is not: every passage asserts something.",
    "",
    "## What you are NOT asked for, and why",
    "",
    ...withheld,
    "",
    "A block carrying one of these is refused rather than read: a field you could not have read",
    "off the passage is an inference, and the comparison downstream would treat it as a reading.",
    "",
    "## The form",
    "",
    "Reply with ONE fenced `step` block and nothing else:",
    "",
    "````",
    "```step",
    `step_id: ${step.step_id}`,
    "purpose: …",
    "reader_state_before: …",
    "reader_state_after: …",
    "ground …",
    "ground …",
    "introduces: <term> — <where the passage anchors it>",
    "opens_section: <section title, only if this passage opens one>",
    "concession: <a loss the passage concedes in so many words>",
    "```",
    "````",
    "",
    `Then file it: \`${cmd}\``,
    "",
    `## The passage — ${step.step_id}, draft lines ${step.lines[0]}–${step.lines[1]}`,
    "",
  ].join("\n");

  const parts = [head];
  if (figureFirst && figureBlock) parts.push(figureBlock, "");
  parts.push(numberedProse(step), "");
  if (!figureFirst && figureBlock) parts.push(figureBlock, "");
  parts.push("## The article before it", "", articleBefore(steps, step.step_id), "");

  const dest = passPath(ws, run, "recovery", `${step.step_id}.md`);
  const out = parts.join("\n");
  writeFileSync(dest, out.endsWith("\n") ? out : out + "\n");
  return dest;
}

// ---------------------------------------------------------------------------
// THE COLD READER'S INPUT (kogaki#873). The Draft BODY, and nothing else.
//
// THIS READER'S IGNORANCE IS WIDER THAN THE STEP REVIEWER'S, which is the whole
// reason it is a second instrument rather than a second question to the first.
// The Step reviewer sees one passage and the article before it; this one sees
// the whole body and no Packet, no trace, no frontmatter and no Step boundary.
// It answers what the article did to it, and the Harness is what knows what the
// article was supposed to do.
//
// STEP BOUNDARIES ARE NOT RENDERED, deliberately. Half of what the Section
// pairs measure is whether a Section reads as one movement, and marking the
// seams would tell the reader where to expect them.
//
// THE BODY IS RENDERED VERBATIM, never re-assembled from the trace's Steps the
// way `articleBefore` assembles it. That is not a shortcut: the body is what a
// reader actually meets, and re-assembling it would silently drop anything the
// Draft carries between Steps. It also makes the blindness property STRUCTURAL
// rather than argued — the body is the article, so it cannot contain a string
// that occurs only in a Packet, and the fixture asserts exactly that.
function numberedBody(draft) {
  // The body's first line, 1-based over the FILE: the closing `---` sits at
  // `frontmatterEnd`, `readDraft` skips the blank line after it, and file
  // numbering is 1-based. The trace's own ranges are in this coordinate system,
  // so the reader's spans and the Harness's are the same numbers.
  const first = draft.frontmatterEnd + 3;
  const lines = draft.body.split("\n");
  const width = String(first + lines.length - 1).length;
  return lines.map((l, i) => `${String(first + i).padStart(width, " ")} | ${l}`).join("\n");
}

// The ledger entry's shape, rendered from the item table rather than written
// into the template. A template naming its own fields and a table naming them
// too is the two-copy divergence `src/recovered-schema.json` is arranged to
// avoid one layer over: `read` validates against the table, so the instruction
// a reader follows and the rule they are judged by are one edit.
function ledgerShape(items) {
  const f = (items.sections || {}).ledger_fields;
  const keys = f ? Object.keys(f) : [];
  if (!keys.length) {
    fail("the item table declares no `sections.ledger_fields`, and the cold reader's entry is "
      + "what the Section pairs are laid against. A template rendered with no field list would "
      + "ask for a record whose shape nobody declared.");
  }
  return "```json\n{ " + keys.map((k) => `"${k}": "…"`).join(", ") + " }\n```\n\n"
    + keys.map((k) => `- \`${k}\` — ${f[k].prompt}`).join("\n");
}

function renderColdReaderInput(ws, run, draft, items) {
  const tplPath = join(dirname(fileURLToPath(import.meta.url)), "cold-reader-template.md");
  if (!existsSync(tplPath)) {
    fail(`the cold reader's template is absent — ${tplPath}. It is that reader's entire input, so `
      + "a missing template is a hole the reader fills by invention; this refuses rather than "
      + "handing over a body with no instruction.");
  }
  let out = readFileSync(tplPath, "utf8").replace(/^<!--[\s\S]*?-->\n*/, "");
  const rel = relative(process.cwd(), draft.path) || draft.path;
  const n = run.sections.length;
  const fields = {
    slug: run.slug,
    section_count: `${n} Section${n === 1 ? "" : "s"}, in order`,
    ledger_shape: ledgerShape(items),
    read_command: `node src/review-draft.mjs read --draft ${rel} --section <n> --file <entry.json>`,
    claim_command: `node src/review-draft.mjs read --draft ${rel} --claim --file <claim.json>`,
  };
  // THE BODY GOES IN LAST, AND THE SLOT CHECK RUNS BEFORE IT (round 1, finding
  // 4). The body is the one field whose content this Harness does not write,
  // and an article about this pipeline can quote a template slot in its own
  // prose. Substituting it first made that prose part of the template: a Draft
  // saying `{{read_command}}` had the command written into it, and one saying
  // any other `{{word}}` made `open` refuse that "the renderer and the template
  // disagree about the slot set" — false, and naming a repair the author of the
  // Draft cannot perform. Filling every slot the Harness owns, checking, and
  // only then dropping the body in means the check reads the TEMPLATE and never
  // the article.
  for (const [k, v] of Object.entries(fields)) out = out.split(`{{${k}}}`).join(v);
  const left = out.replace("{{body}}", "").match(/\{\{(\w+)\}\}/);
  if (left) {
    fail(`the cold reader's template slot {{${left[1]}}} was not filled — the renderer and the `
      + "template disagree about the slot set, which is the round trip failing silently");
  }
  if (!out.includes("{{body}}")) {
    fail("the cold reader's template carries no {{body}} slot, so the rendered input would be an "
      + "instruction with no article under it — a reader handed that would answer from nothing");
  }
  out = out.split("{{body}}").join(numberedBody(draft));
  const dest = passPath(ws, run, "cold-reader.md");
  writeFileSync(dest, out.endsWith("\n") ? out : out + "\n");
  return dest;
}

// ---------------------------------------------------------------------------
// THE REVERSE OUTLINE, AND THE FIELDS IT IS WRITTEN IN (kogaki#1013/#1014).
//
// Reverse Outlining is the method: after drafting, write an outline of what the
// prose actually says, in the same form as the forward outline, and compare
// entry by entry. So the Reverse Outline is a BRIEF STEP BLOCK — every field is
// a Brief field under the Brief's own name and definition — and there is no
// second schema for the same information. `src/recovered-schema.json` and
// `src/recovery-template.md` were that second schema and are deleted with this.
//
// THE DISPOSITIONS ARE DECLARED ONCE, HERE, PER BRIEF STEP FIELD, and the table
// below is that declaration. A field the Blind Reader is asked for is one a
// reader of the prose alone can write; a field they are refused is one whose
// answer is not in the passage, and asking would get an invention back that the
// Round Trip would then dutifully compare.
//
// `grounds` IS THE `ground ` LINES, not a `grounds:` field — the Brief's own
// grammar, read by the same `groundLines` the realization side reads, because
// "in the Brief's form" is the whole claim.
//
// `concession` IS THE ONE FIELD THAT IS NOT A BRIEF FIELD, and it is declared
// as such rather than smuggled in: the Packet's write instruction requires a
// loss to be conceded in the prose, so the Reverse Outline records concessions
// under that name and a conceded softening is told from a silent one.
export const RECONSTRUCTIBLE_FIELDS = [
  { name: "purpose", kind: "line",
    definition: "what this passage is for — what it does for the reader, in your words." },
  { name: "reader_state_before", kind: "line",
    definition: "what a reader knows and believes as they arrive at this passage." },
  { name: "reader_state_after", kind: "line",
    definition: "what a reader knows and believes once they have read it." },
  { name: "grounds", kind: "ground-lines",
    definition: "one `ground ` line per thing the passage ASSERTS — what it asks the reader to accept." },
  { name: "introduces", kind: "repeated-line",
    definition: "one `introduces: <term> — <anchor>` line per term this passage introduces to the reader, "
      + "in the Brief's own grammar; a passage that introduces nothing carries no line." },
  { name: "opens_section", kind: "optional-line",
    definition: "the section title, where this passage reads as OPENING a new section; omitted where it continues one." },
  { name: "concession", kind: "repeated-line",
    definition: "one `concession: <what is given up>` line per loss the passage concedes in so many words; "
      + "a passage that concedes nothing carries no line." },
];

// Declared NOT reconstructible, and REFUSED in a Reverse Outline rather than
// merely unasked. The two differ: an unasked field a reader supplies anyway is
// an invention that reaches the comparison, and the whole point of the blind
// half is that what comes back was read rather than inferred.
export const NOT_RECONSTRUCTIBLE_FIELDS = [
  { name: "move", why: "the Move is the Brief's name for the reader-state transition type, and a reader cannot "
      + "infer which library entry produced a passage; the Move's effect is carried by the reader states, which ARE compared" },
  { name: "materials", why: "which Strands licensed the passage is a fact about the Brief, not about the prose" },
  { name: "rationale", why: "why the Step was placed where it was is the composer's reasoning, not the reader's" },
  { name: "depends_on", why: "which earlier Steps this one stands on is the path's structure, not the passage's content" },
  { name: "bridges", why: "whether this Step was inserted between two others is a fact about how the Brief was revised" },
  { name: "figure", why: "the figure's own round trip is a separate comparison against the figure record's own fields" },
];

const RECONSTRUCTIBLE_NAMES = new Set(RECONSTRUCTIBLE_FIELDS.map((f) => f.name));

// The Reverse Outline's own ground lines, read with the Brief's grammar.
function outlineGrounds(body) {
  return String(body).split("\n").filter((l) => l.startsWith("ground "));
}

function repeatedLines(body, field) {
  return [...String(body).matchAll(new RegExp(`^${field}:[ \\t]*(.*)$`, "gm"))].map((x) => x[1].trim());
}

// VALIDATED BY THE BRIEF PARSER, which is the acceptance rather than a way of
// meeting it: `parseStepBlock` is the function `parseBrief` calls per fenced
// block, so a Reverse Outline the Brief could not carry is refused by the same
// code that would refuse it inside a Brief.
//
// EVERY REFUSAL NAMES WHAT IT SAW. A Reverse Outline is the one artifact in
// this flow a person wrote by hand, so "invalid" without the field is a refusal
// that costs another read to act on.
function validateReverseOutline(text, step, file) {
  const parsed = parseStepBlock(text, file);
  if (parsed.refusal) fail(parsed.refusal);
  const outline = parsed.step;
  const body = outline.body;
  const problems = [];

  if (outline.step_id !== step.step_id) {
    problems.push(`its \`step_id\` is \`${outline.step_id}\` and this pass is reading ${step.step_id} — `
      + "a Reverse Outline is the reading of ONE passage and is filed against it");
  }

  for (const f of RECONSTRUCTIBLE_FIELDS) {
    if (f.kind === "line") {
      const v = stepField(body, f.name);
      if (v === null) problems.push(`carries no \`${f.name}:\` line — ${f.definition}`);
      else if (v === "") problems.push(`\`${f.name}:\` is blank — ${f.definition}`);
      continue;
    }
    if (f.kind === "ground-lines") {
      // AN EMPTY ANSWER IS AN ANSWER AND AN ABSENT ONE IS NOT — but a passage
      // that asserts nothing is not a passage, so `grounds` is the one
      // reconstructible field with a floor. `introduces`, `opens_section` and
      // `concession` are each legitimately absent.
      if (outlineGrounds(body).length === 0) {
        problems.push("carries no `ground ` line — every passage asserts something, and the grounds are "
          + "what the Round Trip judges against what the Forward Artifact licenses");
      }
      continue;
    }
    if (f.kind === "repeated-line") {
      for (const [i, v] of repeatedLines(body, f.name).entries()) {
        if (v === "") problems.push(`\`${f.name}:\` entry ${i + 1} is blank — ${f.definition}`);
      }
      continue;
    }
    // optional-line: `opens_section` is shape-checked by the Brief parser above.
  }

  // THE REVIEWER WRITES NO VERDICTS AND NO ADVICE, and a field they could not
  // have read is REFUSED rather than dropped: an ignored field still shaped the
  // reading that produced the rest of the outline, so accepting it and
  // discarding the key would keep exactly the contamination the blind half
  // exists to prevent.
  for (const f of NOT_RECONSTRUCTIBLE_FIELDS) {
    if (stepField(body, f.name) !== null) {
      problems.push(`carries \`${f.name}:\`, which is declared NOT reconstructible — ${f.why}`);
    }
  }

  // The top-level line set is closed for the same reason the record's key set
  // was: a name nobody declared carries a judgment the Harness never reads, and
  // admit-by-default is how that arrives with no trace.
  const declared = new Set([...RECONSTRUCTIBLE_NAMES, ...NOT_RECONSTRUCTIBLE_FIELDS.map((f) => f.name), "step_id"]);
  for (const ln of body.split("\n")) {
    if (ln.startsWith("ground ") || ln.trim() === "") continue;
    const m = /^([a-z_][a-z0-9_]*):/.exec(ln);
    if (m && !declared.has(m[1])) {
      problems.push(`carries \`${m[1]}:\`, which is not a Brief Step field — a field in the Reverse Outline `
        + "that is not a Brief Step field needs its own ruling, so it is refused rather than read");
    }
  }

  if (problems.length) {
    fail(`the Reverse Outline for ${step.step_id} (${file}) is not a Brief Step block this Round Trip can read:\n  - `
      + problems.join("\n  - "));
  }

  // THE READING, UNDER THE BRIEF'S OWN NAMES. There is no translation left to
  // do: `field` in the Round Trip table names a Brief Step field, and this
  // returns that field. What used to sit here was a projection into a second
  // schema's key names, and the column that read it is gone with the schema.
  return {
    step_id: outline.step_id,
    purpose: stepField(body, "purpose"),
    reader_state_before: stepField(body, "reader_state_before"),
    reader_state_after: stepField(body, "reader_state_after"),
    grounds: outlineGrounds(body).map((l) => ({ text: l.replace(/^ground[ \t]+/, "").trim() })),
    introduces: repeatedLines(body, "introduces").map((t) => ({ text: t })),
    concession: repeatedLines(body, "concession").map((t) => ({ text: t })),
    opens_section: outline.opens_section === undefined ? "" : outline.opens_section,
  };
}

// The next Step with no recovery yet, in the path's recorded order. `open`
// renders the first; `recover` renders the next, which is what makes the flow
// self-driving rather than a sequence a session has to remember.
function nextUnrecovered(run) {
  return run.steps.find((s) => !run.recovered[s.step_id]);
}

// ---------------------------------------------------------------------------
// The commands.

function cmdOpen(args) {
  const draftPath = argString(args, "draft", "usage: review-draft open --draft <draft.md>");
  const draft = readDraft(draftPath);
  const { steps, sections } = resolveInputs(draft);
  const slug = slugOf(draftPath);
  const ws = workspaceFor(args, slug);

  const run = {
    draft: resolve(draftPath),
    slug,
    body_sha: draft.body_sha,
    opened_at: new Date().toISOString(),
    steps: steps.map((s) => ({
      step_id: s.step_id, section: s.section, section_title: s.section_title,
      lines: s.lines, packet: s.packet, packet_sha: s.packet_sha,
    })),
    sections: sections.map((s) => ({ index: s.index, title: s.title, steps: s.steps })),
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
    recovered: {},
    correction_inputs: {},
    ledger: {},
    final_claim: null,
    section_findings: [],
    section_routes: [],
    section_residue: [],
    findings: [],
    corrections: [],
    residue: [],
    compared_at: null,
    checked_at: null,
    closed_at: null,
  };

  const first = steps[0];
  const input = renderReverseOutlineInput(ws, run, draft, first, steps);
  run.rendered[first.step_id] = input;
  // THE COLD READER'S INPUT IS RENDERED AT `open`, WHOLE, and not one Section at
  // a time (kogaki#873). It is one document because the reader is one reader:
  // rendering per Section would hand out the body in pieces and make "read on"
  // an instruction the Harness gives rather than the article's own. The reader
  // is told to record each entry BEFORE reading further, which is a property of
  // how they read and not something a renderer can enforce.
  const cold = renderColdReaderInput(ws, run, draft, readItems());
  run.cold_reader_input = cold;
  writeRun(ws, run);

  process.stdout.write(
    `ReviewDraft opened: ${slug}\n`
    + `  draft     ${resolve(draftPath)} (body sha ${draft.body_sha.slice(0, 16)})\n`
    + `  steps     ${steps.length} — ${steps.map((s) => s.step_id).join(", ")}\n`
    + `  sections  ${sections.length} — ${sections.map((s) => `${s.index}. ${s.title ?? "(untitled)"}`).join(" | ")}\n`
    + `  packets   ${steps.length} verified against the trace's shas\n`
    + `  workspace ${ws}\n`
    + `\nfirst recovery input: ${input}\n`
    + `cold reader input:    ${cold}\n`);
}

function cmdRecover(args) {
  const draftPath = argString(args, "draft", "usage: review-draft recover --draft <draft.md> --step <id> --file <recovered>");
  const stepId = argString(args, "step", "usage: review-draft recover --draft <draft.md> --step <id> --file <recovered>");
  const file = argString(args, "file", "usage: review-draft recover --draft <draft.md> --step <id> --file <recovered>");
  const draft = readDraft(draftPath);
  const ws = workspaceFor(args, slugOf(draftPath));
  const run = readRun(ws);
  requireCurrent(run, draft);

  const known = run.steps.map((s) => s.step_id);
  if (!known.includes(stepId)) {
    fail(`unknown step \`${stepId}\` — this Draft's Steps are ${known.join(", ")}`);
  }
  // THE RENDERED-INPUT GUARD IS WHAT MAKES THE RECOVERY BLIND. A record handed
  // back for a Step whose input was never rendered was written against
  // something else — the Packet, the Brief, or the reviewer's memory of the
  // article — and there is no way to tell which afterwards. So the refusal is
  // here, at the only moment the distinction is still observable.
  if (!run.rendered[stepId]) {
    fail(`step ${stepId} has no rendered recovery input, so this record was not written against one.\n`
      + "The Harness renders inputs in the path's recorded order — `open` renders the first and each "
      + `\`recover\` renders the next. The Step now owed is ${nextUnrecovered(run)?.step_id ?? "(none)"}.`);
  }
  if (!existsSync(file)) fail(`no recovered record at ${file}`);

  // VALIDATED BEFORE IT IS RECORDED (kogaki#871). A record written to the
  // workspace and validated later would leave `compare` to discover the defect,
  // by which point the reviewer who could fix it has finished reading.
  const content = readFileSync(file, "utf8");
  // THE STEP COMES FROM THE DRAFT, NOT FROM THE RUN RECORD (kogaki#880). The
  // run record carries the Step's identity and its ranges; whether the Step has
  // a figure — and where its block sits — is resolved from the trace, which is
  // the same read the recovery input was rendered from. Validating against the
  // run record's copy would let the conditional eighth field be owed at render
  // and unowed at validation, which is the two-answers-to-one-question shape
  // this Harness refuses everywhere else.
  const { steps } = resolveInputs(draft);
  const step = steps.find((x) => x.step_id === stepId);
  const projected = validateReverseOutline(content, step, file);

  // BOTH ARE KEPT, AND THE OUTLINE IS THE EVIDENCE. The `.md` is the Reverse
  // Outline exactly as it was written — the artifact a later reader checks the
  // Round Trip against — and the `.json` is the reading the Harness compares,
  // under the Brief's own field names. Writing only the second would leave the
  // run's own record unable to show what the Blind Reader actually said.
  const outlinePath = passPath(ws, run, "recovered", `${stepId}.md`);
  writeFileSync(outlinePath, content.endsWith("\n") ? content : content + "\n");
  const out = passPath(ws, run, "recovered", `${stepId}.json`);
  writeFileSync(out, JSON.stringify(projected, null, 2) + "\n");
  run.recovered[stepId] = out;
  run.outlines = run.outlines || {};
  run.outlines[stepId] = outlinePath;

  const next = nextUnrecovered(run);
  let nextInput = null;
  if (next) {
    const full = steps.find((s) => s.step_id === next.step_id);
    nextInput = renderReverseOutlineInput(ws, run, draft, full, steps);
    run.rendered[next.step_id] = nextInput;
  }
  writeRun(ws, run);

  process.stdout.write(`recorded: ${stepId} -> ${out}\n`);
  if (nextInput) process.stdout.write(`next recovery input: ${nextInput}\n`);
  else process.stdout.write("every Step is recovered. The Section ledger is what `compare` still owes — "
    + `${run.sections.length} entr${run.sections.length === 1 ? "y" : "ies"}, `
    + `\`read --section <n> --file <ledger>\`.\n`);
}

// ---------------------------------------------------------------------------
// `read` — recording the cold reader's Section ledger and its final claim
// (kogaki#873).
//
// THE ENTRY IS VALIDATED, AND THAT IS THE CHANGE kogaki#873 MAKES HERE. The
// entry point recorded whatever file it was handed, so a Section could be
// "recorded" by an empty file and `compare` would then lay nothing against the
// heading and report agreement. What a Section entry must carry is
// `sections.ledger_fields` in the item table — read here rather than restated,
// the same arrangement `validateRecovered` has with the recovered schema, so
// the shape the template ASKS for and the shape `read` ACCEPTS cannot diverge.
//
// EVERY FIELD IS ONE THE READER CAN ANSWER FROM THE PROSE ALONE. There is no
// field here whose honest answer needs the Packet: a reader asked for something
// only the plan holds would go looking for the plan, and the blindness this
// instrument rests on would end at that field.

// One entry, as JSON. The refusal names the field and the Section, because a
// reviewer who has written three entries and mis-shaped one needs to know which.
function validateLedgerEntry(text, n, file, items) {
  const spec = (items.sections || {}).ledger_fields || {};
  const keys = Object.keys(spec);
  let doc;
  try { doc = JSON.parse(text); }
  catch (e) {
    fail(`the Section ${n} entry at ${file} is not readable JSON (${e.message}) — an entry is one `
      + `JSON object carrying ${keys.map((k) => `\`${k}\``).join(" and ")}`);
  }
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
    fail(`the Section ${n} entry at ${file} is not a JSON object — an entry is one object carrying `
      + `${keys.map((k) => `\`${k}\``).join(" and ")}`);
  }
  const problems = [];
  for (const k of keys) {
    const v = doc[k];
    if (v === undefined) { problems.push(`\`${k}\` is absent — ${spec[k].prompt}`); continue; }
    if (typeof v !== "string" || v.trim() === "") {
      problems.push(`\`${k}\` is empty — ${spec[k].prompt}. An empty field is not an answer: the `
        + "pair it feeds would be laid against nothing and would report agreement");
    }
  }
  // A FIELD THE TABLE DOES NOT DECLARE IS REFUSED BY NAME. An entry carrying a
  // fourth field is a reader answering a question nobody asked, and silently
  // dropping it would leave them believing it was read.
  const extra = Object.keys(doc).filter((k) => !keys.includes(k));
  if (extra.length) {
    problems.push(`${extra.map((k) => `\`${k}\``).join(", ")} ${extra.length === 1 ? "is a field" : "are fields"} `
      + `the ledger does not declare — a Section entry carries ${keys.map((k) => `\`${k}\``).join(" and ")} `
      + "and nothing else");
  }
  if (problems.length) {
    fail(`the Section ${n} entry at ${file} was not recorded:\n  - ${problems.join("\n  - ")}`);
  }
  const out = {};
  for (const k of keys) out[k] = doc[k].trim();
  return out;
}

function cmdRead(args) {
  const usage = "usage: review-draft read --draft <draft.md> --section <n> --file <entry.json>\n"
    + "       review-draft read --draft <draft.md> --claim --file <claim.json>";
  const draftPath = argString(args, "draft", usage);
  const file = argString(args, "file", usage);
  const draft = readDraft(draftPath);
  const ws = workspaceFor(args, slugOf(draftPath));
  const run = readRun(ws);
  requireCurrent(run, draft);

  // THE COLD READER IS A PASS-ONE ACT, AND PASS ONE ENDS AT THE FIRST
  // CORRECTION (PR #1007 round 1, finding 2). Its input is rendered at `open`
  // into `pass-1/cold-reader.md`, and `pass-1/join.json`'s Section verdicts are
  // given on the entries it records. `correct` moves `body_sha` with the
  // article, so `requireCurrent` admits a `read` over the corrected Draft —
  // and that entry would land where pass one's was, orphaning the entry the
  // Section verdicts rest on. Refused, the way `compare` refuses, and the
  // writes below are pinned to pass one the way the correction inputs are, so
  // the layout the legend declares (`ledger/` under `pass-1/` only) is the
  // layout the Harness writes whatever pass the run has reached.
  if ((run.corrections || []).length) {
    fail(`this run has ${run.corrections.length} correction(s) recorded, so pass one is over: the cold `
      + "reader's entries are pass one's, and re-recording one now would replace the entry pass one's "
      + "Section verdicts were given on. Pass two re-reads corrected Steps through `check`, never "
      + "the Sections.");
  }
  const items = readItems();
  if (!existsSync(file)) fail(`no cold-reader entry at ${file}`);
  const text = readFileSync(file, "utf8");

  // THE FINAL CLAIM IS ONE RECORD FOR THE WHOLE DRAFT, not a Section's. It is
  // recorded through this same entry point rather than a command of its own,
  // because it is the same act by the same reader at the end of the same read —
  // and a separate command would let a run reach `compare` having taken one and
  // not the other with nothing saying they belonged together.
  if (args.claim !== undefined) {
    if (args.section !== undefined) {
      fail("`--claim` records the final claim for the whole Draft and `--section` records one "
        + `Section's entry — a call carrying both is asking for two records at once.\n${usage}`);
    }
    const key = (items.sections || {}).final_claim_field;
    if (!key) {
      fail("the item table declares no `sections.final_claim_field`, and the final claim is what "
        + "the article's thesis is laid against. A claim recorded under a field nobody declared "
        + "would be compared against nothing.");
    }
    let doc;
    try { doc = JSON.parse(text); }
    catch (e) {
      fail(`the final claim at ${file} is not readable JSON (${e.message}) — it is one JSON object `
        + `of the form {"${key}": "…"}`);
    }
    const v = doc && !Array.isArray(doc) && typeof doc === "object" ? doc[key] : undefined;
    if (typeof v !== "string" || v.trim() === "") {
      fail(`the final claim at ${file} carries no \`${key}\` — one or two sentences saying what the `
        + "article claimed, in the reader's own words. An empty claim would be laid against the "
        + "thesis and would report agreement.");
    }
    const out = passPathAt(ws, run, 1, "ledger", "final-claim.json");
    writeFileSync(out, JSON.stringify({ [key]: v.trim() }, null, 2) + "\n");
    run.final_claim = out;
    writeRun(ws, run);
    const owed = run.sections.map((x) => x.index).filter((i) => !run.ledger[String(i)]);
    process.stdout.write(`recorded: the final claim -> ${out}\n`
      + (owed.length ? `sections still owed: ${owed.join(", ")}\n`
        : "every Section entry and the final claim are recorded.\n"));
    return;
  }

  const raw = args.section;
  const n = typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isInteger(n)) fail(`${usage}\n(n is the Section's index)`);
  const known = run.sections.map((x) => x.index);
  if (!known.includes(n)) {
    fail(`unknown section ${n} — this Draft's Sections are ${known.join(", ")}`);
  }
  const entry = validateLedgerEntry(text, n, file, items);
  const out = passPathAt(ws, run, 1, "ledger", `section-${n}.json`);
  writeFileSync(out, JSON.stringify(entry, null, 2) + "\n");
  run.ledger[String(n)] = out;
  writeRun(ws, run);

  const owed = known.filter((i) => !run.ledger[String(i)]);
  process.stdout.write(`recorded: section ${n} -> ${out}\n`
    + (owed.length ? `sections still owed: ${owed.join(", ")}\n`
      : run.final_claim ? "every Section entry and the final claim are recorded.\n"
        : "every Section entry is recorded. The final claim is what `compare` still owes — "
          + "`read --claim --file <claim.json>`.\n"));
}

// What `compare` is missing, computed once and rendered as the refusal's whole
// content: a reviewer told "something is missing" has to go looking, and the
// looking is the part the Harness can do.
//
// THE FINAL CLAIM IS A THIRD KIND OF MISSING (kogaki#873), reported beside the
// Steps and the Sections rather than folded into either. It is one record for
// the whole Draft, so naming it by a Section number would send a reviewer to
// re-read a Section they already recorded.
function missingFor(run) {
  const steps = run.steps.map((s) => s.step_id).filter((id) => !run.recovered[id]);
  const sections = run.sections.map((s) => s.index).filter((i) => !run.ledger[String(i)]);
  return { steps, sections, claim: !run.final_claim };
}

// ---------------------------------------------------------------------------
// THE COMPARISON (kogaki#872). The join between what a Packet DECLARED and what
// the blind reviewer RECOVERED from the prose it produced.
//
// THE ITEM TABLE IS FIXED IN THE HARNESS AND READ FROM `src/review-items.json`
// — which item classes exist, which are preserved and which are best-effort,
// which are decided mechanically and which are put to a model. The runtime does
// not restate it, the same arrangement `src/recovered-schema.json` already has
// with the recovery half: amending the table is one edit.
//
// THE MODEL NEVER ASSIGNS SEVERITY, and that is the whole reason the table is
// here rather than in a prompt. A judging model sees ONE pair, answers ONE
// question, and returns one of three tokens with one sentence. It cannot rank,
// weigh or aggregate, because it is never shown two pairs at once. What a
// `fails` COSTS is the table's: a preserved item's fail sends the Step to
// correction, a best-effort item's rides along if that Step is re-realized
// anyway.
//
// `cannot-decide` IS NEVER ROUNDED. It is a third answer, not a weak `holds`,
// and it is listed with its pair so a person can look at what the reader could
// not settle.

function readItems() {
  const p = join(dirname(fileURLToPath(import.meta.url)), "review-items.json");
  if (!existsSync(p)) {
    fail(`the item table is absent — ${p}. It is the whole of what the comparison compares, so `
      + "this refuses rather than joining against a table it invented.");
  }
  let t;
  try { t = JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { fail(`the item table at ${p} is not readable JSON (${e.message})`); }
  if (!Array.isArray(t.items) || !t.items.length) fail(`the item table at ${p} declares no items`);
  return t;
}

// ---------------------------------------------------------------------------
// Reading the DECLARED side back out of a rendered Packet.
//
// THE PACKET IS PARSED AS THE TEMPLATE WRITES IT, never as general markdown —
// the same reading `readDraft` gives the trace, and for the same reason: a
// second grammar can disagree with the writer about what was written. Every
// block below is a form `src/packet-template.md` renders, and a block that is
// absent is a PACKET GAP rather than something to work around, per the owner's
// 2026-09-04 closed-input ruling. The refusal names the block, the item that
// needed it, and the file the gap is filed against.

// The stated-absence forms the Packet renderer writes where a value is empty.
// They are ANSWERS and not holes: a Packet saying "(nothing new)" has told the
// comparison there is nothing to compare, which is different from a Packet that
// never rendered the block at all.
const PACKET_ABSENCE = /^\((none|nothing)\b/i;

// A `- **label.** value` line, plus any continuation lines the renderer wrapped
// under it. The renderer puts multi-entry values (a term list, a knows list) on
// the lines below the label, so a reader that took only the label line would
// silently see the first entry and no others.
function packetBullet(text, label) {
  const lines = text.split("\n");
  const head = new RegExp(`^- \\*\\*${label}\\.\\*\\*\\s?(.*)$`);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(head);
    if (!m) continue;
    const out = m[1] === "" ? [] : [m[1]];
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      if (l.trim() === "" || l.startsWith("#") || /^- \*\*/.test(l)) break;
      out.push(l);
    }
    return out.join("\n").trim();
  }
  return null;
}

// A `- item` list read out of a bullet value, with the stated-absence forms
// answering as the empty list. `already knows` renders each entry as
// `term — anchor (introduced at <step>)`; only the term is the join key, and the
// anchor is what the Packet carries FOR THE WRITER rather than for this reader.
function bulletList(value, { termOnly = false } = {}) {
  if (value === null) return null;
  if (PACKET_ABSENCE.test(value)) return [];
  const out = [];
  for (const l of value.split("\n")) {
    const m = l.match(/^\s*-\s+(.*\S)\s*$/);
    if (!m) continue;
    let t = m[1];
    if (termOnly) {
      t = t.split(" — ")[0].replace(/\s*\(introduced at [^)]*\)\s*$/, "").trim();
    }
    if (t) out.push(t);
  }
  return out;
}

// The block between a heading and the next one, with the template's own fixed
// instruction paragraph dropped — what is left is the rendered VALUE. Matched
// on the heading's text rather than its level, because the level is the
// template's business and the block's identity is its name.
function packetBlock(text, heading, { after = null } = {}) {
  const lines = text.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^#+\s+(.*\S)\s*$/);
    if (m && m[1] === heading) { start = i + 1; break; }
  }
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    if (/^#+\s+\S/.test(lines[i])) { end = i; break; }
  }
  let body = lines.slice(start, end).join("\n");
  // THE FIXED INSTRUCTION PARAGRAPH IS MATCHED AS A WORD SEQUENCE, never as a
  // literal: the template wraps its prose, and a literal that carried the
  // template's own line breaks would stop matching the moment somebody rewrapped
  // a paragraph — which changes nothing and would silently hand the whole
  // instruction paragraph back as the block's VALUE.
  if (after) {
    const m = body.match(after);
    if (m) body = body.slice(m.index + m[0].length);
  }
  return body.trim();
}

// ONE READER PER BLOCK KIND, and every label, heading and fixed sentence it
// keys on comes from `packet_blocks` in the item table. The runtime therefore
// carries no literal that happens to equal a field name somewhere else —
// `grounds`, `purpose` and `reader_state_after` are each a Packet label AND an
// item id AND (for two of them) a recovered-record field, and a runtime
// spelling them out cannot be told apart from one restating the table or the
// schema.
const PACKET_READERS = {
  // THE GROUNDS ARE A BLOCK BELOW THEIR BULLET, NOT THE BULLET'S VALUE (PR #895
  // round 1, finding 2). The template's `- **grounds.** ...` line is fixed
  // INSTRUCTION prose — "These are what this Step may assert" — and the rendered
  // value, `(none recorded)` included, goes into the separate block under it. A
  // reader testing the bullet's text for a stated absence could never match, so
  // a Step whose Brief declares no grounds refused the WHOLE run as a false
  // Packet gap and sent the reviewer to file against a template that was not
  // broken. The bullet locates the region; the region carries the value.
  ground_lines: (t, spec) => {
    const lines = t.split("\n");
    const at = lines.findIndex((l) => new RegExp(`^- \\*\\*${spec.bullet_label}\\.\\*\\*`).test(l));
    if (at === -1) return null;
    let end = lines.length;
    for (let i = at + 1; i < lines.length; i++) { if (/^#+\s+\S/.test(lines[i])) { end = i; break; } }
    const region = lines.slice(at + 1, end);
    const re = new RegExp(`^${spec.prefix}\\s`);
    const g = region.filter((l) => re.test(l)).map((l) => l.trim());
    if (g.length) return g;
    // A stated absence in the region is an ANSWER — this Step declares none. It
    // is only a hole when the bullet, and so the region, is absent altogether.
    if (region.some((l) => PACKET_ABSENCE.test(l.trim()))) return [];
    return null;
  },
  bullet: (t, spec) => packetBullet(t, spec.label),
  bullet_list: (t, spec) => bulletList(packetBullet(t, spec.label), { termOnly: !!spec.term_only }),
  bullets: (t, spec) => {
    const out = {};
    for (const label of spec.labels) {
      const v = packetBullet(t, label);
      if (v === null) return null;
      out[label] = v;
    }
    return out;
  },
  block: (t, spec) => {
    const b = packetBlock(t, spec.heading, { after: wordSequence(spec.after_words) });
    if (b === null) return null;
    return PACKET_ABSENCE.test(b) ? "" : b;
  },
  paragraph: (t, spec) => {
    const i = t.indexOf(spec.opens_with);
    if (i === -1) return null;
    const rest = t.slice(i);
    const end = rest.indexOf("\n\n");
    return (end === -1 ? rest : rest.slice(0, end)).trim();
  },
};

// A fixed sentence from the template, as a pattern that ignores how it was
// wrapped. Every character is escaped and every run of whitespace becomes one
// `\s+`, so the pattern matches the sentence and never anything else.
function wordSequence(s) {
  return new RegExp(String(s).trim().split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+"));
}

// ONE BLOCK, OUT OF ONE PACKET, refusing BY NAME on a block the Packet does not
// carry. Both sides of the review read a Packet block through here — the Step
// items and, since kogaki#873, the Section pairs — so a Packet gap is one
// refusal with one wording however it was reached, and a second reader cannot
// grow beside this one and disagree with it about what the Packet's shape is.
function readPacketBlock(text, name, items, step, wantedBy) {
  const spec = (items.packet_blocks || {})[name];
  const reader = spec && PACKET_READERS[spec.kind];
  if (!reader) {
    fail(`the item table names the Packet block \`${name}\`, which this Harness has no reader for `
      + "— the table and the runtime disagree about the Packet's shape, and a comparison run "
      + "against a block nobody reads would report agreement it never checked");
  }
  const v = reader(text, spec);
  if (v === null) {
    fail(`step ${step.step_id}: its Packet carries no \`${name}\` block, which the item(s) `
      + `${wantedBy.join(", ")} compare against.\n  packet  ${step.packet_path}\n`
      + "A block the comparison needs and the Packet does not carry is a PACKET GAP: file it "
      + "against src/packet-template.md. It is never satisfied by reading the Brief, the Move "
      + "or the Strand — the owner's 2026-09-04 ruling is that a need for those is evidence "
      + "the Packet is missing information.");
  }
  return v;
}

// The declared side for one Step, read once and refusing BY NAME on the first
// block an item needs and the Packet does not carry.
function declaredFor(step, items) {
  const text = readFileSync(step.packet_path, "utf8");
  const need = new Set();
  for (const it of items.items) {
    // A ROW THIS STEP DOES NOT RUN ASKS FOR NO BLOCK (kogaki#880). Collecting a
    // figure row's Packet blocks on a figureless Step would refuse that Step as
    // a Packet gap for a block no item on it ever reads — a refusal naming a
    // repair nobody owes.
    if (it.figure_only && !step.figure) continue;
    if (it.declared_block) need.add(it.declared_block);
    for (const b of it.also_declared_blocks || []) need.add(b);
  }
  const out = {};
  for (const name of need) {
    const wanted = items.items.filter((i) => i.declared_block === name
      || (i.also_declared_blocks || []).includes(name)).map((i) => i.id);
    out[name] = readPacketBlock(text, name, items, step, wanted);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The mechanical half. Every check below is a STRING FACT about the Draft and
// its Packet — no model call is made for any of them, and the join record says
// so per item, which is what makes "decided mechanically" checkable rather than
// claimed.

// The literal below is wrapped so that no line ends on the preposition an
// import statement uses. The closed-input case reads this file's own text for
// import shapes, and a stopword list is not an import. THE SHAPE IS NOT SPELLED
// OUT HERE, deliberately: a comment that writes the pattern it exists to avoid
// becomes the first hit of the reader looking for it, which is the use-versus-
// mention defect src/packet-template.md's own header records.
const STOPWORDS = new Set(("a an and are as at be been being but by can could did do does "
  + "for had has have how in into is it its may might must not of on or should so than the "
  + "that their from these they this those to was were what when which who will with would you your "
  + "them then there")
  .split(" "));

function wordsOf(s) { return (String(s).toLowerCase().match(/[a-z0-9']+/g) || []); }
function contentWords(s) { return wordsOf(s).filter((w) => !STOPWORDS.has(w)); }

// CONTAINMENT, not similarity: the question is whether the CLAIM is covered by
// a ground, so the denominator is the claim's own content words. A symmetric
// score would let a long ground pair with anything and a short one with
// nothing, which is the wrong shape for "may this passage assert this".
function pairClaims(grounds, claims, textKey, floor) {
  const gsets = grounds.map((g) => new Set(contentWords(g)));
  return claims.map((c, i) => {
    const cw = contentWords(c && c[textKey]);
    let best = -1; let score = 0;
    if (cw.length) {
      gsets.forEach((gs, j) => {
        const hit = cw.filter((w) => gs.has(w)).length / cw.length;
        if (hit > score) { score = hit; best = j; }
      });
    }
    return { claim_index: i, ground_index: score >= floor ? best : -1 };
  });
}

// Every draft line of this Step, paired with its own draft line number — the
// coordinate the trace, the recovered spans and every finding below share.
function numberedLines(step) {
  return step.prose.split("\n").map((text, i) => ({ n: step.lines[0] + i, text }));
}

// The first N-word window of `line` that occurs verbatim in `haystack`.
// Normalized to a word sequence on both sides, so a wrap, a double space or a
// comma is not what decides it — the words are.
function verbatimWindow(line, haystacks, n) {
  const w = wordsOf(line);
  if (w.length < n) return null;
  const hays = haystacks.map((h) => " " + wordsOf(h).join(" ") + " ");
  for (let i = 0; i + n <= w.length; i++) {
    const win = w.slice(i, i + n).join(" ");
    if (hays.some((h) => h.includes(" " + win + " "))) return win;
  }
  return null;
}

// The earliest draft line on which `term` occurs as a word sequence, over the
// whole BODY rather than over one Step: `term-before-introduction` asks where
// the reader first meets a word, and the reader reads the article.
//
// THE FRONTMATTER IS SKIPPED, AND THAT IS CORRECTNESS RATHER THAN TIDINESS. The
// record half carries the trace, the Brief pin and every cite the Draft was
// composed from, so a Step introducing a term the trace happens to contain —
// `draft`, `packet`, `cite`, a Strand slug — would fail on a line NO READER EVER
// SEES, and the finding would point at a JSON line as the place the reader met
// the word. The search starts where `readDraft`'s own body starts, so the two
// cannot disagree about where the article begins.
function firstOccurrence(draft, term) {
  const t = wordsOf(term);
  if (!t.length) return null;
  const needle = " " + t.join(" ") + " ";
  for (let i = draft.frontmatterEnd + 2; i < draft.lines.length; i++) {
    if ((" " + wordsOf(draft.lines[i]).join(" ") + " ").includes(needle)) return i + 1;
  }
  return null;
}

// ONE IMPLEMENTATION PER MECHANICAL ITEM, keyed by the item's own id. Each
// returns `{verdict, reason, span}` and never a score. The ids here are
// BINDINGS to the table's `mode: mechanical` rows — a table row whose id has no
// implementation is refused below rather than silently skipped, which is the
// half that keeps the two from drifting apart.
const MECHANICAL = {
  // THE HYGIENE ITEMS ARE GONE, AND THEIR ABSENCE IS A RULING RATHER THAN A
  // TRIM (owner 2026-09-09; kogaki#1013 item 3). `term-before-introduction`,
  // `restates-earlier-step` and `packet-wording` each asked whether the prose
  // betrayed the material it was produced from. Prose hygiene is not part of
  // Reverse Outlining: a reader cannot infer the source a structure was
  // produced from, and being able to would be abnormal. Whether any of them
  // survives as a realization-time lint in `draft` is a separate question for
  // the owner, not this rebuild. Their rows left `src/review-items.json` in the
  // same act, and the binding check below is what makes a row with no
  // implementation refuse rather than silently skip — so the two cannot drift.

  "grounds-unused": ({ declared, pairs, step, item }) => {
    const grounds = declared[item.declared_block];
    const used = new Set(pairs.filter((p) => p.ground_index !== -1).map((p) => p.ground_index));
    const unused = grounds.map((g, i) => [g, i]).filter(([, i]) => !used.has(i));
    if (!unused.length) {
      return {
        verdict: "holds",
        reason: grounds.length ? "every ground is carried by a recovered claim"
          : "this Step declares no grounds",
        span: step.lines,
      };
    }
    return {
      verdict: "fails",
      reason: "a ground no recovered claim rests on",
      evidence: unused.map(([g]) => g),
      span: step.lines,
    };
  },
};

// ---------------------------------------------------------------------------
// Rendering one join Packet, and recording the verdict that comes back.

// ---------------------------------------------------------------------------
// THE FIGURE'S DECLARED SIDE (kogaki#880). Read from the validated record the
// trace pins, never from the Packet: the record IS the declaration for a figure
// — the Brief bound each role to a ground and the record worded it — and the
// Packet carries no figure block at all (the figure record keeps the figure input behind
// its own marker, outside the Packet the reviewer's items read).
//
// A ROW NAMING BOTH SIDES IS REFUSED. Two declared carriers on one row is two
// questions, and this table holds one per row; a runtime that picked one
// silently would make which carrier answered a fact about the reading order.
function figureDeclared(step, item) {
  if (item.declared_block && item.record_field) {
    fail(`the item table declares \`${item.id}\` with both a Packet block and a figure record `
      + "field. One row asks one question of one declared side; a row with two would be answered "
      + "against whichever the runtime happened to read first");
  }
  const rec = step.figure.record_json;
  const v = rec[item.record_field];
  if (v === undefined) {
    fail(`step ${step.step_id}: item \`${item.id}\` reads the figure record's `
      + `\`${item.record_field}\`, and the record at ${step.figure.record_path} carries no such `
      + "field. The record was validated against src/figure-schema.json when it was written, so a "
      + "field absent now means the schema and the item table disagree about the record's shape");
  }
  return v;
}

// The record's elements as a reader-facing list: the role and the wording, and
// NEVER the ground address. The ground is what the element is judged against
// and appears on its own side of the mechanical check below; rendering it here
// would put the answer into the question.
function renderElements(elements) {
  return Object.entries(elements)
    .map(([role, el]) => `- **${role}.** ${el && el.text}`).join("\n");
}

// The one figure row the Harness decides alone. EVERY ELEMENT'S TEXT IS
// ENTAILED BY ITS BOUND GROUND, and the instrument is containment against the
// ground the record's address POINTS AT — the same containment `grounds` uses
// on the prose side, with its own declared floor, so the two halves of the
// round trip measure entailment the same way.
//
// THE BINDING ITSELF IS NOT WHAT THIS CHECKS, and saying so is the point.
// The figure record already refuses a record that moves a role to a ground the Brief did
// not bind it to, at the act that validates the record — so re-deciding it here
// would be a second validator agreeing with the first until one is edited. What
// no act before this one can ask is whether the WORDING the element finally got
// is carried by the material it was licensed from, because the wording is
// written after the prose and judged against nothing until the round trip.
//
// STRING CONTAINMENT FIRST, JUDGED SECOND. What is mechanical here is the
// verdict: containment above the floor holds, below it fails, and no model is
// asked either way — which is what the mode declares and what makes a
// mechanical fail cheap enough to run on every Step of every pass. The judgment
// comes second and elsewhere: a fail on this preserved row is what sends the
// Step to `correct --figure`, where a reader is shown the element beside the
// ground it was worded from.
//
// THE ADDRESS IS `g<n>` OVER THE STEP'S OWN GROUNDS, 1-based, which is the
// figure decision's
// grammar. An address outside the Step's ground count is refused by name rather
// than scored against whatever happens to sit at that index — the figure
// decision's own
// grammar refuses one at composition, so a record carrying one now was written
// against a Brief this Draft was not emitted from.
function groundAt(address, grounds) {
  const m = /^g(\d+)$/.exec(String(address ?? ""));
  if (!m) return { error: `is bound to ${renderSide(address ?? null)}, which is not a ground `
    + "address — a role binds to `g<n>` over the Step's own grounds" };
  const i = Number(m[1]);
  if (i < 1 || i > grounds.length) {
    return { error: `is bound to ${address} and this Step declares `
      + `${grounds.length} ground${grounds.length === 1 ? "" : "s"} — the address points past them` };
  }
  return { ground: grounds[i - 1] };
}

const MECHANICAL_FIGURE = {
  "figure-element-ground": ({ step, declared, items, item }) => {
    const floor = items.thresholds.figure_element_ground_containment;
    if (typeof floor !== "number") {
      fail("the item table declares no `thresholds.figure_element_ground_containment`, and the "
        + "element-to-ground check is containment against a floor. With none every element would "
        + "pass, which is the silent `holds` this comparison exists to refuse");
    }
    const grounds = declared.grounds || [];
    const elements = figureDeclared(step, item);
    for (const [role, el] of Object.entries(elements)) {
      const r = groundAt(el && el.ground, grounds);
      if (r.error) {
        return {
          verdict: "fails",
          reason: "an element's ground address does not resolve against this Step's grounds",
          evidence: [`${role} ${r.error}`],
          span: step.figure.lines,
        };
      }
      const cw = contentWords(el && el.text);
      const gs = new Set(contentWords(r.ground));
      const share = cw.length ? cw.filter((w) => gs.has(w)).length / cw.length : 0;
      if (share < floor) {
        return {
          verdict: "fails",
          reason: "an element is worded in terms its bound ground does not carry",
          evidence: [`${role} — ${renderSide(el && el.text)}`, `its ground — ${r.ground}`],
          span: step.figure.lines,
        };
      }
    }
    return {
      verdict: "holds",
      reason: "every element is worded in the terms of the ground it is bound to",
      span: step.figure.lines,
    };
  },
};

// THE PASS IS THE CALLER'S, NOT THE RUN RECORD'S (PR #1004 round 1, finding 1).
// `compare` IS pass one whatever pass the run has since reached — the record it
// writes is named `pass-1/join.json` for exactly that reason — so the pair
// inputs that record indexes must land beside it. Reading the pass off the run
// record here put a `compare` run made after `check` into `pass-2/join/`, over
// the inputs pass two was judging, and the ledger could not refuse it because
// the writing pass read as the owning one.
function renderJoinPacket(ws, run, pass, draft, step, item, pair, declaredText, recoveredText) {
  const tplPath = join(dirname(fileURLToPath(import.meta.url)), "join-template.md");
  if (!existsSync(tplPath)) {
    fail(`the join template is absent — ${tplPath}. It is the judging model's entire input, so a `
      + "missing template is a hole the model fills by invention; this refuses rather than asking "
      + "a question with no form.");
  }
  let out = readFileSync(tplPath, "utf8").replace(/^<!--[\s\S]*?-->\n*/, "");
  const fields = {
    step_id: step.step_id,
    item: item.id,
    item_class: item.class,
    declared: declaredText,
    recovered: recoveredText,
    span: `${step.lines[0]}–${step.lines[1]}`,
    // THE JUDGING READER IS TOLD WHICH CARRIER DECLARED THE LINE. It is not the
    // blind reader — it sees both sides by design — and a figure record's line
    // rendered under a heading saying `Packet` would name the wrong artifact in
    // every finding a reader of the join record goes on to repair.
    declared_source: item.declared_source ?? "Packet",
    quoted: quotedPassage(step),
    question: item.question,
    record_command: `node src/review-draft.mjs compare --draft ${relative(process.cwd(), draft.path) || draft.path} --verdicts <verdicts.json>`,
  };
  for (const [k, v] of Object.entries(fields)) out = out.split(`{{${k}}}`).join(v);
  const left = out.match(/\{\{(\w+)\}\}/);
  if (left) {
    fail(`the join template's slot {{${left[1]}}} was not filled — the renderer and the template `
      + "disagree about the slot set, which is the round trip failing silently");
  }
  const name = pair === null ? `${step.step_id}.${item.id}.md` : `${step.step_id}.${item.id}.${pair}.md`;
  const dest = passPathAt(ws, run, pass, "join", name);
  writeFileSync(dest, out.endsWith("\n") ? out : out + "\n");
  return dest;
}

const verdictKey = (step_id, item, pair) => (pair === null || pair === undefined
  ? `${step_id}/${item}` : `${step_id}/${item}#${pair}`);

// WHAT JUDGED THIS PASS, READ BACK FROM THE RECORDED VERDICTS (kogaki#997).
// ReviewDraft pins a different model per role, and the Harness invokes none of
// them, so this line is a RENDERING OF A DECLARATION and says so — the same
// shape terrain took for its judge pin, where naming it as an observation
// claimed a check nobody performed.
//
// SEVERAL IDS RENDER AS SEVERAL, never as one summary. A pass whose pair and
// Section judgments ran on the pinned Haiku and whose corrections ran on the
// stronger model is the intended split; a pass showing a THIRD id, or the
// interactive default, is a pin that slipped, and that is exactly the reading
// this line exists to make possible.
const judgedByLine = (...callSets) => {
  const ids = [...new Set(callSets.flat().map((c) => c && c.model).filter(Boolean))].sort();
  return ids.length
    ? `judged by DECLARED model(s) — ${ids.join(", ")}; the Harness invoked no model and verified none.\n`
    : "";
};

// THE VERDICT FILE IS VALIDATED AGAINST WHAT THE RUN ACTUALLY OWES, and every
// refusal names what it saw. Three refusals matter and each is its own mistake:
// a pair nobody was asked about, a token outside the closed three, and a reason
// carrying a digit.
//
// A DIGIT IN THE REASON IS REFUSED, which is the one rule here that looks like
// fussiness and is not. The item table holds no severity and the verdict set has
// no order; a number in the sentence is where a score comes back in — "three of
// five grounds", "eighty percent" — and once one is written a later reader
// compares them. Line numbers are the Harness's and are already rendered in the
// span; every other number in a review is a score by another name.
function recordVerdicts(run, file, owed, items) {
  if (!existsSync(file)) fail(`no verdicts file at ${file}`);
  let doc;
  try { doc = JSON.parse(readFileSync(file, "utf8")); }
  catch (e) {
    fail(`${file} is not readable JSON (${e.message}) — a verdicts file is one JSON object `
      + `carrying \`verdicts\`: [{step_id, item, pair?, verdict, reason, model}]`);
  }
  const list = doc && !Array.isArray(doc) && Array.isArray(doc.verdicts) ? doc.verdicts : null;
  if (!list) {
    fail(`${file} carries no \`verdicts\` array — it is one JSON object of the form `
      + `{"verdicts": [{"step_id": ..., "item": ..., "verdict": ..., "reason": ..., "model": ...}]}`);
  }
  // A PAIR ALREADY ANSWERED IS STILL ANSWERABLE (PR #895 round 1, finding 5).
  // `owed` shrinks as verdicts land, so validating against it alone refused a
  // re-submitted file — and a reviewer correcting an answer they got wrong met
  // "which this run did not ask about", which is false: the run did ask, and was
  // answered. A revision overwrites; only a pair the run never asked about, and
  // a mechanical item, are refused.
  const askable = new Map(owed.map((o) => [o.key, o]));
  for (const k of Object.keys(run.verdicts || {})) if (!askable.has(k)) askable.set(k, { key: k });
  const owedBy = askable;
  const problems = [];
  const accepted = [];
  list.forEach((v, i) => {
    const at = `\`verdicts\`[${i}]`;
    if (v === null || typeof v !== "object" || Array.isArray(v)) { problems.push(`${at} must be an object`); return; }
    const key = verdictKey(v.step_id, v.item, v.pair === undefined ? null : v.pair);
    if (!owedBy.has(key)) {
      const mech = items.items.find((it) => it.id === v.item && it.mode === "mechanical");
      problems.push(mech
        ? `${at} answers \`${key}\`, which is a MECHANICAL item — the Harness decides it `
          + "from string facts about the Draft and the Packet, and a recorded judgment over one would "
          + "silently replace a computed fact"
        : `${at} answers \`${key}\`, which this run did not ask about — the pairs it owes are `
          + `${owed.length ? owed.map((o) => o.key).join(", ") : "(none)"}`
          + `${Object.keys(run.verdicts || {}).length
            ? `, and the pairs it has already answered, which a revision may overwrite, are `
              + `${Object.keys(run.verdicts).join(", ")}` : ""}`);
      return;
    }
    if (!items.verdicts.includes(v.verdict)) {
      problems.push(`${at} carries the verdict \`${v.verdict}\` — the closed set is `
        + `${items.verdicts.join(", ")}, and there is no fourth answer`);
      return;
    }
    if (typeof v.reason !== "string" || v.reason.trim() === "") {
      problems.push(`${at} carries no \`reason\` — one sentence saying what does or does not agree`);
      return;
    }
    if (/[0-9]/.test(v.reason)) {
      problems.push(`${at}'s reason carries a digit — line numbers are rendered in the span and `
        + "every other number in a review is a score by another name; write it as a word");
      return;
    }
    // THE MODEL THAT PRODUCED THE VERDICT IS PART OF THE VERDICT (kogaki#997).
    // ReviewDraft pins a different model per role — the pair and Section
    // judgments are one fixed question with a three-token answer, the
    // recoveries, the cold read and the corrections write evidence and prose —
    // and a record that does not say which one answered cannot be read back to
    // check that the pin held. The 2026-09-07 run is the case: a hundred and
    // more model calls, and nothing in `join.json` says what ran any of them.
    if (typeof v.model !== "string" || v.model.trim() === "") {
      problems.push(`${at} carries no \`model\` — the id of the model that produced this verdict, `
        + "as passed to `--model` at the spawn. It is a DECLARATION: the Harness invokes no judge and "
        + "verifies nothing about it, which is exactly why it must be written down rather than inferred");
      return;
    }
    if (/\s/.test(v.model.trim())) {
      problems.push(`${at}'s \`model\` carries whitespace — it is one model id, the value \`--model\` `
        + `took, and \`${v.model.trim()}\` is not one`);
      return;
    }
    accepted.push({ key, step_id: v.step_id, item: v.item, pair: v.pair === undefined ? null : v.pair,
      verdict: v.verdict, reason: v.reason.trim(), model: v.model.trim() });
  });
  if (problems.length) {
    fail(`the verdicts in ${file} were not recorded:\n  - ${problems.join("\n  - ")}`);
  }
  run.verdicts = run.verdicts || {};
  for (const a of accepted) run.verdicts[a.key] = a;
  return accepted.length;
}

// ---------------------------------------------------------------------------
// The join itself.

// The declared and recovered sides as the judging model reads them. An array
// renders as a list, an object as its own labelled lines, and a NULL recovered
// field means the recovered side IS THE PROSE — the negative items, which ask
// whether something is absent from the passage rather than whether two lines
// agree.
// A DOTTED PATH REACHES ONE LEVEL INTO THE RECOVERED RECORD, and no further.
// `figure_reading` is the record's one object field, so its sub-fields are the
// only recovered sides that are not top-level — and bounding the reach at one
// level is what keeps the item table from becoming a query language over a
// record whose shape the schema declares.
function recoveredAt(rec, path) {
  const parts = String(path).split(".");
  if (parts.length === 1) return rec[parts[0]];
  if (parts.length !== 2) {
    fail(`the item table names the recovered field \`${path}\`, and a recovered side is a `
      + "top-level field or one sub-field of one. A deeper path would be a query over a record "
      + "whose shape src/recovered-schema.json declares");
  }
  const outer = rec[parts[0]];
  return outer === null || outer === undefined ? undefined : outer[parts[1]];
}

// The declared side of one judged row, rendered. THREE CARRIERS, and the row
// says which — the Packet block, the figure record's field, or the passage
// itself. `elements` is rendered by its own function because a bare object
// dump would carry each element's ground address into the question, and the
// ground is what the mechanical row already answers.
function declaredSide(step, item, declared, items) {
  if (item.record_field) {
    const v = figureDeclared(step, item);
    if (item.record_field === "elements") return renderElements(v);
    const also = (item.also_declared_blocks || [])
      .map((b) => `- **the Step's ${b}.** ${renderSide(declared[b])}`);
    return also.length
      ? [`- **the record's ${item.record_field}.** ${renderSide(v)}`, ...also].join("\n")
      : renderSide(v);
  }
  if (item.declared_block) return renderSide(declared[item.declared_block]);
  if (item.declared_source === "passage") {
    return "(the passage and the figure beside it, quoted below — both sides of this pair were "
      + "recovered from them)";
  }
  return renderSide(null);
}

// AN ENTRY OF A REVERSE OUTLINE LIST IS AN OBJECT CARRYING ITS OWN WORDS.
// `grounds`, `introduces` and `concession` each read back as `{ text }` — the
// Brief's own line, verbatim. There is no span: a span was the recovered
// record's coordinate, and a Brief Step field does not carry one, so an entry
// renders as what it says. `renderEntry` below still honours a `text`/`span`
// pair where one exists, because the figure half still writes them.
const ENTRY_KEY_PAIRS = [["text", "span"], ["claim", "span"], ["of", "span"]];
function entryKeyPairs() { return ENTRY_KEY_PAIRS; }

// ONE ENTRY OF A RENDERED LIST (kogaki#995). Interpolating the entry directly
// put `[object Object]` in front of the judging model, which answered
// `cannot-decide` — correctly, since it was shown nothing — and the run recorded
// that as a judgment about the article rather than as a defect in the tool. An
// entry renders as its own words AND the draft lines it was recovered from,
// because the span is the coordinate every other side of the join already cites.
function renderEntry(x) {
  if (x === null || x === undefined) return "(none)";
  if (typeof x !== "object") return String(x);
  for (const [textKey, spanKey] of entryKeyPairs()) {
    const span = x[spanKey];
    if (typeof x[textKey] !== "string") continue;
    if (Array.isArray(span) && span.length === 2) {
      return `${x[textKey]} (lines ${span[0]}\u2013${span[1]})`;
    }
    // NO SPAN IS THE ORDINARY CASE NOW (kogaki#1014). A Reverse Outline is a
    // Brief Step block and a Brief field carries no draft coordinate, so the
    // entry renders as its own words rather than falling through to the
    // key-by-key dump, which is what put `[object Object]`-shaped noise in
    // front of the judging model before.
    return x[textKey];
  }
  // A shape the schema does not declare still reads as its own keys and values.
  // Falling back to the stringification is what produced the defect above.
  return Object.entries(x).map(([k, v]) => `**${k}.** ${v}`).join("; ");
}

function renderSide(v) {
  if (v === null || v === undefined) return "(none)";
  if (Array.isArray(v)) {
    return v.length ? v.map((x) => `- ${renderEntry(x)}`).join("\n") : "(none)";
  }
  if (typeof v === "object") return Object.entries(v).map(([k, x]) => `- **${k}.** ${x}`).join("\n");
  return String(v);
}

// EVERY (Step, item) PAIR, computed fresh. Mechanical items are decided here;
// judged items are rendered as join Packets and answered from the run record.
// Nothing is cached across a call, because a recorded verdict is exactly what
// changes the answer.
// `opts.bound` and `opts.carry` ARE THE SECOND PASS'S WHOLE MECHANISM
// (kogaki#874). With no bound this is pass one, unchanged: every pair is
// computed. With one, a pair outside it is CARRIED from the record `opts.carry`
// holds and is neither rendered as a join Packet nor logged — which is what
// makes the bound checkable in `check.json` rather than merely stated, since a
// filter applied after the log was written would count work it did not do.
// `opts.pass` is REQUIRED and is the pass the CALLING COMMAND is — `compare`
// passes 1 and `check` passes 2. It is not defaulted: a default here would be a
// second answer to the question the caller already answers, and the wrong one is
// exactly the defect this parameter exists to close.
function buildJoin(draft, run, items, ws, opts = {}) {
  const pass = requirePass(opts.pass, "buildJoin");
  const { steps } = resolveInputs(draft);
  const floor = items.thresholds.claim_ground_containment;
  const bound = typeof opts.bound === "function" ? opts.bound : null;
  const carry = opts.carry || [];
  const results = [];
  const owed = [];
  const modelCalls = [];
  const mechanicalLog = [];
  const verdicts = run.verdicts || {};

  steps.forEach((step, si) => {
    const declared = declaredFor(step, items);
    let rec;
    try { rec = JSON.parse(readFileSync(run.recovered[step.step_id], "utf8")); }
    catch (e) { fail(`the recovered record for ${step.step_id} is not readable (${e.message})`); }
    const earlier = steps.slice(0, si);

    // THE PAIRING IS COMPUTED ONCE, AND SINCE kogaki#996 ONE ITEM READS IT.
    // `grounds-unused` asks what no claim rests on, and the assignment is how
    // it knows. `grounds` no longer reads `ground_index` for its verdict — it
    // is judged against the whole declared ground list — so the pairing decides
    // coverage only, never whether a claim is admissible.
    const pairedItem = items.items.find((it) => it.mode === "paired");
    const pairs = pairedItem
      ? pairClaims(declared[pairedItem.declared_block], rec[pairedItem.field] || [],
        pairedItem.pair_text_key, floor)
      : [];

    for (const item of items.items) {
      // A FIGURE ROW ON A FIGURELESS STEP IS NOT EVALUATED, NOT RENDERED AND
      // NOT LOGGED (kogaki#880), and the skip is FIRST — before the bound, so
      // pass two neither carries it nor demands a pass-one answer for it. A
      // vacuous `holds` would be the cheaper implementation and the wrong one:
      // it puts an answer about nothing beside answers about something, and it
      // makes the mechanical arm of the second pass's bound report coverage of
      // Steps that have no figure to cover.
      if (item.figure_only && !step.figure) continue;
      // OUT OF BOUND: CARRIED, AND THE CHECK IS FIRST. Placed before the
      // mechanical dispatch and before any join Packet is rendered, so an
      // out-of-bound pair costs no model call and appears in neither log. A
      // carried row keeps pass one's verdict, class, reason and span and is
      // marked `carried` — a reader of the pass-two record can tell a re-judged
      // answer from a preserved one, which an unmarked copy would not allow.
      if (bound && !bound(step.step_id, item.id)) {
        const prev = carry.find((r) => r.step_id === step.step_id && r.item === item.id);
        if (!prev) {
          fail(`the bounded second pass carries ${step.step_id}/${item.id} from pass one and pass `
            + "one recorded no answer for it. A carried pair with nothing to carry would render as "
            + "a verdict this run never reached; re-run `compare --draft <draft.md>` so the pair is "
            + "answered before it is carried.");
        }
        // THE SPAN IS RE-ANCHORED TO THE STEP'S CURRENT RANGE (PR #906 round 1,
        // finding 2). A carried row keeps pass one's verdict, class and reason
        // — those are readings of prose that has not moved — but NOT its
        // coordinates: a correction changes the Draft's line count, so a
        // pre-correction range rendered under the post-correction body sha
        // names whatever now sits at those numbers. That is the drifting-range
        // defect this Harness's own recovery cases are built to catch, one
        // layer out. A step-level range is coarser than the pair-level one it
        // replaces and it is TRUE, which is the trade: a true coarse
        // coordinate beats a false precise one. Pass one's own is kept beside
        // it, named as pass one's, so nothing is lost — only re-labelled.
        const reanchored = { ...prev, span: step.lines, pass_one_span: prev.span, carried: true };
        if (Array.isArray(prev.pairs)) {
          reanchored.pairs = prev.pairs.map((x) => ({ ...x, span: step.lines, pass_one_span: x.span }));
        }
        results.push(reanchored);
        continue;
      }
      const ctx = { declared, rec, step, draft, earlier, items, pairs, item };

      if (item.mode === "mechanical") {
        const impl = MECHANICAL[item.id] || MECHANICAL_FIGURE[item.id];
        if (!impl) {
          fail(`the item table declares \`${item.id}\` mechanical and this Harness has no `
            + "implementation for it — a mechanical item with no check would report `holds` for "
            + "every Draft, which is the silent pass this whole comparison exists to refuse");
        }
        const r = impl(ctx);
        results.push({ step_id: step.step_id, item: item.id, class: item.class,
          decided_by: "harness", ...r });
        mechanicalLog.push({ step_id: step.step_id, item: item.id });
        continue;
      }

      // A declared side the Packet renders as a stated absence can make a
      // negative item vacuous — there is no exemplar, so nothing of one can
      // leak. The table says so per item rather than the runtime deciding it.
      const dv = item.declared_block ? declared[item.declared_block] : null;
      if (item.when_declared_absent
          && (dv === "" || (Array.isArray(dv) && dv.length === 0))) {
        results.push({ step_id: step.step_id, item: item.id, class: item.class,
          decided_by: "harness", verdict: item.when_declared_absent.verdict,
          reason: item.when_declared_absent.sentence, span: step.lines });
        mechanicalLog.push({ step_id: step.step_id, item: item.id });
        continue;
      }

      const subs = [];
      if (item.mode === "paired") {
        // THE NON-MEMBER FALLBACK IS DECLARED, NEVER INHERITED FROM THE MATCHER
        // (kogaki#996). `pairClaims` is a matcher over declared instances, and
        // what it does with a claim it does NOT match is the load-bearing half.
        // Left implicit it was `fail`, and that fallback decided the item: on
        // the 2026-09-07 run, 87 of 93 failing claims were this branch firing
        // and only 6 were a model reading the prose, so `grounds` failed every
        // Step regardless of what the prose said. An item now says which
        // fallback it takes, and omitting it is refused rather than defaulted.
        if (item.unpaired !== "judge" && item.unpaired !== "fail") {
          fail(`the paired item \`${item.id}\` declares no \`unpaired\` disposition. A claim that `
            + "pairs with no declared ground is either judged against the whole ground list "
            + "(`judge`) or failed by the Harness (`fail`), and the choice is the item's to make "
            + "rather than the matcher's to supply.");
        }
        // AND A CHOSEN FALLBACK OWES THE FIELDS IT RENDERS (PR #1003 round 1).
        // `fail` renders `unpaired_sentence` as the comparison line's reason, so
        // an item declaring `fail` without one would put `undefined` where the
        // reason belongs — the same inherited-or-absent shape this refusal
        // exists to remove, one field further in.
        if (item.unpaired === "fail" && !item.unpaired_sentence) {
          fail(`the paired item \`${item.id}\` declares \`unpaired: "fail"\` and no `
            + "`unpaired_sentence`. The Harness renders that sentence as the reason a claim "
            + "was failed, so the fallback would decide the item and say nothing about why.");
        }
        const entries = rec[item.field] || [];
        entries.forEach((entry, i) => {
          const p = pairs[i];
          if (item.unpaired === "fail" && (!p || p.ground_index === -1)) {
            // DECIDED HERE, BY NAME, WITH NO MODEL CALL. An entry that pairs
            // with nothing has no counterpart to put a question about, and
            // `widened` is a fact about the pairing rather than a reading of it.
            subs.push({ pair: i, verdict: "fails", reason: item.unpaired_sentence,
              span: entry.span || step.lines, decided_by: "harness" });
            mechanicalLog.push({ step_id: step.step_id, item: item.id, pair: i });
            return;
          }
          const key = verdictKey(step.step_id, item.id, i);
          // UNDER `judge` THE DECLARED SIDE IS THE WHOLE GROUND LIST, not the
          // one ground the matcher picked. The question is whether the claim
          // goes beyond ANY declared ground, so a judge shown a single ground
          // would be asked a narrower question than the item states — and an
          // unpaired claim would have no side to be shown at all.
          const file = renderJoinPacket(ws, run, pass, draft, step, item, i,
            item.unpaired === "judge"
              ? renderSide(declared[item.declared_block])
              : declared[item.declared_block][p.ground_index],
            renderSide(entry[item.pair_text_key]));
          // THE VERDICT IS READ BEFORE THE CALL IS LOGGED, so the log can name
          // the model that answered it. An unanswered call carries `model:
          // null` — owed, not judged by nobody.
          const v = verdicts[key];
          modelCalls.push({ step_id: step.step_id, item: item.id, pair: i, packet: file,
            model: v ? v.model ?? null : null });
          subs.push(v
            ? { pair: i, verdict: v.verdict, reason: v.reason, model: v.model ?? null,
                span: entry.span || step.lines, decided_by: "model" }
            : { pair: i, owed: true, key, packet: file, span: entry.span || step.lines });
          if (!v) owed.push({ key, step_id: step.step_id, item: item.id, pair: i, packet: file });
        });
      } else {
        const key = verdictKey(step.step_id, item.id, null);
        const file = renderJoinPacket(ws, run, pass, draft, step, item, null,
          declaredSide(step, item, declared, items),
          item.field ? renderSide(recoveredAt(rec, item.field))
            : "(the passage itself, quoted below — this item asks whether something is ABSENT from it)");
        const v = verdicts[key];
        modelCalls.push({ step_id: step.step_id, item: item.id, pair: null, packet: file,
          model: v ? v.model ?? null : null });
        subs.push(v
          ? { pair: null, verdict: v.verdict, reason: v.reason, model: v.model ?? null,
              span: step.lines, decided_by: "model" }
          : { pair: null, owed: true, key, packet: file, span: step.lines });
        if (!v) owed.push({ key, step_id: step.step_id, item: item.id, pair: null, packet: file });
      }

      if (!subs.length) {
        results.push({ step_id: step.step_id, item: item.id, class: item.class, decided_by: "harness",
          verdict: "holds", reason: "the recovered side carries nothing for this item to disagree with",
          span: step.lines });
        mechanicalLog.push({ step_id: step.step_id, item: item.id });
        continue;
      }
      if (subs.some((s) => s.owed)) {
        results.push({ step_id: step.step_id, item: item.id, class: item.class, owed: true,
          span: step.lines });
        continue;
      }
      // THE ITEM'S LINE RENDERS THE STRONGEST NON-`holds` ANSWER AMONG ITS
      // PAIRS AND NAMES IT — a SELECTION, never an aggregate. Every pair's own
      // verdict is written to the join record, so nothing is summed, averaged
      // or scored on the way to one line; `fails` wins over `cannot-decide`
      // because a fail is the answer that has a consequence, and neither is
      // rounded into `holds`.
      const chosen = subs.find((s) => s.verdict === "fails")
        || subs.find((s) => s.verdict === "cannot-decide") || subs[0];
      const rowDecidedBy = subs.every((s) => s.decided_by === "harness") ? "harness" : "model";
      results.push({ step_id: step.step_id, item: item.id, class: item.class,
        decided_by: rowDecidedBy,
        // THE CHOSEN PAIR IS NAMED ON THE ROW (PR #1004 round 2, finding 5). The
        // row's verdict, reason and span are one pair's, and the owner record's
        // pointer to the Packet that pair was judged on cannot be composed from a
        // row that does not say which — `pairs` holds every pair, and the
        // selection is what this line is.
        pair: chosen.pair,
        verdict: chosen.verdict, reason: chosen.reason,
        // THE KEY IS PRESENT EXACTLY WHERE `decided_by` IS `model`, and its
        // VALUE is the chosen pair's — the pair whose verdict, reason and span
        // this row renders (PR #1001 round 1).
        //
        // The two facts come apart on a HYBRID item. `decided_by` is a fact
        // about the row's pairs — any one judged makes it `model` — while every
        // other field here is the CHOSEN pair's, and `grounds` can choose a
        // Harness-decided `widened` fail out of a row whose other pairs a model
        // answered. Keying presence on the chosen pair, as this first did, then
        // produced a row saying `decided_by: "model"` and carrying no `model` —
        // the one shape the absence was supposed to rule out.
        //
        // So presence answers "was a model asked here at all", which is exactly
        // what `decided_by` says, and `null` answers "not for the line you are
        // reading" — a Harness-decided pair won the selection. A row with no
        // key is a row where nothing was asked; the truth per pair is in
        // `pairs`, and it always was.
        ...(rowDecidedBy === "model" ? { model: chosen.model ?? null } : {}),
        span: chosen.span, pairs: subs });
    }
  });

  return { results, owed, modelCalls, mechanicalLog, steps };
}

// ---------------------------------------------------------------------------
// THE SECTION JOIN (kogaki#873). The cold reader's ledger, laid against what the
// trace and the Packets declare about each Section.
//
// NO SECTION-LEVEL STEP IS MINTED, and this join is why none is needed. A
// Section declares exactly one thing in the Brief — its heading, the promise
// that the question changes here — and its reader path is DERIVABLE: the first
// Step's `reader_state_before` and the last Step's `reader_state_after`. A
// Section Step would be a second authoring seat on structure, answering a
// question the Steps it groups already answer between them.
//
// THE PAIRS AND THEIR CLASSES ARE THE TABLE'S; the routing is this runtime's.
// That split is the same one the Step half makes, and it matters more here:
// ReviewDraft corrects at Step granularity only, so what a Section fail COSTS
// is not a class on the item but a route out of the Section, and only a route
// can be computed.

// A Section as the judging model reads it: one pseudo-Step, so the join
// template and `numberedProse` are reused rather than a second rendering path
// growing beside them. The prose is the DRAFT'S OWN LINES over the Section's
// span, heading included — the Section as the reader met it, not the Steps
// re-assembled, which would drop whatever the Draft carries between them.
function sectionAsStep(draft, run, sec, steps) {
  const ids = new Set(sec.steps);
  const mine = steps.filter((x) => ids.has(x.step_id));
  if (!mine.length) {
    fail(`section ${sec.index} groups no Step — the trace maps each Step to its Section, so a `
      + "Section with none is a trace the Harness cannot lay a ledger entry against");
  }
  // The heading sits above the first Step's range; the Section's span opens at
  // the heading because `section-question` is a pair against exactly it.
  const headingAt = firstHeadingAbove(draft, mine[0].lines[0]);
  const span = [headingAt === null ? mine[0].lines[0] : headingAt,
    mine[mine.length - 1].lines[1]];
  return {
    step_id: `section:${sec.index}`,
    lines: span,
    prose: draft.lines.slice(span[0] - 1, span[1]).join("\n"),
    first: mine[0],
    last: mine[mine.length - 1],
  };
}

// The nearest heading line at or above a Step's first line, within the body. A
// Section whose heading the Draft does not carry is not an error here — the
// span simply opens at the prose, and `section-question` still pairs against
// the title the TRACE declares, which is the authority either way.
function firstHeadingAbove(draft, line) {
  const floor = draft.frontmatterEnd + 3;
  for (let i = line; i >= floor; i--) {
    if (/^#+\s+\S/.test(draft.lines[i - 1] ?? "")) return i;
  }
  return null;
}

// The declared side of one Section pair. Four sources, and each is a fact the
// trace or a Packet already carries — nothing here reads a Brief, and the
// `any_packet` source is the one that could have: a thesis is the Brief's, and
// it reaches this reader through the Packet that carries it, which is the whole
// of the owner's closed-input ruling applied to the Section half.
function sectionDeclared(item, draft, sec, view, items) {
  const from = (item.declared || {}).from;
  const block = (item.declared || {}).block;
  if (from === "section_title") {
    if (typeof sec.title !== "string" || sec.title.trim() === "") {
      fail(`section ${sec.index} carries no title in the trace, and \`${item.id}\` pairs the `
        + "reader's question against exactly that heading. A Section with no declared heading is "
        + "an EMIT gap: the trace's `section_title` is what `emit` writes, and a pair laid against "
        + "an absent heading would report agreement with nothing.");
    }
    return sec.title;
  }
  const step = from === "first_step" ? view.first : from === "last_step" ? view.last : null;
  if (step) {
    return readPacketBlock(readFileSync(step.packet_path, "utf8"), block, items, step, [item.id]);
  }
  if (from === "any_packet") {
    // A FIXED POINT IS READ FROM EVERY PACKET AND MUST AGREE (kogaki#873). The
    // template renders the thesis and the opening question into every Packet
    // because they are fixed for the whole article; reading one Packet and
    // trusting the rest would make a divergence — a Packet re-rendered from a
    // moved Brief, say — invisible at exactly the join that would have caught
    // it. Disagreement is refused by name rather than resolved by picking one.
    const seen = new Map();
    for (const st of view.all) {
      const v = readPacketBlock(readFileSync(st.packet_path, "utf8"), block, items, st, [item.id]);
      const k = JSON.stringify(v);
      if (!seen.has(k)) seen.set(k, []);
      seen.get(k).push(st.step_id);
    }
    if (seen.size > 1) {
      fail(`the Packets disagree about \`${block}\`, which is a fixed point of the whole article `
        + `and which \`${item.id}\` compares against:\n`
        + [...seen.entries()].map(([k, ids]) => `  ${ids.join(", ")}: ${k}`).join("\n")
        + "\nA fixed point that differs between Packets means the Steps were written against "
        + "different articles. Re-render the Packets from the current Brief before reviewing.");
    }
    return [...seen.keys()].length ? JSON.parse([...seen.keys()][0]) : null;
  }
  fail(`the item table's Section pair \`${item.id}\` declares the source \`${from}\`, which this `
    + "Harness has no reader for — the table and the runtime disagree about where a declared side "
    + "comes from, and a pair read from nowhere would report agreement it never checked");
}

// The recovered side: which ledger entry answers this pair.
function sectionRecovered(item, run, sec, order) {
  const from = (item.recovered || {}).from;
  const field = (item.recovered || {}).field;
  const readEntry = (idx) => {
    const path = run.ledger[String(idx)];
    if (!path) return null;
    try { return JSON.parse(readFileSync(path, "utf8")); }
    catch (e) { fail(`the Section ${idx} ledger entry is not readable (${e.message}) — ${path}`); }
  };
  if (from === "entry") return (readEntry(sec.index) || {})[field] ?? null;
  if (from === "previous_entry") {
    const at = order.indexOf(sec.index);
    return at <= 0 ? null : (readEntry(order[at - 1]) || {})[field] ?? null;
  }
  if (from === "final_claim") {
    if (!run.final_claim) return null;
    let doc;
    try { doc = JSON.parse(readFileSync(run.final_claim, "utf8")); }
    catch (e) { fail(`the final claim is not readable (${e.message}) — ${run.final_claim}`); }
    return doc[item.recovered.field || "claim"] ?? Object.values(doc)[0] ?? null;
  }
  fail(`the item table's Section pair \`${item.id}\` declares the recovered source \`${from}\`, `
    + "which this Harness has no reader for");
}

// Whether a pair is vacuous on this Section, and the table's own sentence for
// saying so. A vacuous pair is DECIDED, never skipped: it renders a `holds` line
// carrying the reason it did not bind, because a skipped pair and a pair that
// held are the same silence to a reader of the output.
function sectionVacuous(item, sec, order) {
  const at = order.indexOf(sec.index);
  const when = item.vacuous_when;
  if (!when) return false;
  if (when === "no_previous_entry") return at === 0;
  if (when === "not_first_section") return at !== 0;
  if (when === "not_last_section") return at !== order.length - 1;
  fail(`the item table's Section pair \`${item.id}\` declares \`vacuous_when: ${when}\`, which `
    + "this Harness has no test for — a vacuity condition nobody evaluates would make the pair "
    + "bind everywhere or nowhere, and the two are indistinguishable in the output");
}

function buildSectionJoin(draft, run, items, ws, joinPass) {
  const pass = requirePass(joinPass, "buildSectionJoin");
  const table = items.sections || {};
  if (!Array.isArray(table.items) || !table.items.length) {
    fail("the item table declares no `sections.items`, so the cold reader's ledger would be "
      + "recorded and never laid against anything — a review that collected a whole second "
      + "reading and compared none of it reports agreement it never checked");
  }
  const { steps } = resolveInputs(draft);
  const order = run.sections.map((s) => s.index);
  const verdicts = run.verdicts || {};
  const results = [];
  const owed = [];
  const modelCalls = [];
  const mechanicalLog = [];

  for (const sec of run.sections) {
    const view = { ...sectionAsStep(draft, run, sec, steps), all: steps };
    for (const item of table.items) {
      const row = { section: sec.index, item: item.id, class: item.class, span: view.lines };
      if (sectionVacuous(item, sec, order)) {
        results.push({ ...row, decided_by: "harness", verdict: "holds",
          reason: item.vacuous_sentence });
        mechanicalLog.push({ section: sec.index, item: item.id });
        continue;
      }
      const declared = sectionDeclared(item, draft, sec, view, items);
      const recovered = sectionRecovered(item, run, sec, order);
      const key = verdictKey(view.step_id, item.id, null);
      const file = renderJoinPacket(ws, run, pass, draft, view, item, null,
        renderSide(declared), renderSide(recovered));
      const v = verdicts[key];
      modelCalls.push({ section: sec.index, item: item.id, pair: null, packet: file,
        model: v ? v.model ?? null : null });
      if (v) {
        results.push({ ...row, decided_by: "model", verdict: v.verdict, reason: v.reason,
          model: v.model ?? null,
          declared: renderSide(declared), recovered: renderSide(recovered) });
      } else {
        results.push({ ...row, owed: true });
        owed.push({ key, step_id: view.step_id, section: sec.index, item: item.id, pair: null,
          packet: file });
      }
    }
  }
  return { results, owed, modelCalls, mechanicalLog };
}

// WHERE A SECTION FINDING GOES (kogaki#873). ReviewDraft corrects at Step
// granularity only, so a Section fail is routed rather than corrected:
//
//   1. it LOCALIZES when some Step in the Section already FAILS a preserved
//      item, or when the per-Step recovered reader state first FAILS at a Step
//      — that Step is the correction target;
//   2. and when every Step in the Section holds and the Section still fails,
//      the GROUPING is wrong: the heading promises what the Steps it groups do
//      not deliver. That is a Brief defect. It goes to residue as
//      `upstream: brief`, and NO CORRECTION RUNS — correcting a Step here would
//      be repairing prose to cover for a structure nobody re-decided.
//
// Route 2 is the one worth naming twice: it is the only finding this Harness
// produces that no correction can discharge, and a run that quietly localized
// it anyway would send a healthy Step to be rewritten and report the Section
// clean afterwards.
//
// AND `cannot-decide` IS THE THIRD ANSWER HERE TOO (round 1, finding 2). The
// first form localized on `verdict !== "holds"`, which swept a `cannot-decide`
// on the localizing item into route 1 and handed a correction target to a
// reviewer who had declined to decide — contradicting the property the Step
// half states and fixtures, that `cannot-decide` sends no Step to correction.
// Narrowing to `fails` alone would have been the other error: route 2's ground
// is that EVERY STEP HOLDS, and a Section with an undecided Step would then
// have been reported as a Brief defect on a premise that is false.
//
// So neither route's condition is widened and the state that satisfies neither
// is named: the Section fails, and where it fails cannot be decided while a
// Step's reader state is unsettled. It reaches the owner as residue like an
// upstream route — no correction runs, because there is no target — and it says
// which Steps are undecided, so the owner can settle those and re-run rather
// than being handed a Brief defect that may not be one. Rounding it into either
// neighbour is exactly what the three-valued verdict exists to refuse, one
// level up from the pair it was invented for.
function routeSectionFail(sec, run, stepResults, items) {
  const localizing = (items.sections || {}).localizing_item;
  if (!localizing) {
    fail("the item table declares no `sections.localizing_item`, and a Section fail localizes on "
      + "the first Step whose recovered reader state does not hold. With none declared every "
      + "Section fail would route upstream, which would report a Brief defect for every Step "
      + "defect the Section happens to contain.");
  }
  const ids = sec.steps;
  const preserved = ids.find((id) => stepResults.some((r) => r.step_id === id
    && r.verdict === "fails" && r.class === "preserved"));
  if (preserved) {
    return { kind: "localized", step_id: preserved,
      why: "a preserved item already fails on this Step, so the Section's finding is that Step's" };
  }
  const diverged = ids.find((id) => stepResults.some((r) => r.step_id === id
    && r.item === localizing && r.verdict === "fails"));
  if (diverged) {
    return { kind: "localized", step_id: diverged,
      why: "the recovered reader state first fails at this Step" };
  }
  const undecided = ids.filter((id) => stepResults.some((r) => r.step_id === id
    && r.verdict === "cannot-decide"));
  if (undecided.length) {
    return { kind: "undecided", steps: undecided,
      why: `this Section fails and where it fails cannot be decided: ${undecided.join(", ")} `
        + "carry a `cannot-decide`, so neither is a correction target and the Section's Steps "
        + "cannot be said to hold" };
  }
  return { kind: "upstream", upstream: "brief",
    why: "every Step in this Section holds and the Section still fails, so the grouping is what "
      + "is wrong: the heading promises what the Steps it groups do not deliver" };
}

// One line per (Section, item), under the Step lines' own no-numbers rule —
// shared with `comparisonLine` rather than re-argued, because a Section line
// that could carry a number would be the same leak through a second door.
function sectionLine(r) {
  if (/[0-9]/.test(r.reason)) {
    fail(`the Section line for section ${r.section}/${r.item} carries a digit in its reason `
      + `(${JSON.stringify(r.reason)}). A review line renders line numbers and nothing else `
      + "numeric — every other number in a review is a score by another name, and quoted material "
      + "belongs in the finding's evidence rather than in the line.");
  }
  const w = (x, n) => String(x).padEnd(n, " ");
  return `${w(`section ${r.section}`, 12)}${w(r.item, 24)}${w(r.verdict, 14)}`
    + `${w(`[${r.span[0]}-${r.span[1]}]`, 14)}${r.reason}`;
}

// ONE LINE PER (Step, item), AND NO NUMBER IN IT THAT IS NOT A LINE NUMBER —
// ENFORCED HERE RATHER THAN PROMISED. The span is the only numeric field the
// line carries, and a reason carrying a digit refuses the whole emission by
// name.
//
// THE RULE IS ENFORCED BECAUSE THE FIRST LIVE DRIVE BROKE IT. Quoting the
// offending material into the reason read as helpful and was the leak: the live
// Draft's grounds are labelled by the Strands they came from, so
// `grounds-unused` rendered `ground (strand L97)` into a comparison line and put
// a number in front of a reader that was not a line number and could be
// compared. So quoted material is EVIDENCE — it goes to the join record and to
// the owner record, where a reader can see it in full — and never into the line
// whose whole claim is that the only numbers in it are coordinates.
function comparisonLine(r) {
  if (/[0-9]/.test(r.reason)) {
    fail(`the comparison line for ${r.step_id}/${r.item} carries a digit in its reason `
      + `(${JSON.stringify(r.reason)}). A comparison line renders line numbers and nothing else `
      + "numeric — every other number in a review is a score by another name, and quoted material "
      + "belongs in the finding's evidence rather than in the line.");
  }
  const w = (s, n) => String(s).padEnd(n, " ");
  return `${w(r.step_id, 8)}${w(r.item, 26)}${w(r.verdict, 14)}`
    + `${w(`[${r.span[0]}-${r.span[1]}]`, 14)}${r.reason}`;
}

function cmdCompare(args) {
  const draftPath = argString(args, "draft", "usage: review-draft compare --draft <draft.md> [--verdicts <verdicts.json>]");
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

  // EVERY MISSING INPUT IS NAMED IN ONE REFUSAL, and the Section entries are
  // named BY SECTION NUMBER (kogaki#873). A reviewer sent back for "a missing
  // entry" has to work out which; the Harness already knows, and the claim is
  // reported as its own kind because it is one record for the whole Draft
  // rather than any Section's.
  const missing = missingFor(run);
  if (missing.steps.length || missing.sections.length || missing.claim) {
    const parts = [];
    if (missing.steps.length) parts.push(`step recover${missing.steps.length === 1 ? "y" : "ies"}: ${missing.steps.join(", ")}`);
    if (missing.sections.length) parts.push(`section ledger entr${missing.sections.length === 1 ? "y" : "ies"}: ${missing.sections.join(", ")}`);
    if (missing.claim) parts.push("the cold reader's final claim: `read --claim --file <claim.json>`");
    fail(`the join has inputs missing, so it would compare a partial review against a whole Draft `
      + `and report the gaps as agreement.\n  ${parts.join("\n  ")}`);
  }

  const items = readItems();

  // THE OWED SET IS COMPUTED BEFORE ANY VERDICT IS RECORDED, and that ordering
  // is what the file is validated against: what a run asks about is a property
  // of the Draft, the Packets and the item table, never of the answers it has
  // already been given.
  let pass = buildJoin(draft, run, items, ws, { pass: 1 });
  let sec = buildSectionJoin(draft, run, items, ws, 1);
  let recorded = 0;
  if (args.verdicts !== undefined) {
    const file = argString(args, "verdicts", "usage: review-draft compare --draft <draft.md> --verdicts <verdicts.json>");
    // ONE VERDICTS FILE ANSWERS BOTH JOINS, validated against their union. Two
    // files would make it possible to record one and not the other and reach a
    // complete-looking join over half the review.
    recorded = recordVerdicts(run, file, [...pass.owed, ...sec.owed], items);
    pass = buildJoin(draft, run, items, ws, { pass: 1 });
    sec = buildSectionJoin(draft, run, items, ws, 1);
  }

  const { results, owed, modelCalls, mechanicalLog } = pass;
  const complete = owed.length === 0 && sec.owed.length === 0;
  run.join_complete = complete;
  run.compared_at = complete ? new Date().toISOString() : null;
  run.join_state = complete ? null
    : `${owed.length} pair(s) await a verdict — the join is unfilled, not clean`;
  run.findings = complete ? results.filter((r) => r.verdict !== "holds") : [];

  // THE SECTION FINDINGS ARE ROUTED HERE, at the act that produces them, and
  // kept in their own fields rather than merged into `findings`. Two reasons,
  // and the second is the load-bearing one: a Section row carries a Section
  // index where a Step row carries a `step_id`, so merging them would put a
  // `section:2` into the set `failingSides` reads as Steps; and an upstream
  // route is residue that NO pass produces — it never goes to correction at
  // all — so folding it into pass two's residue would claim it survived a pass
  // that never looked at it.
  run.section_findings = complete ? sec.results.filter((r) => r.verdict !== "holds") : [];
  run.section_routes = complete
    ? [...new Set(run.section_findings.filter((r) => r.verdict === "fails").map((r) => r.section))]
      .map((idx) => {
        const s0 = run.sections.find((x) => x.index === idx);
        return { section: idx, ...routeSectionFail(s0, run, results, items) };
      })
    : [];
  // BOTH NON-LOCALIZING ROUTES REACH RESIDUE, and each line says which it is.
  // They share the property that no correction runs — there is no target — and
  // they are different news: one says the Brief's grouping is wrong, the other
  // says the Harness could not tell, and an owner classifying the line needs to
  // know which.
  run.section_residue = run.section_routes
    .filter((r) => r.kind === "upstream" || r.kind === "undecided")
    .map((r) => ({ section: r.section, kind: r.kind, upstream: r.upstream ?? null,
      steps: r.steps ?? null, why: r.why,
      items: run.section_findings.filter((f) => f.section === r.section && f.verdict === "fails")
        .map((f) => f.item) }));
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
    // for every Step.
    model_calls: modelCalls,
    mechanical: mechanicalLog,
    // THE SECTION HALF IS ITS OWN BRANCH OF THE RECORD, not extra rows in
    // `results`. A reader of this file can tell a Step row from a Section row
    // without inspecting which key it happens to carry, and `routes` is the
    // part no other artifact holds: where each Section fail went, and why.
    sections: {
      results: sec.results,
      owed: sec.owed,
      model_calls: sec.modelCalls,
      mechanical: sec.mechanicalLog,
      routes: run.section_routes,
    },
  }, null, 2) + "\n");

  if (recorded) process.stdout.write(`recorded: ${recorded} verdict(s)\n`);

  if (!complete) {
    // NO COMPARISON LINE IS EMITTED WHILE ANY PAIR IS UNANSWERED. There is no
    // fourth token for "not asked yet", and writing `cannot-decide` here would
    // round an absence into an answer — the one rounding the three-valued
    // verdict exists to refuse.
    process.stdout.write(
      `compare: every input present — ${run.steps.length} recovered Step(s), `
      + `${run.sections.length} Section entr${run.sections.length === 1 ? "y" : "ies"} and the final claim.\n`
      + `${mechanicalLog.length} pair(s) decided mechanically, no model call.\n`
      + judgedByLine(modelCalls, sec.modelCalls)
      + `${owed.length + sec.owed.length} pair(s) await a verdict — one join Packet each, under ${passReadPath(ws, 1, "join")}:\n`
      + [...owed, ...sec.owed].map((o) => `  ${o.key}  ${o.packet}`).join("\n") + "\n"
      + "Answer each with one of holds / fails / cannot-decide plus one sentence, then\n"
      + `  node src/review-draft.mjs compare --draft ${relative(process.cwd(), draft.path) || draft.path} --verdicts <verdicts.json>\n`
      + `join record: ${joinPath}\n`);
    return;
  }

  const fails = results.filter((r) => r.verdict === "fails");
  const preserved = fails.filter((r) => r.class === "preserved");
  const undecided = results.filter((r) => r.verdict === "cannot-decide");
  const secFails = sec.results.filter((r) => r.verdict === "fails");
  const secUndecided = sec.results.filter((r) => r.verdict === "cannot-decide");
  const localized = run.section_routes.filter((r) => r.kind === "localized");
  process.stdout.write(
    results.map(comparisonLine).join("\n") + "\n\n"
    + sec.results.map(sectionLine).join("\n") + "\n\n"
    + `compare: ${results.length} (Step, item) pair(s) joined, `
    + `${mechanicalLog.length} decided mechanically and ${modelCalls.length} judged.\n`
    + `         ${sec.results.length} (Section, item) pair(s) joined, `
    + `${sec.mechanicalLog.length} vacuous by the table and ${sec.modelCalls.length} judged.\n`
    + judgedByLine(modelCalls, sec.modelCalls)
    + (preserved.length
      ? `Steps sent to correction — a preserved item fails: ${[...new Set(preserved.map((r) => r.step_id))].join(", ")}\n`
      : "No preserved item fails, so no Step is sent to correction.\n")
    // WHERE EACH SECTION FAIL WENT, in the run's own output and not only in the
    // record. A Section fail that localized and one that routed upstream are
    // different news — the first adds a correction target, the second is a
    // Brief defect no correction can discharge — and a run reporting only the
    // count would leave them indistinguishable.
    + (localized.length
      ? `Section fails localized to a Step: ${localized.map((r) => `section ${r.section} -> ${r.step_id}`).join(", ")}\n`
      : "")
    + (run.section_residue.some((r) => r.kind === "upstream")
      ? "Section fails routed UPSTREAM to the Brief — every Step in them holds, so the grouping "
        + `is what is wrong: ${run.section_residue.filter((r) => r.kind === "upstream").map((r) => `section ${r.section}`).join(", ")}\n`
        + "  No correction runs for these. They reach the owner record as residue marked "
        + "`upstream: brief`.\n"
      : "")
    + (run.section_residue.some((r) => r.kind === "undecided")
      ? "Section fails whose LOCATION could not be decided — a Step in them carries a "
        + `\`cannot-decide\`: ${run.section_residue.filter((r) => r.kind === "undecided").map((r) => `section ${r.section} (${r.steps.join(", ")})`).join(", ")}\n`
        + "  No correction runs for these either, and they are NOT reported as Brief defects: "
        + "settle those pairs and re-run.\n"
      : "")
    + (undecided.length || secUndecided.length
      ? "cannot-decide, listed with its pair and never rounded: "
        + [...undecided.map((r) => `${r.step_id}/${r.item}`),
          ...secUndecided.map((r) => `section ${r.section}/${r.item}`)].join(", ") + "\n"
      : "")
    + `join record: ${joinPath}\n`
    + (fails.length || secFails.length
      ? "`check --draft <draft.md>` is pass two.\n"
      : "`close --draft <draft.md>` writes the owner record.\n"));
}

// ---------------------------------------------------------------------------
// THE CORRECTION PATH (kogaki#874). What a corrected Step receives, the bounded
// second pass, and the drift measure.
//
// A CORRECTED STEP IS REALIZED FROM A FRESHLY RENDERED PACKET, never from the
// Packet that produced the failing prose. That is the whole answer to the
// owner's 2026-09-04 concern: the Packet's "article so far" block is the
// continuity mechanism, and a Step corrected against its ORIGINAL Packet would
// be re-realized against prose that has since moved — so each correction would
// carry the Step a little further from the article it actually sits in, which
// is exactly the drift the concern names. Rendering fresh makes the corrected
// Step's input the current article, including Steps corrected earlier in the
// same pass.
//
// THE REALIZATION LANE IS ENTERED AS A SUBPROCESS, never imported. `draft.mjs`
// is the renderer that wrote the Packets this review compares against, so a
// Step re-realized through it is realized by the same code path the original
// was; re-implementing `packet`, `section` or `emit` here would be a second
// writer of the Draft, and the two would disagree about the trace. The
// closed-input allowlist is untouched — see the note at `readDraft`'s `brief:`
// read for why the ruling binds the reviewer's reading and not this call.
function briefOf(draft) {
  if (!draft.brief) {
    fail(`${draft.path} names no Brief in its frontmatter, and the correction path re-enters the `
      + "realization lane to render a fresh Packet. Re-emit the Draft "
      + "(`node src/draft.mjs emit --brief <brief.md>`), which writes the field.");
  }
  const p = resolve(dirname(draft.path), draft.brief);
  if (!existsSync(p)) {
    fail(`the Brief this Draft names is absent — ${p}. A correction is realized from a Packet `
      + "rendered against the CURRENT Draft, and the Packet renderer is entered by its Brief.");
  }
  return p;
}

function draftLane(sub, draft, args, extra) {
  const cli = join(dirname(fileURLToPath(import.meta.url)), "draft.mjs");
  const argv = [cli, sub, "--brief", briefOf(draft), ...extra];
  // BOTH PASSTHROUGHS ARE OPTIONAL AND NEITHER IS DEFAULTED HERE. `draft.mjs`
  // already defaults its workspace (by slug, so it resolves to the one the
  // Draft was emitted from) and its Move store; defaulting them again here
  // would put a second answer beside the one the lane already gives, and the
  // store default is a literal this module is asserted not to carry.
  for (const k of ["draft-workspace", "moves-dir"]) {
    const v = args[k];
    if (typeof v === "string" && v !== "") argv.push(k === "draft-workspace" ? "--workspace" : `--${k}`, v);
  }
  const r = spawnSync(process.execPath, argv, { encoding: "utf8" });
  if (r.status !== 0) {
    fail(`the realization lane refused \`draft.mjs ${sub}\` for this correction, so nothing was `
      + `changed. Its refusal, verbatim:\n${(r.stderr || r.stdout || "(no output)").trim()}`);
  }
  return r;
}

// The pass-one join record. Read rather than recomputed: `compare` wrote which
// pairs held and which failed, and re-deriving them here would be a second
// answer to a question the record already answers — and one computed against a
// Draft the corrections have since moved.
function readJoin(ws) {
  const p = passReadPath(ws, 1, "join.json");
  if (!existsSync(p)) {
    fail(`no join record at ${p} — \`compare\` writes it, and the correction path is bounded by `
      + "what pass one found. Run `compare --draft <draft.md>` first.");
  }
  try { return JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { fail(`the join record at ${p} is not readable (${e.message})`); }
}

// THE SEAT-BLIND `correctionOwed` IS DELETED (kogaki#945), not left beside its
// replacement. Its last reader was `check`'s UNCORRECTED line, which is now
// per seat; keeping an unreferenced Step-granular owed-set would leave the next
// reader a choice between two answers to one question, and the seat-blind one
// is the answer that was wrong.
//
// What it carried that still binds, restated where the computation now lives:
// best-effort fails never send a Step to correction — they ride along when the
// Step is re-realized anyway, which is what the item table's class means at
// this act exactly as it means it at `close`; and a LOCALIZED Section fail adds
// its target Step (kogaki#873), because ReviewDraft corrects at Step
// granularity and this is the only place a Section finding becomes correctable
// work. `failingSides` below is now the sole computer of both, and it puts a
// localized route on the PROSE side — a Section's complaint is about the prose
// the Section groups, never about the figure. An UPSTREAM route adds nothing,
// by design: no correction runs for a Brief defect.

// ---------------------------------------------------------------------------
// THE FIGURE CORRECTION (kogaki#880). A failing PRESERVED figure item sends its
// Step to correction exactly as a failing prose item does — same class rule,
// same consequence — but what is re-realized is the RECORD, not the passage.
//
// TWO CORRECTIONS, NOT ONE WIDENED ONE, and the split is the design rather than
// an implementation convenience. The prose correction hands back prose and goes
// through `draft.mjs section`; the figure correction hands back a JSON record
// and goes through `draft.mjs figure`, which re-validates it against
// src/figure-schema.json and the Move's own form. Composing them would mean one
// act whose input shape depends on which item failed, and a session would have
// to know which before it could answer.
//
// PROSE FIRST WHERE A STEP OWES BOTH. The figure record's whole ground for filling the
// record after the text is that the caption is stated in what the reader holds
// after reading THIS passage — so a record corrected against prose that is
// about to change is a record corrected against nothing.

// The figure rows of the table, read from it rather than spelled here: a
// runtime naming figure item ids could not be told from one restating the
// table, the same rule `pass_two` already states about the second pass's arms.
function figureItemIds(items) {
  return new Set(items.items.filter((i) => i.figure_only).map((i) => i.id));
}

// Which of a Step's failing preserved items are the figure's, and which are the
// passage's. A Section route localizes to a Step and never to its figure, so it
// counts on the prose side — ReviewDraft corrects at Step granularity and a
// Section's complaint is about the prose the Section groups.
function failingSides(run, items, stepId) {
  const fig = figureItemIds(items);
  const rows = (run.findings || [])
    .filter((f) => f.step_id === stepId && f.verdict === "fails" && f.class === "preserved");
  const localized = (run.section_routes || []).some((r) => r.kind === "localized" && r.step_id === stepId);
  return {
    prose: rows.filter((f) => !fig.has(f.item)).map((f) => f.item).concat(localized ? ["(section)"] : []),
    figure: rows.filter((f) => fig.has(f.item)).map((f) => f.item),
  };
}

// The Steps owed a PASSAGE correction, in path order. A Step whose only failing
// preserved items are the figure's is not here — its re-realization is the
// record, and `correct` without `--figure` would hand it the wrong input.
function correctionOwedProse(run, items) {
  return run.steps.map((s) => s.step_id).filter((id) => failingSides(run, items, id).prose.length);
}

// The Steps owed a figure correction, in path order — the same order and the
// same enforcement the prose corrections run under.
function figureCorrectionOwed(run, items) {
  return run.steps.map((s) => s.step_id).filter((id) => failingSides(run, items, id).figure.length);
}

// THE (Step, seat) PAIRS STILL OWED A CORRECTION, in path order, prose first
// and each figure entry marked with the flag that reaches it. ONE definition
// for three readers (kogaki#945): the two `correct` reports and `check`'s
// UNCORRECTED line.
//
// THE UNCORRECTED LINE KEYED ON THE STEP ALONE until this, and that is the
// defect. `bound.corrected` is the set of Steps carrying ANY recorded
// correction, so a Step that owed BOTH seats and received one was in it — and
// `correctionOwed(run).filter((id) => !bound.corrected.has(id))` therefore
// dropped it, reporting no UNCORRECTED line for a Step still owing its other
// seat. That is the same silence PR #906 round 1's finding 1 repaired at the
// single-seat level, reappearing at the seat kogaki#880 introduced.
//
// The two `correct` reports already computed exactly this, twice, inline. They
// now read it from here, so a third seat cannot be added to one reader and
// missed by the others.
function seatsStillOwed(run, items) {
  const done = (seat) => new Set((run.corrections || [])
    .filter((c) => (c.seat || "prose") === seat).map((c) => c.step_id));
  const proseDone = done("prose");
  const figureDone = done("figure");
  return [
    ...correctionOwedProse(run, items).filter((id) => !proseDone.has(id)),
    ...figureCorrectionOwed(run, items).filter((id) => !figureDone.has(id)).map((id) => `${id} (--figure)`),
  ];
}

// The evidence a figure Correction block carries: this Step's rows, split the
// way the block renders them, restricted to the figure's own items. The held
// side is restricted the same way — what a figure correction must not break is
// the figure's other preserved items, and listing the passage's would ask the
// author of a JSON record not to break prose they are not editing.
function figureCorrectionEvidence(joinRec, items, stepId) {
  const fig = figureItemIds(items);
  const rows = (joinRec.results || []).filter((r) => r.step_id === stepId && fig.has(r.item));
  return {
    failed: rows.filter((r) => r.verdict === "fails"),
    held: rows.filter((r) => r.verdict === "holds" && r.class === "preserved"),
    undecided: rows.filter((r) => r.verdict === "cannot-decide"),
  };
}

function renderFigureCorrectionBlock(step, evidence, packet) {
  const out = [];
  out.push("# Correct the figure record — " + step.step_id, "",
    "This Step's figure has already been designed once. What you hand back is a",
    "RECORD, not prose: one JSON object, the instance of this Step's Move form,",
    "validated against `src/figure-schema.json` by the same act that validated",
    "the first one. The passage itself is not yours to change here.", "");
  out.push("## The Step this figure belongs to", "",
    "The Packet below is this Step's, re-rendered as it now stands. The record's",
    "elements are worded from the grounds it declares, and its caption is stated",
    "in what the Step says its reader holds afterwards.", "", packet.trim(), "");
  out.push("## The passage, as it now stands", "",
    ...numberedProse(step).split("\n").map((l) => `    ${l}`), "");
  out.push("## The figure as the reader currently meets it", "",
    ...numberedFigure(step).split("\n").map((l) => `    ${l}`), "",
    "Rendered by the Harness from the record below. You do not write this markup",
    "and nothing you hand back may contain any: the renderer re-runs on the",
    "record you return, which is what makes the transcription the same function",
    "every time.", "");
  out.push("## The previous record, verbatim", "",
    "```json",
    JSON.stringify(step.figure.record_json, null, 2),
    "```", "");
  out.push("## What failed", "");
  if (!evidence.failed.length) {
    out.push("_No figure item failed on this Step._", "");
  } else {
    for (const f of evidence.failed) {
      out.push(`- **${f.item}** (${f.class}) — ${f.reason}`);
      out.push(`  - span: lines ${f.span[0]}–${f.span[1]} of the Draft as it stood`);
      for (const e of [].concat(f.evidence ?? [])) out.push(`  - evidence: ${e}`);
      for (const pr of f.pairs || []) {
        if (pr.verdict && pr.verdict !== "holds") {
          out.push(`  - pair ${pr.pair === null ? "(whole item)" : pr.pair} — ${pr.verdict}: ${pr.reason}`);
        }
      }
    }
    out.push("");
  }
  out.push("## What held, and must go on holding", "");
  out.push(evidence.held.length
    ? evidence.held.map((h) => `- **${h.item}** — ${h.reason}`).join("\n")
    : "_No preserved figure item holds on this Step, so this correction breaks nothing by leaving it._");
  out.push("");
  if (evidence.undecided.length) {
    out.push("## What the reader could not settle", "",
      "Listed and never rounded. These are not instructions.", "",
      ...evidence.undecided.map((u) => `- **${u.item}** — ${u.reason}`), "");
  }
  out.push("## The instruction", "",
    "Change what the findings above name and nothing else. Keep the record's",
    "`kind` — it is the Move form's and not a choice made here — and keep every",
    "role the form declares. An element's `ground` names the ground the Brief",
    "bound its role to; reword the element, never the binding, unless a finding",
    "says the binding itself is wrong.", "");
  return out.join("\n");
}

// The two sides of the Correction block's evidence, from the pass-one record:
// what failed on this Step, and what HELD on it as a preserved item. The second
// is not decoration — it is what the correction must not break, and a
// correction instruction that named only the failures would be asking for a
// rewrite rather than a repair.
// THE FIGURE'S ROWS ARE NOT IN THE PROSE BLOCK (kogaki#880). What failed on the
// record is repaired by editing the record, and listing it here would ask the
// author of a passage to fix something the passage cannot reach — and put it
// under a heading saying "change what the findings above name".
function correctionEvidence(joinRec, stepId, items) {
  const fig = items ? figureItemIds(items) : new Set();
  const rows = (joinRec.results || []).filter((r) => r.step_id === stepId && !fig.has(r.item));
  return {
    failed: rows.filter((r) => r.verdict === "fails"),
    held: rows.filter((r) => r.verdict === "holds" && r.class === "preserved"),
    undecided: rows.filter((r) => r.verdict === "cannot-decide"),
  };
}

function renderCorrectionBlock(step, evidence) {
  const out = [];
  out.push("", "---", "",
    "## The Correction — what this Step must change, and what it must not", "",
    "This Step has already been realized once. Everything above is the CURRENT",
    "Packet, re-rendered against the article as it now stands, so the \"article so",
    "far\" block above holds the preceding prose including any Step corrected",
    "before this one in the same pass. Write from it, not from what you remember.",
    "");
  out.push("### The previous realization, verbatim", "",
    ...step.prose.split("\n").map((l) => `> ${l}`), "");
  out.push("### What failed", "");
  if (!evidence.failed.length) {
    out.push("_Nothing failed on this Step._", "");
  } else {
    for (const f of evidence.failed) {
      out.push(`- **${f.item}** (${f.class}) — ${f.reason}`);
      out.push(`  - span: lines ${f.span[0]}–${f.span[1]} of the Draft as it stood`);
      for (const e of [].concat(f.evidence ?? [])) out.push(`  - evidence: ${e}`);
      for (const p of f.pairs || []) {
        if (p.verdict && p.verdict !== "holds") {
          out.push(`  - pair ${p.pair === null ? "(whole item)" : p.pair} — ${p.verdict}: ${p.reason}`);
        }
      }
    }
    out.push("");
  }
  out.push("### What held, and must go on holding", "");
  out.push(evidence.held.length
    ? evidence.held.map((h) => `- **${h.item}** — ${h.reason}`).join("\n")
    : "_No preserved item holds on this Step, so this correction breaks nothing by leaving it._");
  out.push("");
  if (evidence.undecided.length) {
    out.push("### What the reader could not settle", "",
      "Listed and never rounded. These are not instructions.", "",
      ...evidence.undecided.map((u) => `- **${u.item}** — ${u.reason}`), "");
  }
  out.push("### The instruction", "",
    "Change what the findings above name and nothing else. Do not restate the",
    "Packet's wording. The preceding prose is the same reader you already had:",
    "continue from it exactly as the write instruction above says, and do not",
    "re-open what the earlier passages settled.", "");
  return out.join("\n");
}

// DRIFT IS MEASURED AND REPORTED, NEVER GATED. Both figures answer the owner's
// concern in the form it was raised — "the more a Step is corrected
// independently, the farther it may drift" — and neither withholds anything: a
// high change share is what the owner reads as the Step becoming self-contained,
// and that reading is the owner's.
function sentencesOf(text) {
  return String(text).split(/(?<=[.!?])[\s]+/).map((s) => s.trim()).filter(Boolean);
}

function driftOf(before, after, packetLines, n) {
  const prior = new Set(sentencesOf(before));
  const now = sentencesOf(after);
  const changed = now.filter((s) => !prior.has(s)).length;
  const lines = after.split("\n").filter((l) => l.trim());
  const hits = lines.filter((l) => verbatimWindow(l, packetLines, n)).length;
  return {
    change_share: `${changed} of ${now.length} sentence(s) differ from the previous realization`,
    packet_overlap: `${hits} of ${lines.length} line(s) repeat a run of the Packet's ground or state wording`,
  };
}

function driftBlocks(declared, items) {
  const names = (items.pass_two || {}).drift_blocks;
  if (!Array.isArray(names) || !names.length) {
    fail("the item table declares no `pass_two.drift_blocks`, and the drift measure reports "
      + "verbatim overlap against the Packet's ground and state lines. A measure with no blocks "
      + "to read would report zero overlap for every correction, which is a clean number about "
      + "nothing.");
  }
  return names.flatMap((b) => (Array.isArray(declared[b]) ? declared[b] : [declared[b]]))
    .filter((x) => typeof x === "string" && x !== "");
}

// THE CORRECTION INPUTS BELONG TO THE PASS WHOSE VERDICTS PRODUCED THEM, and
// that is always PASS ONE — `correct` refuses a Step that pass one's join did
// not send to correction, and pass two turns a still-failing item into residue
// rather than into another correction. So the directory is `pass-1/corrections/`
// even when a `check` has already run, which is what lets a reader go from a
// pass-one finding to the input its corrector was handed. A pass number read
// off the run record here would file the same act in two places depending on
// whether `check` happened to have been run first.
function correctionInputPath(ws, run, stepId) {
  return passPathAt(ws, run, 1, "corrections", `${stepId}.md`);
}

// THE FIGURE CORRECTION'S TWO PHASES (kogaki#880), the same shape the prose
// correction has: render the input, then record what came back. Between them
// the run is MID-CORRECTION on this Step and every other act refuses by name,
// which is `requireCurrent`'s existing guard and is not re-implemented here.
function correctFigure(args, { draft, draftPath, ws, run, items, joinRec, stepId }) {
  const step = resolveInputs(draft).steps.find((x) => x.step_id === stepId);
  if (!step.figure) {
    fail(`step ${stepId} carries no figure in the Draft's trace, so there is no record to `
      + "correct. A figure enters at composition, on the Brief, and never here");
  }

  // --- phase A: render the correction input ------------------------------
  if (args.file === undefined) {
    // THE PACKET IS RE-RENDERED FOR THE SAME REASON THE PROSE CORRECTION
    // RE-RENDERS IT: the record's elements are worded from the Step's grounds
    // and its caption from the state the Step leaves its reader in, and both
    // are the Packet's. A record corrected against the Packet that produced the
    // failing figure would be corrected against the input already found wanting.
    const r = draftLane("packet", draft, args, ["--step", stepId]);
    const prefix = `packet ${stepId}: `;
    const line = (r.stderr || "").split("\n").find((l) => l.startsWith(prefix));
    if (!line) {
      fail("the realization lane rendered a Packet and did not say where it stored it, so this "
        + "cannot show a reviewer the input the correction is written from. Its output, "
        + `verbatim:\n${(r.stderr || r.stdout || "(no output)").trim()}`);
    }
    const freshPath = line.slice(prefix.length).trim();
    if (!existsSync(freshPath)) fail(`the realization lane named a Packet at ${freshPath} and no file is there`);
    const fresh = readFileSync(freshPath, "utf8");
    const dest = passPathAt(ws, run, 1, "corrections", `${stepId}.figure.md`);
    writeFileSync(dest, renderFigureCorrectionBlock(
      step, figureCorrectionEvidence(joinRec, items, stepId), fresh) + "\n");
    run.correction_inputs = run.correction_inputs || {};
    run.correction_inputs[`${stepId}#figure`] = {
      path: dest, packet: freshPath, packet_sha: sha256(fresh),
      record: step.figure.record_path, record_sha: step.figure.record_sha,
      rendered: step.figure.rendered, rendered_at: new Date().toISOString(),
    };
    run.correcting = { step_id: stepId, seat: "figure", input: dest, since: new Date().toISOString() };
    writeRun(ws, run);
    process.stdout.write(
      `figure correction input: ${dest}\n`
      + "  It carries this Step's Packet re-rendered as it now stands, the passage, the figure as\n"
      + "  the reader currently meets it, the previous record verbatim, what failed and what must\n"
      + "  go on holding.\n"
      + "Design the record again from it, then record with\n"
      + `  node src/review-draft.mjs correct --draft ${relative(process.cwd(), draft.path) || draft.path} --step ${stepId} --figure --file <record.json>\n`
      + "You write no markup: `draft.mjs figure` re-validates the record and `emit` re-renders the\n"
      + "block from it, so the transcription is the same function it was the first time.\n");
    return;
  }

  // --- phase B: record the corrected record ------------------------------
  const file = argString(args, "file",
    "usage: review-draft correct --draft <draft.md> --step <id> --figure --file <record.json>");
  const input = (run.correction_inputs || {})[`${stepId}#figure`];
  if (!input) {
    fail(`step ${stepId} has no rendered FIGURE correction input, so this record was not written `
      + `against one. Render it first:\n  node src/review-draft.mjs correct --draft `
      + `${relative(process.cwd(), draft.path) || draft.path} --step ${stepId} --figure`);
  }
  if (!existsSync(file)) fail(`no corrected figure record at ${file}`);

  const snapDir = join(ws, "snapshots");
  mkdirSync(snapDir, { recursive: true });
  const seq = String((run.corrections || []).length + 1).padStart(2, "0");
  writeFileSync(join(snapDir, `${seq}-before-${stepId}.figure.md`), draft.text);

  // THE RENDERER RE-RUNS BY CONSTRUCTION. `figure` re-validates the record
  // against src/figure-schema.json and the Move's own form — every role
  // present, no extra role, the kind the form's, a position from the closed
  // pair — and `emit` renders the block from it. Nothing here transcribes
  // anything, which is why a syntax defect in a corrected figure stays a defect
  // of src/render-figure.mjs rather than of the sitting that corrected it.
  draftLane("figure", draft, args, ["--step", stepId, "--file", resolve(file)]);
  draftLane("emit", draft, args, []);

  const after = readDraft(draftPath);
  const afterSteps = resolveInputs(after).steps;
  const corrected = afterSteps.find((s) => s.step_id === stepId);
  if (!corrected) fail(`step ${stepId} is absent from the re-emitted Draft's trace`);
  if (!corrected.figure) {
    fail(`step ${stepId} carries no figure in the re-emitted Draft — the correction was recorded `
      + "and the block did not come back, which is the drop-with-no-report shape the renderer refuses");
  }
  writeFileSync(join(snapDir, `${seq}-after-${stepId}.figure.md`), after.text);

  const ev = figureCorrectionEvidence(joinRec, items, stepId);
  run.corrections = run.corrections || [];
  run.corrections.push({
    step_id: stepId,
    seat: "figure",
    pass: 1,
    what: "the figure record re-designed from a Packet re-rendered against the article as it "
      + `stood, with a Correction block carrying ${ev.failed.length} failed figure item(s) and `
      + `${ev.held.length} held preserved figure item(s); re-validated by \`draft.mjs figure\` and `
      + "re-rendered by `emit`",
    failed_items: ev.failed.map((f) => f.item),
    held_preserved: ev.held.map((h) => h.item),
    input: input.path,
    packet_sha: input.packet_sha,
    record_sha_before: input.record_sha,
    record_sha_after: corrected.figure.record_sha,
    // DRIFT IS REPORTED FOR THE FIGURE TOO, and it is the one figure a reader
    // can check: whether the rendered block moved at all. A correction that
    // re-validated a record and produced identical bytes changed nothing the
    // reader meets, which is information the owner reads rather than a refusal.
    block_changed: corrected.figure.rendered !== input.rendered
      ? "the rendered block differs from the one the reader met"
      : "the rendered block is byte-identical to the one the reader met",
    snapshot_before: join(snapDir, `${seq}-before-${stepId}.figure.md`),
    snapshot_after: join(snapDir, `${seq}-after-${stepId}.figure.md`),
    corrected_at: new Date().toISOString(),
  });

  run.body_sha = after.body_sha;
  delete run.correcting;
  delete run.pass_open_at;
  delete run.pass_cleared;
  run.steps = afterSteps.map((s) => ({
    step_id: s.step_id, section: s.section, section_title: s.section_title,
    lines: s.lines, packet: s.packet, packet_sha: s.packet_sha,
  }));
  // THE RECOVERY IS DISCARDED for the same reason a prose correction discards
  // it: the blind reviewer read a figure that no longer exists, and keeping the
  // record would let pass two judge a new block against an old reading.
  delete run.recovered[stepId];
  delete run.rendered[stepId];
  writeRun(ws, run);

  const stillOwed = seatsStillOwed(run, items);
  process.stdout.write(
    `corrected: ${stepId} (figure)\n`
    + `  record  ${input.record_sha}\n`
    + `       -> ${corrected.figure.record_sha}\n`
    + `  ${run.corrections[run.corrections.length - 1].block_changed}\n`
    + "  reported, never gated — what an unchanged block means is the owner's reading\n"
    + `  snapshots ${join(snapDir, `${seq}-before-${stepId}.figure.md`)}\n`
    + `            ${join(snapDir, `${seq}-after-${stepId}.figure.md`)}\n`
    + (stillOwed.length
      ? `still owed a correction, in path order: ${stillOwed.join(", ")}\n`
      : "every Step pass one sent to correction has been corrected. `check --draft <draft.md>` is pass two.\n"));
}

function cmdCorrect(args) {
  const usage = "usage: review-draft correct --draft <draft.md> --step <id> [--figure] [--file <prose|record.json>]";
  const draftPath = argString(args, "draft", usage);
  const stepId = argString(args, "step", usage);
  // THE FLAG SAYS WHICH SEAT IS BEING CORRECTED, and it is a flag rather than a
  // fact derived from what failed (kogaki#880). A Step can owe both a prose and
  // a figure correction, and the two take different inputs — prose in one and a
  // JSON record in the other — so a runtime that inferred the seat would decide
  // what shape the session's file had to be after the session wrote it.
  const figureMode = args.figure === true;
  const draft = readDraft(draftPath);
  const ws = workspaceFor(args, slugOf(draftPath));
  const run = readRun(ws);
  requireCurrent(run, draft, stepId);

  if (!run.compared_at) {
    fail("`correct` is what pass one sends a Step to, and pass one has not completed — run "
      + "`compare --draft <draft.md>` first. A correction composed before the join has answered "
      + "would be a rewrite against findings nobody recorded.");
  }
  const known = run.steps.map((s) => s.step_id);
  if (!known.includes(stepId)) fail(`unknown step \`${stepId}\` — this Draft's Steps are ${known.join(", ")}`);

  const items = readItems();
  const owed = figureMode ? figureCorrectionOwed(run, items) : correctionOwedProse(run, items);
  if (!owed.includes(stepId)) {
    const sides = failingSides(run, items, stepId);
    // THE REFUSAL NAMES THE OTHER SEAT WHERE THAT IS WHY IT REFUSED. A Step
    // owing a figure correction and asked for a prose one is not a Step with
    // nothing owed, and reporting it as one would send a session looking for a
    // finding that is recorded and readable.
    if (!figureMode && sides.figure.length) {
      fail(`step ${stepId} carries no failing PRESERVED item of the PASSAGE, and it does carry one `
        + `of the FIGURE (${sides.figure.join(", ")}). What is re-realized there is the figure `
        + `record, not the prose:\n  node src/review-draft.mjs correct --draft `
        + `${relative(process.cwd(), draft.path) || draft.path} --step ${stepId} --figure`);
    }
    if (figureMode && sides.prose.length) {
      fail(`step ${stepId} carries no failing PRESERVED FIGURE item, and it does carry one of the `
        + `passage (${sides.prose.join(", ")}). Drop --figure to correct the prose.`);
    }
    fail(`step ${stepId} carries no failing PRESERVED ${figureMode ? "figure " : ""}item, so pass `
      + "one did not send it to correction. A best-effort fail rides along when its Step is "
      + `re-realized anyway and never sends one here.\n  owed: ${owed.length ? owed.join(", ") : "(none — no Step is owed a correction)"}`);
  }
  // PATH ORDER IS ENFORCED, not requested. Corrections run in path order so
  // each later one sees the earlier ones in its own "article so far" block —
  // which is the mechanism the whole correction path rests on, and a session
  // correcting out of order would silently get the opposite: a Step realized
  // against prose that is about to change under it.
  //
  // ORDER IS TRACKED PER SEAT (kogaki#880): a Step's recorded figure correction
  // does not discharge the prose correction owed on an earlier Step, and the
  // seat a record carries is what says which it discharged.
  const seat = figureMode ? "figure" : "prose";
  const already = new Set((run.corrections || [])
    .filter((c) => (c.seat || "prose") === seat).map((c) => c.step_id));
  const earlier = owed.slice(0, owed.indexOf(stepId)).filter((id) => !already.has(id));
  if (earlier.length) {
    fail(`corrections run in path order and step ${stepId} is not next — ${earlier.join(", ")} `
      + `${earlier.length === 1 ? "is" : "are"} owed a ${seat} correction first. Each correction `
      + "re-renders the next Step's Packet against the article as it then stands, so correcting out "
      + "of order realizes a Step against prose that is about to move under it.");
  }
  // THE PASSAGE IS CORRECTED BEFORE THE FIGURE IT CARRIES, and this is the
  // figure record's
  // own ordering rather than a convention chosen here: the record's caption is
  // stated in what the reader holds after reading THIS passage, and its
  // elements are worded against prose that must already exist. A record
  // corrected against prose that is about to change is corrected against
  // nothing.
  if (figureMode) {
    const proseOwed = correctionOwedProse(run, items).includes(stepId);
    const proseDone = (run.corrections || []).some((c) => c.step_id === stepId && (c.seat || "prose") === "prose");
    if (proseOwed && !proseDone) {
      fail(`step ${stepId} owes a correction on its PASSAGE as well, and the passage is corrected `
        + "first: the record's caption is stated in what the reader holds after reading this "
        + "passage, and its elements are worded from prose that must already exist.\n"
        + `  node src/review-draft.mjs correct --draft ${relative(process.cwd(), draft.path) || draft.path} --step ${stepId}`);
    }
  }

  const joinRec = readJoin(ws);
  if (figureMode) { correctFigure(args, { draft, draftPath, ws, run, items, joinRec, stepId }); return; }

  // --- phase A: render the correction input ------------------------------
  if (args.file === undefined) {
    // RESOLVED BEFORE THE LANE IS ENTERED, and only here. Phase A still holds a
    // consistent Draft — the trace and every Packet agree — and re-rendering
    // this Step's Packet is what ends that agreement, so the previous prose is
    // read out first and recorded. Phase B reads it back from that record
    // rather than resolving a Draft it knows is mid-correction.
    const step = resolveInputs(draft).steps.find((x) => x.step_id === stepId);
    const r = draftLane("packet", draft, args, ["--step", stepId]);
    // THE LANE IS ASKED WHERE IT STORED THE PACKET, never guessed at from the
    // workspace layout. A path composed here would be a second answer to a
    // question the renderer already answers, and the two would diverge the
    // moment the draft lane's workspace rule changed.
    const prefix = `packet ${stepId}: `;
    const line = (r.stderr || "").split("\n").find((l) => l.startsWith(prefix));
    if (!line) {
      fail("the realization lane rendered a Packet and did not say where it stored it, so this "
        + "cannot show a reviewer the input the correction is written from. Its output, "
        + `verbatim:\n${(r.stderr || r.stdout || "(no output)").trim()}`);
    }
    const freshPath = line.slice(prefix.length).trim();
    if (!existsSync(freshPath)) fail(`the realization lane named a Packet at ${freshPath} and no file is there`);
    const fresh = readFileSync(freshPath, "utf8");
    const block = renderCorrectionBlock(step, correctionEvidence(joinRec, stepId, items));
    const dest = correctionInputPath(ws, run, stepId);
    writeFileSync(dest, (fresh.endsWith("\n") ? fresh : fresh + "\n") + block);
    run.correction_inputs = run.correction_inputs || {};
    run.correction_inputs[stepId] = {
      path: dest, packet: freshPath, packet_sha: sha256(fresh),
      prose: step.prose, rendered_at: new Date().toISOString(),
    };
    run.correcting = { step_id: stepId, input: dest, since: new Date().toISOString() };
    writeRun(ws, run);
    process.stdout.write(
      `correction input: ${dest}\n`
      + "  It is the Packet re-rendered against the article AS IT NOW STANDS — the \"article so\n"
      + "  far\" block holds the current preceding prose, corrections included — with one\n"
      + "  Correction block appended carrying the previous realization, what failed, and what\n"
      + "  must go on holding.\n"
      + `Realize the Step from it, then record with\n`
      + `  node src/review-draft.mjs correct --draft ${relative(process.cwd(), draft.path) || draft.path} --step ${stepId} --file <prose>\n`
      + "Until then this run is MID-CORRECTION on this Step: its Packet is the freshly rendered\n"
      + "one and its prose is still the old realization, so every other act refuses by name\n"
      + "rather than reporting a comparison between prose and an input that did not produce it.\n");
    return;
  }

  // --- phase B: record the corrected realization -------------------------
  const file = argString(args, "file", "usage: review-draft correct --draft <draft.md> --step <id> --file <prose>");
  const input = (run.correction_inputs || {})[stepId];
  // THE RENDERED-INPUT GUARD, the same one `recover` has and for the same
  // reason. Prose handed back for a Step whose correction input was never
  // rendered was written against something else — the old Packet, or the
  // finding text alone — and afterwards there is no way to tell which.
  if (!input) {
    fail(`step ${stepId} has no rendered correction input, so this prose was not written against `
      + `one. Render it first:\n  node src/review-draft.mjs correct --draft `
      + `${relative(process.cwd(), draft.path) || draft.path} --step ${stepId}`);
  }
  if (!existsSync(file)) fail(`no corrected prose at ${file}`);

  // THE PREVIOUS PROSE AND THE FRESH PACKET COME FROM THE PHASE-A RECORD, not
  // from the Draft. The Draft is mid-correction by construction here — its
  // trace names the re-rendered Packet beside prose the old one produced — so
  // resolving it would refuse on a state this act exists to end.
  const before = input.prose;
  const declared = declaredFor({ step_id: stepId, packet_path: input.packet }, items);
  const packetLines = driftBlocks(declared, items);

  // SNAPSHOTS LAND IN THE REVIEW WORKSPACE, before and after each correction —
  // the Draft is the artifact and this is the only record of what a correction
  // moved. Written before the lane is entered, so a correction the lane refuses
  // still leaves the before-state.
  const snapDir = join(ws, "snapshots");
  mkdirSync(snapDir, { recursive: true });
  const seq = String((run.corrections || []).length + 1).padStart(2, "0");
  writeFileSync(join(snapDir, `${seq}-before-${stepId}.md`), draft.text);

  draftLane("section", draft, args, ["--step", stepId, "--file", resolve(file)]);
  draftLane("emit", draft, args, []);

  // The Draft is a different document now: new prose, new line ranges, and a
  // new body sha. Re-read it rather than patching the record — the trace is the
  // join key and `emit` is what writes it.
  const after = readDraft(draftPath);
  const afterSteps = resolveInputs(after).steps;
  const corrected = afterSteps.find((s) => s.step_id === stepId);
  if (!corrected) fail(`step ${stepId} is absent from the re-emitted Draft's trace`);
  writeFileSync(join(snapDir, `${seq}-after-${stepId}.md`), after.text);

  const drift = driftOf(before, corrected.prose, packetLines, items.thresholds.verbatim_overlap_words);
  const ev = correctionEvidence(joinRec, stepId, items);
  run.corrections = run.corrections || [];
  run.corrections.push({
    step_id: stepId,
    seat: "prose",
    // PASS ONE, AND IT IS THE PASS WHOSE VERDICTS SENT THE STEP HERE rather
    // than whichever pass the run has reached — the same reading
    // `correctionInputPath` files the input under.
    pass: 1,
    what: `re-realized from a Packet re-rendered against the article as it stood, with a Correction `
      + `block carrying ${ev.failed.length} failed item(s) and ${ev.held.length} held preserved item(s)`,
    failed_items: ev.failed.map((f) => f.item),
    held_preserved: ev.held.map((h) => h.item),
    input: input.path,
    packet_sha: input.packet_sha,
    snapshot_before: join(snapDir, `${seq}-before-${stepId}.md`),
    snapshot_after: join(snapDir, `${seq}-after-${stepId}.md`),
    corrected_at: new Date().toISOString(),
    ...drift,
  });

  // The run record follows the Draft. And the corrected Step's RECOVERY is
  // discarded: the blind reviewer read prose that no longer exists, so keeping
  // the record would let pass two re-judge new prose against an old reading —
  // which is the failure mode this whole Harness is about, one layer in.
  run.body_sha = after.body_sha;
  delete run.correcting;
  // A CORRECTION RE-OPENS THE NEXT PASS. Its bound gains this Step and this
  // Step's successor, and the answers already given for pairs the widened bound
  // now covers were given about prose that has since moved.
  delete run.pass_open_at;
  delete run.pass_cleared;
  run.steps = afterSteps.map((s) => ({
    step_id: s.step_id, section: s.section, section_title: s.section_title,
    lines: s.lines, packet: s.packet, packet_sha: s.packet_sha,
  }));
  delete run.recovered[stepId];
  delete run.rendered[stepId];
  writeRun(ws, run);

  const stillOwed = seatsStillOwed(run, items);
  process.stdout.write(
    `corrected: ${stepId}\n`
    + `  drift   ${drift.change_share}\n`
    + `          ${drift.packet_overlap}\n`
    + `  reported, never gated — what a high share means is the owner's reading\n`
    + `  snapshots ${join(snapDir, `${seq}-before-${stepId}.md`)}\n`
    + `            ${join(snapDir, `${seq}-after-${stepId}.md`)}\n`
    + (stillOwed.length
      ? `still owed a correction, in path order: ${stillOwed.join(", ")}\n`
      : "every Step pass one sent to correction has been corrected. `check --draft <draft.md>` is pass two.\n"));
}

// THE SECOND PASS'S BOUND. Three arms, and the item ids come from the table
// rather than from this file (see `pass_two` there):
//
//   - a corrected Step, on its own failed items and its held preserved items;
//   - the Step immediately AFTER each corrected Step, on the two continuity
//     items — the correction moved the prose that Step continues from;
//   - every mechanical item, over the whole Draft.
//
// Nothing else is re-judged, and "nothing else" is the point rather than a
// saving: pass two exists to answer what the correction changed, and re-judging
// an untouched pair would put a second reading beside a recorded one with
// nothing to distinguish them.
function passTwoBound(run, items) {
  const declaredSuccessor = (items.pass_two || {}).successor_items;
  if (!Array.isArray(declaredSuccessor) || declaredSuccessor.length !== 2) {
    fail("the item table declares no `pass_two.successor_items` pair, and the bounded second pass "
      + "re-checks each corrected Step's successor on exactly two continuity items. A bound with "
      + "no successor arm would pass two over the corrections alone and report continuity it never "
      + "looked at.");
  }
  const known = new Set(items.items.map((i) => i.id));
  const missing = declaredSuccessor.filter((id) => !known.has(id));
  if (missing.length) {
    fail(`the item table's \`pass_two.successor_items\` names ${missing.join(", ")}, which the table `
      + "declares no item for — the bound and the item set disagree, and a successor arm keyed on "
      + "an item nobody computes re-checks nothing while reporting that it did.");
  }
  const mechanical = new Set(items.items.filter((i) => i.mode === "mechanical").map((i) => i.id));
  const order = run.steps.map((s) => s.step_id);
  const corrected = new Set((run.corrections || []).map((c) => c.step_id));
  const successors = new Set();
  for (const id of corrected) {
    const i = order.indexOf(id);
    if (i !== -1 && i + 1 < order.length) successors.add(order[i + 1]);
  }
  const own = new Map();
  for (const c of run.corrections || []) {
    const set = own.get(c.step_id) || new Set();
    for (const it of [...(c.failed_items || []), ...(c.held_preserved || [])]) set.add(it);
    own.set(c.step_id, set);
  }
  const inBound = (stepId, itemId) => mechanical.has(itemId)
    || (own.has(stepId) && own.get(stepId).has(itemId))
    || (successors.has(stepId) && declaredSuccessor.includes(itemId));
  return { inBound, corrected, successors, mechanical, successorItems: declaredSuccessor };
}

function cmdCheck(args) {
  const draftPath = argString(args, "draft", "usage: review-draft check --draft <draft.md>");
  const draft = readDraft(draftPath);
  const ws = workspaceFor(args, slugOf(draftPath));
  const run = readRun(ws);
  requireCurrent(run, draft);
  // The ordering refusal is THIS artifact's and lands now, because it is a
  // property of the flow rather than of the second pass: pass two re-checks
  // what pass one found, and there is nothing to re-check before `compare`.
  if (!run.compared_at) {
    fail("`check` is pass two and there is no pass one — run `compare --draft <draft.md>` first. "
      + "Pass two re-runs recovery and the join only for the corrected Steps, their successors' "
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
  // The blind recovery below is THIS pass's reading, so it belongs in this
  // pass's directory; setting the number after it would file pass two's re-read
  // under pass one and overwrite exactly the record the split exists to keep.
  //
  // THE NUMBER IS THE PASS THIS COMMAND IS, NOT A COUNTER. `check` IS pass two,
  // and a correction landing after it re-OPENS pass two — a widened bound and
  // cleared verdicts over the same corrected Steps — rather than starting a
  // third. So a re-entry sets 2 again, and its re-rendered inputs land beside
  // the ones it is replacing, which is within-pass and is what `correct`
  // discarding the recovered record already means. A genuine third pass would
  // be a third act, and it gets `pass-3/` with nothing else moving.
  if (!run.pass_open_at) {
    const verdicts = run.verdicts || {};
    let cleared = 0;
    for (const key of Object.keys(verdicts)) {
      const call = (priorJoin.model_calls || []).find((c) => verdictKey(c.step_id, c.item, c.pair) === key);
      if (call && bound.inBound(call.step_id, call.item)) { delete verdicts[key]; cleared++; }
    }
    run.verdicts = verdicts;
    run.pass = 2;
    run.pass_open_at = new Date().toISOString();
    run.pass_cleared = cleared;
    writeRun(ws, run);
  }

  // RECOVERY IS RE-RUN FOR THE CORRECTED STEPS AND FOR NO OTHERS. `correct`
  // discarded each corrected Step's recovered record because the reviewer read
  // prose that no longer exists; this renders the input again and refuses until
  // it comes back, which is the same blind round trip pass one made and not a
  // cheaper stand-in for it.
  const steps = resolveInputs(draft).steps;
  const owedRecovery = [...bound.corrected].filter((id) => !run.recovered[id]);
  if (owedRecovery.length) {
    const order = run.steps.map((s) => s.step_id);
    owedRecovery.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    for (const id of owedRecovery) {
      if (run.rendered[id]) continue;
      run.rendered[id] = renderReverseOutlineInput(ws, run, draft, steps.find((s) => s.step_id === id), steps);
    }
    writeRun(ws, run);
    fail(`pass two re-runs the blind recovery for every corrected Step, and `
      + `${owedRecovery.length} ${owedRecovery.length === 1 ? "is" : "are"} outstanding. The prose `
      + "these Steps carry now is not the prose the first recovery read, so the recorded reading is "
      + `about text that is gone.\n`
      + owedRecovery.map((id) => `  ${id}  ${run.rendered[id]}`).join("\n") + "\n"
      + "Read each blind and record it with `recover --draft <draft.md> --step <id> --file <recovered>`, "
      + "then run `check` again.");
  }

  // PASS TWO ANSWERS ITS OWN OWED SET, through `check --verdicts` and never
  // through `compare`'s. Routing them through `compare` would rebuild the
  // UNBOUNDED join against the corrected Draft — re-rendering a join Packet for
  // every pair, overwriting the pass-one record this pass carries from, and
  // resetting `compared_at` to a comparison nobody made. The two passes have
  // different owed sets by construction, so they need different doors.
  let pass = buildJoin(draft, run, items, ws,
    { pass: currentPass(run), bound: bound.inBound, carry: priorJoin.results || [] });
  let recorded = 0;
  if (args.verdicts !== undefined) {
    const vf = argString(args, "verdicts", "usage: review-draft check --draft <draft.md> [--verdicts <verdicts.json>]");
    recorded = recordVerdicts(run, vf, pass.owed, items);
    pass = buildJoin(draft, run, items, ws,
      { pass: currentPass(run), bound: bound.inBound, carry: priorJoin.results || [] });
  }
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
    // which Steps and items pass two actually re-judged, which is what makes
    // "bounded" checkable rather than claimed — the same move the pass-one
    // record makes for "decided mechanically".
    bound: {
      corrected: [...bound.corrected],
      successors: [...bound.successors],
      successor_items: bound.successorItems,
      mechanical_items: [...bound.mechanical],
      verdicts_cleared: cleared,
    },
    results,
    owed,
    model_calls: modelCalls,
    mechanical: mechanicalLog,
  }, null, 2) + "\n");

  if (!complete) {
    process.stdout.write(
      `check: pass two, bounded — ${bound.corrected.size} corrected Step(s), `
      + `${bound.successors.size} successor(s), ${bound.mechanical.size} mechanical item(s) over the whole Draft.\n`
      + `${mechanicalLog.length} pair(s) decided mechanically, no model call.\n`
      + `${owed.length} pair(s) await a verdict — one join Packet each:\n`
      + owed.map((o) => `  ${o.key}  ${o.packet}`).join("\n") + "\n"
      + "Answer each with one of holds / fails / cannot-decide plus one sentence, then\n"
      + `  node src/review-draft.mjs check --draft ${relative(process.cwd(), draft.path) || draft.path} --verdicts <verdicts.json>\n`
      + `check record: ${joinPath}\n`);
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
  // survived, a carried one says its Step was never corrected so nothing
  // re-read it.
  //
  // THE SECTION RESIDUE IS NOT RECOMPUTED HERE, and that is deliberate
  // (kogaki#873). An upstream route is a Brief defect: no correction ran for
  // it, so pass two did not re-read it, and re-deriving it from this pass would
  // claim it survived a pass that never looked at it. It is carried from
  // `compare` unchanged and rendered beside this residue, saying which it is.
  run.residue = run.findings
    .filter((f) => f.verdict === "fails" && f.class === "preserved")
    .map((f) => ({
      step_id: f.step_id, item: f.item,
      // WHAT THE OWNER RECORD'S POINTERS ARE COMPOSED FROM, kept on the row: the
      // pass that read it (a carried row is pass one's whatever pass the run
      // reached) and whether a judge was handed a Packet for the chosen pair.
      pair: f.pair, carried: Boolean(f.carried), judged: chosenJudged(f),
      why: f.carried
        ? `${f.reason} — carried from pass one and NOT re-judged: this Step was not corrected, `
          + "so nothing in pass two read it again"
        : `${f.reason} — still failing after pass two`,
    }));
  run.checked_at = new Date().toISOString();
  writeRun(ws, run);

  const judged = modelCalls.length;
  // NAMED IN THE RUN'S OWN OUTPUT, not only in the record. A pass two that
  // completed because nothing was corrected and a pass two that completed
  // because every correction was made produce the same exit, and telling them
  // apart is exactly what "stopping early and finishing produce the same
  // silence" warns about.
  // PER SEAT, NOT PER STEP (kogaki#945). `bound.corrected` holds every Step
  // carrying ANY correction, so keying this line on it reported nothing for a
  // Step that owed both seats and received one — the seat still owed went
  // unnamed while its preserved fails were carried as residue.
  const uncorrected = seatsStillOwed(run, items);
  process.stdout.write(
    results.filter((r) => !r.carried).map(comparisonLine).join("\n") + "\n\n"
    + `check: pass two over ${results.filter((r) => !r.carried).length} re-judged (Step, item) pair(s); `
    + `${results.filter((r) => r.carried).length} carried unchanged from pass one.\n`
    + `  corrected Steps      ${[...bound.corrected].join(", ") || "(none)"}\n`
    + `  successors re-checked ${[...bound.successors].join(", ") || "(none)"} on ${bound.successorItems.join(", ")}\n`
    + `  mechanical items      re-run over every Step\n`
    + `${mechanicalLog.length} pair(s) decided mechanically and ${judged} judged.\n`
    + judgedByLine(modelCalls)
    + (uncorrected.length
      ? `UNCORRECTED — pass one sent these to correction and they are still owed: ${uncorrected.join(", ")}.\n`
        + "  An entry marked `(--figure)` is the figure seat; the rest are the passage. A Step can\n"
        + "  appear on both, and a Step that received one seat still appears for the other.\n"
        + "  Their preserved fails are residue CARRIED from pass one, not re-judged by this pass;\n"
        + "  the owner record says so per line. `correct --step <id> [--figure]` is the act that changes that.\n"
      : "")
    + (run.residue.length
      ? `residue — preserved item(s) reaching the owner to classify: `
        + `${run.residue.map((r) => `${r.step_id}/${r.item}`).join(", ")}\n`
      : "no preserved item fails after pass two, so the Step residue is empty.\n")
    + ((run.section_residue || []).length
      ? "residue carried from pass one — Section fail(s) with no correction target: "
        + `${run.section_residue.map((r) => `section ${r.section} (${r.kind})`).join(", ")}\n`
        + "  No correction ran for these and pass two did not re-read them.\n"
      : "")
    + `check record: ${joinPath}\n`
    + "`close --draft <draft.md>` writes the owner record.\n");
}

// ---------------------------------------------------------------------------
// `close` — the owner record. `theses/<slug>/review.md`, one per Draft,
// overwritten on re-run, headed by the Draft's body sha and the Packet shas it
// was reviewed against.
//
// EVERY RESIDUE LINE CARRIES AN EMPTY `classified:` FIELD AND THE TOOL NEVER
// FILLS IT. The residue is what survived two passes, and what it is evidence
// ABOUT — the Packet, or ReviewDraft itself — is exactly the judgment the owner
// holds. A tool that guessed would be answering the one question the whole
// two-pass bound exists to put in front of a person.
// The pass-directory pointers item 4 of kogaki#994 asks for, rendered from the
// passes the run actually made rather than from the layout constant — a run that
// never reached `check` has no `pass-2/`, and naming one would send a reader to
// a directory nothing wrote.
// The recovery record and the join input a single verdict rests on. Rendered
// from the same rule the writers compose their paths with, so a reader following
// one lands on the file the judge was actually handed.
//
// BOTH HALVES ARE READ OFF THE ROW, NEVER OFF THE SECTION IT RENDERS IN (PR
// #1004 round 2, findings 5 and 6). Which pass read a row: a carried row was
// read by pass one whatever pass the run has reached, and every other row by
// the last pass that ran. Whether a Packet exists for it: a Harness-decided
// line — a mechanical item, a stated absence, an empty recovered side, or a
// paired item whose chosen pair the matcher decided — never had a join Packet
// rendered, so no pointer to one is composed; the pass's join record says how
// it was decided. Composing `pass-2/` for a carried row, or a Packet name for a
// mechanical row, pointed the owner at files nothing ever wrote.
//
// THE RECOVERED RECORD IS THE ONE THE RUN READ, taken from the run record's
// own map rather than composed from the pass: pass two re-reads only the
// corrected Steps, so a successor Step's continuity item is judged in pass two
// against pass ONE's recovered record, and `run.recovered` is the map every
// join reads from. A carried row's is pass one's by definition.
function evidencePass(run, f) {
  return f.carried ? 1 : (run.checked_at ? 2 : 1);
}
function chosenJudged(f) {
  if (typeof f.judged === "boolean") return f.judged;
  if (Array.isArray(f.pairs)) {
    const sub = f.pairs.find((p) => p.pair === f.pair);
    return sub ? sub.decided_by === "model" : false;
  }
  return f.decided_by === "model";
}
function findingEvidencePaths(ws, run, f) {
  if (!f.step_id) return [];
  const pass = evidencePass(run, f);
  const rel = (...a) => relative(process.cwd(), join(ws, `pass-${pass}`, ...a))
    || join(ws, `pass-${pass}`, ...a);
  const recovered = f.carried
    ? join(ws, "pass-1", "recovered", `${f.step_id}.json`)
    : ((run.recovered || {})[f.step_id] || join(ws, `pass-${pass}`, "recovered", `${f.step_id}.json`));
  const out = [`  - recovered record: \`${relative(process.cwd(), recovered) || recovered}\``];
  if (chosenJudged(f)) {
    const name = f.pair === null || f.pair === undefined
      ? `${f.step_id}.${f.item}.md` : `${f.step_id}.${f.item}.${f.pair}.md`;
    out.push(`  - the pair the judge saw: \`${rel("join", name)}\``);
  } else {
    out.push("  - the pair the judge saw: none — this line was not a judge's answer to a rendered "
      + `Packet; \`${rel(pass === 1 ? "join.json" : "check.json")}\` records how it was decided`);
  }
  return out;
}

function evidenceLines(ws, run) {
  const rel = (...a) => relative(process.cwd(), join(ws, ...a)) || join(ws, ...a);
  const out = [
    `- **Pass 1 — \`compare\`.** \`${rel("pass-1")}/\``,
    `  - \`recovery/<step>.md\` — what the blind reviewer was handed`,
    `  - \`recovered/<step>.json\` — what they wrote back`,
    `  - \`join/<step>.<item>[.<pair>].md\` — the pair each verdict was given on`,
    `  - \`ledger/\` — the cold reader's Section entries and final claim`,
    `  - \`corrections/<step>.md\` — the input each correction was written from`,
    `  - \`join.json\` — pass one's verdicts, and which pairs were decided mechanically`,
  ];
  if (run.checked_at || currentPass(run) > 1) {
    out.push(
      `- **Pass 2 — \`check\`.** \`${rel("pass-2")}/\``,
      `  - \`recovery/<step>.md\` and \`recovered/<step>.json\` — the corrected Steps, re-read blind`,
      `  - \`join/<step>.<item>[.<pair>].md\` — the pairs inside the second pass's bound`,
      `  - \`check.json\` — pass two's verdicts, the bound it applied, and what it carried`,
      "",
      "A pair pass two carried rather than re-judged has its verdict in `pass-1/join.json`",
      "and its input under `pass-1/join/`; the bound in `check.json` says which.");
  } else {
    out.push("- **Pass 2 — `check`.** Did not run, so there is no `pass-2/`.");
  }
  out.push("",
    `- **Snapshots.** \`${rel("snapshots")}/\` — the article before and after each correction.`,
    `- **Run record.** \`${rel("run.json")}\` — every path above, per Step, as it was written.`);
  return out;
}

function cmdClose(args) {
  const draftPath = argString(args, "draft", "usage: review-draft close --draft <draft.md>");
  const ws = workspaceFor(args, slugOf(draftPath));
  const run0 = readRun(ws);
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
        + "directory and record them with `compare --draft <draft.md> --verdicts <verdicts.json>`.");
    }
    fail("`close` is reachable from `compare` with zero fails, or from `check` in every state — "
      + "and neither has run. Run `compare --draft <draft.md>` first.");
  }
  // ONLY A **PRESERVED** ITEM'S FAIL WITHHOLDS `close` (kogaki#872). The item
  // table makes the class the CONSEQUENCE: a preserved fail sends its Step to
  // correction, and a best-effort fail rides along only when that Step is
  // re-realized anyway. A guard counting every fail would send a Step to pass
  // two for a best-effort finding, which is the opposite of riding along — and
  // it would make `close` unreachable on a Draft whose only findings are ones
  // the design says to carry rather than to act on. Found on the first live
  // drive, where a best-effort item fired on every Step.
  // A LOCALIZED SECTION FAIL WITHHOLDS `close` THE SAME WAY (kogaki#873): it
  // named a correction target, so pass two is what turns it into a correction
  // or into residue. AN UPSTREAM ONE DOES NOT — no correction runs for a Brief
  // defect, so routing it through pass two would ask a pass to re-read
  // something nothing changed, and `close` is where it was always going.
  const localized = (run.section_routes || []).filter((r) => r.kind === "localized");
  const fails = (run.findings || []).filter((f) => f.verdict === "fails" && f.class === "preserved");
  if (localized.length && !run.checked_at) {
    fail(`the Section join sent ${localized.map((r) => `section ${r.section} -> ${r.step_id}`).join(", ")} `
      + "to correction, so `close` is reachable only through `check`. A Section fail that localizes "
      + "to a Step is that Step's to repair; only a fail whose Section holds throughout routes "
      + "upstream to the Brief and reaches this record directly.");
  }
  if (fails.length && !run.checked_at) {
    fail(`the join found ${fails.length} failing PRESERVED item(s), so \`close\` is reachable only `
      + "through `check` — pass two is what turns a failing preserved item into a correction or into "
      + `residue. A best-effort fail does not withhold the record; it rides along. Failing: `
      + `${fails.map((f) => `${f.step_id}/${f.item}`).join(", ")}`);
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
        ? ` — the article with this run's ${run.corrections.length} correction(s) in it.`
        : " — no correction was made, so it is byte-identical to the Draft above."),
    `- **Body sha.** \`${run.body_sha}\``,
    `- **Opened.** ${run.opened_at}`,
    `- **Closed.** ${now}`,
    `- **Passes.** ${run.checked_at ? "two (compare, check)" : "one (compare)"}`,
    "",
    "### The Packets it was reviewed against",
    "",
    ...run.steps.map((s) => `- \`${s.step_id}\` — \`${s.packet}\` sha \`${s.packet_sha}\``),
    "",
    // ITEM 4 OF kogaki#994. A finding names a Step and an item; the two
    // artefacts that make it checkable — the input the judge was handed and
    // the record the blind reviewer wrote — live in the pass directory, and
    // until this the record pointed at neither. `runs/` is machine state and is
    // pruned, so the paths are named as the shape they have rather than
    // promised to be there: a reader whose workspace has been pruned learns
    // what was pruned rather than that nothing was written.
    "### Where this run's evidence is",
    "",
    `The workspace is \`${ws}\` — machine state, gitignored and pruned to the last few`,
    "runs. Each pass wrote only under its own directory:",
    "",
    ...evidenceLines(ws, run),
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
    // a preserved item's `fails` sends the Step to correction and a
    // best-effort one's rides along if that Step is re-realized anyway. A
    // findings list that rendered the verdict alone would leave the owner to
    // look the consequence up.
    for (const f of run.findings) {
      lines.push(`- **${f.step_id} / ${f.item}** — ${f.verdict} (${f.class ?? "unclassed"})`);
      if (f.reason) lines.push(`  - ${f.reason}`);
      // THE QUOTED MATERIAL LIVES HERE, and this is the other half of the
      // comparison line's no-numbers rule: the line refuses to carry a quote,
      // so the owner record is where a finding becomes actionable rather than
      // merely located.
      for (const e of [].concat(f.evidence ?? [])) lines.push(`  - evidence: ${e}`);
      if (f.declared) lines.push(`  - declared: ${f.declared}`);
      if (f.recovered) lines.push(`  - recovered: ${f.recovered}`);
      if (f.span) lines.push(`  - span: ${JSON.stringify(f.span)}`);
      // THE TWO ARTEFACTS BEHIND THE VERDICT (kogaki#994 item 4). `run.findings`
      // is pass two's once `check` has run and pass one's before, and a carried
      // row is pass one's either way — the row says which, and the pointer
      // follows the row.
      for (const l of findingEvidencePaths(ws, run, f)) lines.push(l);
    }
    lines.push("");
  }

  // THE SECTION FINDINGS ARE THEIR OWN SECTION OF THE RECORD, and each names
  // WHERE IT WENT. A Section finding with no route rendered would leave the
  // owner to work out whether a correction was owed for it, which is the one
  // thing the routing rules exist to have already decided.
  lines.push("## The cold reader — Section findings", "");
  if (!(run.section_findings || []).length) {
    lines.push(run.join_state
      ? `_None recorded — ${run.join_state}. This is an unfilled join, not a clean review._`
      : "_None._", "");
  } else {
    const routeFor = (idx) => (run.section_routes || []).find((r) => r.section === idx);
    for (const f of run.section_findings) {
      lines.push(`- **Section ${f.section} / ${f.item}** — ${f.verdict} (${f.class ?? "unclassed"})`);
      if (f.reason) lines.push(`  - ${f.reason}`);
      if (f.declared) lines.push(`  - declared: ${f.declared}`);
      if (f.recovered) lines.push(`  - recovered: ${f.recovered}`);
      if (f.span) lines.push(`  - span: ${JSON.stringify(f.span)}`);
      const r = f.verdict === "fails" ? routeFor(f.section) : null;
      if (r) {
        lines.push(r.kind === "localized"
          ? `  - route: corrected at **${r.step_id}** — ${r.why}`
          : r.kind === "upstream"
            ? `  - route: **upstream: ${r.upstream}** — ${r.why}`
            : `  - route: **undecided** — ${r.why}`);
      }
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
      lines.push(`- **${c.step_id}** (pass ${c.pass}) — ${c.what}`);
      if (c.change_share !== undefined) lines.push(`  - change share: ${c.change_share}`);
      if (c.packet_overlap !== undefined) lines.push(`  - packet overlap: ${c.packet_overlap}`);
    }
    lines.push("");
  }

  lines.push("## Residue", "",
    "Each line is an item that survived every pass this run made. Fill",
    "`classified:` with `packet` or `reviewdraft`.", "");
  const upstream = run.section_residue || [];
  if (!run.residue.length && !upstream.length) {
    lines.push("_None._", "");
  } else {
    for (const r of run.residue) {
      lines.push(`- **${r.step_id} / ${r.item}** — ${r.why}`);
      // A RESIDUE LINE PASS TWO RE-JUDGED POINTS AT PASS TWO; ONE IT CARRIED
      // POINTS AT PASS ONE, which is the only pass that read it. The row carries
      // the distinction its own `why` was written from.
      for (const l of findingEvidencePaths(ws, run, r)) lines.push(l);
      lines.push("  classified:");
    }
    // AN UPSTREAM LINE SAYS SO, AND SAYS IT IS NOT ABOUT A STEP. It reached the
    // record without a correction and without pass two, which is a different
    // provenance from every other residue line here — and the owner is being
    // asked to classify it `packet` or `reviewdraft` on exactly that basis.
    for (const r of upstream) {
      lines.push(`- **Section ${r.section} / ${r.items.join(", ")}** — `
        + (r.kind === "upstream" ? `upstream: ${r.upstream}` : "undecided") + ` — ${r.why}`);
      lines.push(r.kind === "upstream"
        ? "  - No correction ran: ReviewDraft corrects at Step granularity, and every Step in "
          + "this Section holds, so what is wrong is the grouping."
        : "  - No correction ran: there is no target. This is NOT a Brief defect — the Section's "
          + "Steps cannot be said to hold while a pair is undecided.");
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
  recover: cmdRecover,
  read: cmdRead,
  compare: cmdCompare,
  correct: cmdCorrect,
  check: cmdCheck,
  close: cmdClose,
};

const USAGE = `review-draft — the round-trip review of a CanonicalDraft against its Packets

  node src/review-draft.mjs open    --draft <draft.md>
  node src/review-draft.mjs recover --draft <draft.md> --step <id> --file <recovered>
  node src/review-draft.mjs read    --draft <draft.md> --section <n> --file <entry.json>
  node src/review-draft.mjs read    --draft <draft.md> --claim --file <claim.json>
  node src/review-draft.mjs compare --draft <draft.md> [--verdicts <verdicts.json>]
  node src/review-draft.mjs correct --draft <draft.md> --step <id> [--file <prose>]
  node src/review-draft.mjs correct --draft <draft.md> --step <id> --figure [--file <record.json>]
  node src/review-draft.mjs check   --draft <draft.md> [--verdicts <verdicts.json>]
  node src/review-draft.mjs close   --draft <draft.md>

The Harness owns the ordering: \`recover\` refuses a Step whose recovery input it
did not render, \`compare\` refuses while any Step recovery, Section entry or the
cold reader's final claim is missing,
\`check\` refuses before \`compare\`, and \`close\` is reachable from \`compare\` with
zero fails or from \`check\` in every state.

THE WORKSPACE IS SPLIT BY PASS, and the layout is this command's contract rather
than a convention:

  runs/review/<slug>/pass-1/{recovery,recovered,join,ledger,corrections,
                             cold-reader.md,join.json}
  runs/review/<slug>/pass-2/{recovery,recovered,join,check.json}
  runs/review/<slug>/snapshots/    before/after per corrected Step
  runs/review/<slug>/run.json

Every pass writes only under its own directory, and a write that would land on a
file another pass wrote is REFUSED BY NAME. A later third pass is \`pass-3/\` and
nothing else moves. \`snapshots/\` and \`run.json\` stay at the root: a snapshot
pair spans the correction that separates two passes, and the run record is the
one file every pass writes. \`corrections/\` is PASS ONE'S ONLY — \`correct\`
discharges a verdict pass one recorded, and pass two turns a still-failing item
into residue rather than into another correction — so pass two has none.

\`close\` writes the corrected article to \`theses/<slug>/draft.reviewed.md\` and
RESTORES \`theses/<slug>/draft.md\` to the Draft the run reviewed, so the Draft is
byte-identical before and after a run and the diff between the two files is the
review. \`review.md\` names both. A second \`close\` on a closed run refuses.

\`correct\` runs in TWO PHASES like \`compare\`: with no \`--file\` it renders the
correction input — the Step's Packet RE-RENDERED against the article as it now
stands, so the "article so far" block carries the current preceding prose
including Steps corrected earlier in the same pass, with one Correction block
appended holding the previous realization, what failed, and what held and must
go on holding. With \`--file\` it records the corrected prose through the
realization lane and reports the drift: the share of sentences changed and the
verbatim overlap with the Packet's ground and state lines. Both are REPORTED and
neither gates. Corrections run in path order, and a Step out of order refuses.

\`--figure\` corrects the Step's FIGURE RECORD instead of its passage, and it is
the seat a failing preserved figure item sends the Step to. Phase A renders the
Packet as it now stands, the passage, the block as the reader currently meets
it, the previous record verbatim, and what failed and held; phase B takes the
re-designed record and hands it to \`draft.mjs figure\`, which re-validates it,
and \`emit\`, which re-renders the block from it. You write no markup. A Step
owing both corrections takes the passage first: the record's caption is stated
in what the reader holds after reading that passage.

\`check\` is pass two and is BOUNDED: it re-runs the blind recovery for the
corrected Steps, then re-judges their own failed and held preserved items, the
two continuity items on each corrected Step's successor, and every mechanical
item over the whole Draft. Every other pair is CARRIED from pass one, marked as
carried, at no model call. A preserved item still failing after pass two is
residue, and \`close\` hands it to the owner with an empty \`classified:\` field.

\`compare\` decides the mechanical items itself and renders one join Packet per
judged pair; \`--verdicts\` records the answers. It emits one line per (Step,
item) once every pair is answered, and never before: there is no fourth token
for "not asked yet", and \`cannot-decide\` is a real answer rather than a place
to round one.

EVERY VERDICT NAMES THE MODEL THAT PRODUCED IT — \`{step_id, item, pair?,
verdict, reason, model}\`, and a verdict with no \`model\` is refused. The id
rides the verdict, the \`model_calls\` log and the emitted \`judged by DECLARED
model(s)\` line. It is a DECLARATION: the Harness invokes no judge, pins no
model and verifies nothing about the value, which is why the record must carry
what the spawn was pinned to rather than leaving it to be inferred from a run
that no longer exists.

\`open\` also renders the COLD READER'S input: the Draft body alone, no
frontmatter and nothing from a Packet. That reader records, per Section, the
question it answered and what they now believe, and one final claim for the
whole article; \`read\` takes those back and validates them. \`compare\` lays them
against the heading the trace declares and the reader states the Section's first
and last Packets declare, on the same three tokens. A Section fail is ROUTED
rather than corrected — ReviewDraft corrects at Step granularity only: to a Step
when one in the Section is already failing or its recovered reader state stops
holding, and otherwise UPSTREAM to the Brief as residue marked
\`upstream: brief\`, with no correction run.

It reads the Draft, its trace and the Packets that trace names — no Brief, no
Move file, no Strand. A check that needs anything else is a Packet gap and is
filed against src/packet-template.md.
`;

// ---------------------------------------------------------------------------
// The fixture pass — seam-free, filesystem under a temp dir only, driven
// END TO END through the real entry points rather than against the functions.
// The same arrangement `src/draft.mjs --self-test` uses, and for the reason its
// own record gives: the defects this Harness exists to refuse are properties of
// the refusal surfaces a caller meets, and an assertion against an internal
// function passes while the surface is wrong.
//
// Each case CONSTRUCTS its defect and asserts the refusal BY NAME. A case that
// only asserted a non-zero exit would pass on any refusal, including one about
// a different Step.
async function runSelfTest() {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { spawnSync } = await import("node:child_process");
  const self = fileURLToPath(import.meta.url);
  const root = mkdtempSync(join(tmpdir(), "review-draft-selftest-"));
  // THE FIXTURE'S DECLARED JUDGE (kogaki#997). Every verdict a case records
  // names the model that produced it, because the surface refuses one that does
  // not; this is a stand-in id and never a pin — the pins live in
  // `.claude/skills/review-draft/SKILL.md`, and the Harness names no model of
  // its own anywhere.
  const JUDGE_MODEL = "a-judging-model";
  let passed = 0; const failures = [];
  // `detail` RENDERS (kogaki#883, finding 3). Case 23 always passed its
  // offending-import list as a third argument, and the two-parameter form
  // dropped it — so a future allowlist failure would have named the case and
  // never the import that broke it, the one fact a repair needs. Same shape as
  // the sibling `ok` in src/runs.mjs.
  const ok = (name, cond, detail = "") => {
    if (cond) passed++; else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  };
  // A CASE MUST FAIL, NEVER THROW. A mutation that stops `close` writing its
  // record used to take the whole pass down with an ENOENT from the next case,
  // and a crash reports no case count at all — which is the shape
  // checks/check-review-draft-runtime.sh reads as "the pass did not run" rather
  // than as "these cases failed". Every later read of a written artifact goes
  // through this.
  const readOrEmpty = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");

  // -- the fixture Draft, built the way `emit` builds one -------------------
  // Line ranges are computed rather than transcribed: a transcribed range that
  // drifts from the body would make every prose-quoting case assert against the
  // wrong text while still passing, which is this Harness's own subject matter.
  const PROSE = {
    a1: ["The first passage opens the claim and says what the reader is about to be shown.",
      "",
      "It runs two paragraphs so a range covering more than one line is exercised.",
      "The harness renders each input in the path's recorded order."],
    a2: ["The second passage continues under the same heading and does not restate it."],
    a3: ["The third passage opens the second Section with a question of its own."],
  };
  const SECTIONS = [
    { index: 1, title: "The first heading", steps: ["a1", "a2"] },
    { index: 2, title: "The second heading", steps: ["a3"] },
  ];

  // THE FIGURE'S MARKUP COMES FROM THE REAL RENDERER (kogaki#880), reached by
  // SPAWNING it rather than importing it: this pass asserts a closed input
  // allowlist that forbids importing anything but node builtins and ./runs.mjs,
  // and a hand-written block would be this fixture's belief about what the renderer
  // emits — the same belief PR #895 found wrong twice about the Packet
  // template. Spawning costs one process per figure and buys the property that
  // matters: what the blind reviewer is shown here is what a reader meets.
  function renderFigureMarkup(record) {
    const src = "import(process.argv[1]).then(m => {"
      + " const r = m.renderFigure(JSON.parse(process.argv[2]));"
      + " if (r.error) { process.stderr.write(r.error); process.exit(1); }"
      + " process.stdout.write(r.markup); });";
    const r = spawnSync(process.execPath,
      ["-e", src, join(dirname(self), "render-figure.mjs"), JSON.stringify(record)],
      { encoding: "utf8" });
    if (r.status !== 0) {
      throw new Error(`the fixture could not render a figure through src/render-figure.mjs: `
        + `${(r.stderr || "(no output)").trim()}`);
    }
    return r.stdout;
  }

  function buildDraft(dir, { packetDir, mutate = (t) => t, omitLines = null, omitPacket = null,
    prose = PROSE, figures = null } = {}) {
    mkdirSync(dir, { recursive: true });
    // The figure records are written first: the body needs their markup and the
    // trace needs their shas, and both are the record AS STORED.
    const figureFiles = {};
    for (const [id, f] of Object.entries(figures || {})) {
      const fp = join(dir, `figure-${id}.json`);
      writeFileSync(fp, JSON.stringify(f.record, null, 2) + "\n");
      figureFiles[id] = { path: fp, sha: sha256(readFileSync(fp, "utf8")),
        markup: renderFigureMarkup(f.record), position: f.record.position };
    }
    // Body first, recording each Step's 1-based body range. The figure is
    // pushed before or after the prose per its record's `position`, which is
    // exactly what `src/draft.mjs assembleBody` does — and its range is
    // recorded separately, because the renderer's whole point is that the Step's own
    // range spans the prose alone.
    const body = []; const ranges = {}; const figureRanges = {};
    const pushBlock = (markup) => {
      const start = body.length + 1;
      body.push(...markup.replace(/\n+$/, "").split("\n"));
      const span = [start, body.length];
      body.push("");
      return span;
    };
    for (const sec of SECTIONS) {
      body.push(`## ${sec.title}`, "");
      for (const id of sec.steps) {
        const f = figureFiles[id];
        if (f && f.position === "before") figureRanges[id] = pushBlock(f.markup);
        const start = body.length + 1;
        body.push(...prose[id]);
        ranges[id] = [start, body.length];
        body.push("");
        if (f && f.position === "after") figureRanges[id] = pushBlock(f.markup);
      }
    }
    while (body.length && body[body.length - 1] === "") body.pop();

    const trace = [];
    for (const sec of SECTIONS) {
      for (const id of sec.steps) {
        const rec = { step_id: id, section: sec.index, section_title: sec.title };
        trace.push(rec);
      }
    }
    const head = ["---", "brief: brief.md", "brief_pin: sha256:0000", "trace:"];
    const bodyOffset = head.length + trace.length + 2;
    for (const t of trace) {
      const r = ranges[t.step_id];
      if (omitLines !== t.step_id) t.lines = [r[0] + bodyOffset, r[1] + bodyOffset];
      if (omitPacket !== t.step_id) {
        const p = join(packetDir, `${t.step_id}.md`);
        t.packet = relative(dir, p);
        t.packet_sha = sha256(readFileSync(p, "utf8"));
      }
      const f = figureFiles[t.step_id];
      if (f) {
        const fr = figureRanges[t.step_id];
        t.figure = { position: f.position, record: relative(dir, f.path), record_sha: f.sha,
          lines: [fr[0] + bodyOffset, fr[1] + bodyOffset] };
      }
    }
    const fm = [...head, ...trace.map((t) => `  - ${JSON.stringify(t)}`), "---"].join("\n");
    const text = mutate(fm + "\n\n" + body.join("\n") + "\n");
    const out = join(dir, "draft.md");
    writeFileSync(out, text);
    return { path: out, ranges, bodyOffset, figureRanges, figureFiles };
  }

  // THE FIXTURE PACKETS ARE RENDERED IN THE TEMPLATE'S OWN SHAPE (kogaki#872),
  // not stubbed: `compare` reads the DECLARED side back out of a Packet block by
  // block, and a stub carrying two lines would make every join case assert
  // against a refusal rather than against the comparison. They are hand-written
  // rather than produced by `src/draft.mjs`, because importing the Draft lane
  // here would break the closed-input allowlist this pass also asserts.
  //
  // Packets carry text that appears NOWHERE in the prose, so the blindness case
  // below can assert on a string only the Packet has. They carry NO DIGIT
  // either — the comparison lines quote Packet material, and a digit in a ground
  // would land in one and make the no-numbers-but-line-numbers case assert
  // against the fixture's own wording rather than against the format.
  const GROUNDS = {
    a1: ["ground alpha — the harness renders the recovery input before any record is accepted.",
      "ground beta — the reviewer never reads the packet that produced the prose."],
    a2: ["ground gamma — an ordering owned by the harness cannot be got wrong by a session."],
    a3: ["ground delta — a residue line is classified by the owner and never by the tool."],
  };
  const PACKET_FIELDS = {
    a1: { after: "The reader knows which act renders the input.", purpose: "To open the claim.",
      introduces: ["harness"], knows: [], opens: true, excerpt: "PACKETONLYTOKEN a passage about tides and harbours." },
    a2: { after: "The reader knows an owned ordering cannot be got wrong.", purpose: "To carry the claim further.",
      introduces: [], knows: ["harness"], opens: false, excerpt: "PACKETONLYTOKEN a second passage about weather." },
    a3: { after: "The reader knows who classifies residue.", purpose: "To open the second question.",
      introduces: [], knows: ["harness"], opens: true, excerpt: null },
  };
  // THE FIXTURE PACKET IS THE REAL TEMPLATE WITH ITS SLOTS FILLED (PR #895
  // round 1, findings 2 and 3). It used to be written out by hand in the shape
  // the author believed the template had, and BOTH of those findings are that
  // belief being wrong: the grounds reader tested a bullet whose value lives in
  // a block below it, and the Section anchor stopped a sentence short of its
  // paragraph's end. Neither was visible to a fixture whose Packets ended
  // exactly where the reader expected them to.
  //
  // So the fixture reads `src/packet-template.md` and fills the slots itself —
  // the same slot set `src/draft.mjs renderPacket` fills, without importing it,
  // because the closed-input allowlist this pass also asserts forbids that
  // import. The fixed instruction prose around every slot is therefore the
  // TEMPLATE'S, not a copy, so a template edit reaches these cases instead of
  // sliding past them.
  // THE FIGURE BLOCK IS NOT PART OF A PACKET (kogaki#878). The template file
  // carries the Packet and, behind a marker, the figure input block that
  // `draft.mjs section` appends for a Step declaring `figure:` — so a fixture
  // reading the whole file would render a Packet these cases never receive.
  // The marker is spelled here rather than imported because this pass asserts
  // a closed input allowlist that forbids importing `src/draft.mjs`; the guard
  // below is what keeps that second spelling loud instead of silent — a
  // template whose marker moved fails HERE, naming the drift, rather than
  // reappearing three cases later as an unfilled slot.
  const TEMPLATE_MARKER = "<!-- FIGURE-INPUT -->";
  const TEMPLATE_FILE = readFileSync(join(dirname(self), "packet-template.md"), "utf8");
  if (!TEMPLATE_FILE.includes(TEMPLATE_MARKER)) {
    throw new Error(`the Packet template carries no ${TEMPLATE_MARKER} marker — this fixture splits the Packet from the figure block there, and a template that moved it would put the block into every fixture Packet`);
  }
  const TEMPLATE = TEMPLATE_FILE.slice(0, TEMPLATE_FILE.indexOf(TEMPLATE_MARKER))
    .replace(/^<!--[\s\S]*?-->\n*/, "").trimEnd() + "\n";
  function writePacket(dir, id, { grounds = GROUNDS[id] } = {}) {
    const f = PACKET_FIELDS[id];
    const bullets = (xs, empty) => (xs.length ? xs.map((x) => `- ${x}`).join("\n") : empty);
    const slots = {
      thesis: "PACKETONLYTOKEN the thesis.",
      reader_start: "PACKETONLYTOKEN where the reader starts.",
      reader_target: "PACKETONLYTOKEN where the reader lands.",
      opening_question: "PACKETONLYTOKEN the opening question.",
      move_id: "name-the-mechanism",
      move_intent: "Name the mechanism before naming its consequence.",
      move_constraints: "Name the mechanism first; never announce the consequence before the reader can check it.",
      move_failure_modes: "Announcing a conclusion the reader has no way to check yet.",
      move_excerpt: f.excerpt === null
        ? "(none — this Move record carries no excerpt, so it cannot serve as an exemplar. Perform the Move from its contract above.)"
        : f.excerpt,
      step_id: id,
      purpose: f.purpose,
      reader_state_before: "PACKETONLYTOKEN the state before.",
      reader_state_after: f.after,
      materials: "(none)",
      rationale: "PACKETONLYTOKEN why this Step sits here.",
      // THE STATED ABSENCE THE RENDERER WRITES, verbatim (src/draft.mjs's
      // `grounds || "(none recorded)"`), so the groundless case exercises the
      // string a real Packet actually carries.
      grounds: grounds.length ? grounds.join("\n") : "(none recorded)",
      section_placement: f.opens
        ? "- **This Step OPENS a Section.** Its heading is **\"A heading\"**, rendered by the Harness immediately above your prose.\n"
          + "- **Your prose is what the heading promises.** This Step is the whole Section."
        : "- **This Step CONTINUES the Section headed \"A heading\".** That heading is already on the page, above prose you are writing further into.\n"
          + "- **No new heading is rendered here.** Develop what the Section has established; a new subject belongs to a Step that opens its own.",
      reader_already_knows: bullets(f.knows,
        "(nothing — this is the first Step to introduce anything, or the path introduces no terms)"),
      introduces: bullets(f.introduces, "(nothing new)"),
      prior_sections: "PACKETONLYTOKEN the article so far.",
    };
    let out = TEMPLATE;
    for (const [k, v] of Object.entries(slots)) out = out.split(`{{${k}}}`).join(v);
    const left = out.match(/\{\{(\w+)\}\}/);
    if (left) {
      // A slot the fixture does not fill is a template block these cases would
      // review with `{{name}}` sitting where its value belongs — reported here
      // rather than discovered as a strange refusal three cases later.
      throw new Error(`the fixture does not fill the Packet template's slot {{${left[1]}}}`);
    }
    writeFileSync(join(dir, `${id}.md`), out);
  }
  const packetDir = join(root, "packets");
  mkdirSync(packetDir, { recursive: true });
  for (const id of ["a1", "a2", "a3"]) writePacket(packetDir, id);

  const thesis = join(root, "theses", "fixture");
  const draft = buildDraft(thesis, { packetDir });
  // `--workspace` is a BASE; the run lands at base/<slug>, which is what the
  // sibling's flag has always meant. `WS` is where this Draft's run record and
  // rendered inputs actually sit, and the cases read it rather than the base —
  // reading the base would pass under the pre-fix behaviour too.
  const wsBase = join(root, "ws");
  const WS = join(wsBase, "fixture");
  const drive = (cmd, ...extra) => spawnSync(process.execPath,
    [self, cmd, "--draft", draft.path, "--workspace", wsBase, ...extra], { encoding: "utf8" });

  // A REVERSE OUTLINE for one Step, in the Brief's own Step form (kogaki#1014).
  // The fixture's outlines are REAL `step` blocks from here on — a plain-text
  // stand-in is refused by the Brief parser, and the ordering cases below must
  // fail on the ORDERING rather than on the block's shape.
  //
  // THE GROUNDS PAIR WITH THE FIXTURE PACKETS' GROUNDS (kogaki#872). The Round
  // Trip assigns each read ground to the declared ground it rests on by
  // containment, so an outline whose grounds share no words with any declared
  // one would make EVERY Step fail `widened` and the join cases would assert
  // against the fixture rather than against the pairing. And no field carries a
  // digit: the comparison lines quote what was read, and the
  // no-numbers-but-line-numbers case must fail on the FORMAT rather than on
  // this outline's wording.
  //
  // NO SPANS. A Reverse Outline is a Brief Step block and a Brief field carries
  // no draft coordinate — the span was the deleted record's own invention, and
  // the cases that asserted one lie inside the passage went with it.
  const RECOVERED = {
    a1: { claims: ["the harness renders the reverse outline input before any outline is accepted",
      "the reviewer never reads the packet that produced the prose"],
      after: "The reader knows which act renders the input.", purpose: "To open the claim." },
    a2: { claims: ["an ordering owned by the harness cannot be got wrong by a session"],
      after: "The reader knows an owned ordering cannot be got wrong.", purpose: "To carry the claim further." },
    a3: { claims: ["a residue line is classified by the owner and never by the tool"],
      after: "The reader knows who classifies residue.", purpose: "To open the second question." },
  };
  // The block itself. `mutate` takes the field object so a case can widen a
  // ground, blank a field or add one the dispositions refuse.
  const outlineFor = (id) => ({
    step_id: id,
    purpose: RECOVERED[id].purpose,
    reader_state_before: "The reader arrives holding what came before.",
    reader_state_after: RECOVERED[id].after,
    grounds: RECOVERED[id].claims.slice(),
    introduces: [],
    concession: [],
    opens_section: null,
  });
  const renderOutline = (o) => {
    const L = ["```step", `step_id: ${o.step_id}`];
    if (o.purpose !== null) L.push(`purpose: ${o.purpose}`);
    if (o.reader_state_before !== null) L.push(`reader_state_before: ${o.reader_state_before}`);
    if (o.reader_state_after !== null) L.push(`reader_state_after: ${o.reader_state_after}`);
    for (const g of o.grounds) L.push(`ground ${g}`);
    for (const x of o.introduces) L.push(`introduces: ${x}`);
    for (const c of o.concession) L.push(`concession: ${c}`);
    if (o.opens_section !== null) L.push(`opens_section: ${o.opens_section}`);
    for (const [k, v] of Object.entries(o.extra || {})) L.push(`${k}: ${v}`);
    L.push("```");
    return L.join("\n") + "\n";
  };
  const writeRecord = (id, mutate = (o) => o) => {
    const f = join(root, `rec-${id}.md`);
    writeFileSync(f, renderOutline(mutate(outlineFor(id))));
    return f;
  };

  // The same outline, against ANY fixture Draft — the kogaki#872 cases build
  // their own Drafts (a Packet with a ground removed, a Draft using a term
  // before the Step that introduces it). With no spans to place, the outline no
  // longer depends on the Draft's ranges; the parameter stays so the call sites
  // and their reasons read unchanged.
  const writeRecordFor = (d, id, tag) => {
    const p = join(root, `rec-${tag}-${id}.md`);
    writeFileSync(p, renderOutline(outlineFor(id)));
    return p;
  };

  // THE LEDGER FIXTURE IS A VALID ENTRY, in the shape src/review-items.json
  // declares (kogaki#873). One entry serves every Section: the Section pairs
  // are judged, so the fixture answers them through `answerOwed` like every
  // other judged pair, and what this file has to be RIGHT about is its shape.
  // It carries NO DIGIT, for the reason the Packets carry none — quoted
  // material reaches a reason, and a reason with a digit refuses the emission.
  const ledgerFile = join(root, "ledger-entry.json");
  writeFileSync(ledgerFile, JSON.stringify({
    question: "what the passage was for",
    belief: "The reader believes the claim and knows who classifies residue.",
  }, null, 2) + "\n");
  const claimFile = join(root, "final-claim.json");
  writeFileSync(claimFile, JSON.stringify({
    claim: "The article claimed that a review is laid against the record that produced the prose.",
  }, null, 2) + "\n");

  // ANSWER EVERY PAIR THE RUN SAYS IT OWES, read from the run's OWN join record
  // rather than from a list transcribed here. That is not convenience: it is the
  // property the fixture is asserting — the Harness tells the judging model
  // exactly which pairs it is asking about, so a transcribed list would pass
  // while the Harness asked for something else.
  // `override` lets ONE pair carry a different answer from the rest (kogaki#996).
  // Since `grounds` became a judged item, a case that needs a preserved fail has
  // to SAY the judge failed it — there is no longer a Packet mutation that
  // produces one mechanically, which is the whole point of the change.
  const answerOwed = (jsonPath, tag, verdict = "holds",
    reason = "the declared line and the recovered one agree", override = null) => {
    // AN ABSENT JOIN RECORD ANSWERS NOTHING RATHER THAN THROWING. A mutation
    // that makes `compare` refuse leaves no record, and reading it directly took
    // the whole pass down with an ENOENT — which reports no case count at all,
    // the shape the member reads as "the pass did not run" rather than as "these
    // cases failed".
    // BOTH JOINS' OWED SETS, read from the record's own two branches. A helper
    // that answered only the Step half would leave every Section pair owed and
    // the join never complete — and the cases downstream would then assert
    // against an unfilled join rather than against what they name.
    const rec0 = existsSync(jsonPath) ? JSON.parse(readFileSync(jsonPath, "utf8")) : {};
    const owed = [...(rec0.owed || []), ...((rec0.sections || {}).owed || [])];
    const f = join(root, `verdicts-${tag}.json`);
    writeFileSync(f, JSON.stringify({
      verdicts: owed.map((o) => ({
        step_id: o.step_id, item: o.item,
        ...(o.pair === null ? {} : { pair: o.pair }),
        // `override` is spread BEFORE `model`, so a case can restate the verdict
        // and its reason and CANNOT name the model — which is the run's, never a
        // case's (kogaki#997). Spread after, the comment would be the only thing
        // enforcing it (PR #1003 round 1).
        verdict, reason, ...(override ? override(o) || {} : {}), model: JUDGE_MODEL,
      })),
    }, null, 2) + "\n");
    return f;
  };

  // open -> recover x3 -> read x2 -> compare -> answer -> compare. The whole
  // flow, driven through the real entry points, for a fixture Draft of this
  // shape.
  const driveToCompletedJoin = (d, wsBase, tag, override = null) => {
    const slug = basename(dirname(resolve(d.path)));
    const D = (...a) => spawnSync(process.execPath,
      [self, ...a, "--draft", d.path, "--workspace", wsBase], { encoding: "utf8" });
    D("open");
    for (const id of ["a1", "a2", "a3"]) D("recover", "--step", id, "--file", writeRecordFor(d, id, tag));
    for (const n of ["1", "2"]) D("read", "--section", n, "--file", ledgerFile);
    D("read", "--claim", "--file", claimFile);
    const first = D("compare");
    const jsonPath = join(wsBase, slug, "pass-1", "join.json");
    const second = D("compare", "--verdicts",
      answerOwed(jsonPath, tag, "holds", "the declared line and the recovered one agree", override));
    return { first, second, jsonPath, ws: join(wsBase, slug) };
  };

  // The comparison lines, as a map from `<step>/<item>` to the whole line.
  const linesOf = (stdout) => {
    const m = new Map();
    for (const l of stdout.split("\n")) {
      const f = l.match(/^(\S+)\s+(\S+)\s+(holds|fails|cannot-decide)\s+\[(\d+)-(\d+)\]\s+(.*)$/);
      if (f) m.set(`${f[1]}/${f[2]}`, l);
    }
    return m;
  };

  // The Section lines carry `section <n>` in the first column, which the Step
  // matcher above reads as two fields — so they get their own matcher rather
  // than that one being loosened, which would let a malformed Step line pass.
  const sectionLinesOf = (stdout) => {
    const m = new Map();
    for (const l of stdout.split("\n")) {
      const f = l.match(/^section (\d+)\s+(\S+)\s+(holds|fails|cannot-decide)\s+\[(\d+)-(\d+)\]\s+(.*)$/);
      if (f) m.set(`${f[1]}/${f[2]}`, { line: l, verdict: f[3], reason: f[6] });
    }
    return m;
  };

  // 1 — a file with no frontmatter carries no trace to review against.
  {
    const d = join(root, "theses", "nofm"); mkdirSync(d, { recursive: true });
    writeFileSync(join(d, "draft.md"), "## Just prose\n\nno record half.\n");
    const r = spawnSync(process.execPath, [self, "open", "--draft", join(d, "draft.md"), "--workspace", join(root, "ws-nofm")], { encoding: "utf8" });
    ok("a Draft with no frontmatter refuses, naming the record half",
      r.status === 1 && /opens with no frontmatter/.test(r.stderr));
  }

  // 2 — frontmatter present, trace empty.
  {
    const d = join(root, "theses", "notrace"); mkdirSync(d, { recursive: true });
    writeFileSync(join(d, "draft.md"), "---\nbrief: brief.md\n---\n\n## Prose\n\nbody.\n");
    const r = spawnSync(process.execPath, [self, "open", "--draft", join(d, "draft.md"), "--workspace", join(root, "ws-notrace")], { encoding: "utf8" });
    ok("a Draft carrying no trace entries refuses", r.status === 1 && /carries no trace entries/.test(r.stderr));
  }

  // 3 — the kogaki#868 precondition: a Step with no line range. The refusal
  // names the Step AND the act that repairs it, because a Draft emitted before
  // #868 landed is repaired by re-emitting rather than by editing.
  {
    const d = join(root, "theses", "norange");
    buildDraft(d, { packetDir, omitLines: "a2" });
    const r = spawnSync(process.execPath, [self, "open", "--draft", join(d, "draft.md"), "--workspace", join(root, "ws-norange")], { encoding: "utf8" });
    ok("a Step with no line range refuses BY NAME",
      r.status === 1 && /step a2 carries no line range/.test(r.stderr));
    ok("and the refusal names re-emission as the repair", /draft\.mjs emit/.test(r.stderr));
  }

  // 4 — a Step naming no Packet.
  {
    const d = join(root, "theses", "nopacket");
    buildDraft(d, { packetDir, omitPacket: "a3" });
    const r = spawnSync(process.execPath, [self, "open", "--draft", join(d, "draft.md"), "--workspace", join(root, "ws-nopacket")], { encoding: "utf8" });
    ok("a Step naming no Packet refuses BY NAME",
      r.status === 1 && /step a3 names no Packet/.test(r.stderr));
  }

  // 5 — the Packet the trace names is gone. The workspace is pruned by design
  // (the lifetimes rule), so this is an ordinary state and the refusal says how to
  // get out of it.
  {
    const pd = join(root, "packets-gone"); mkdirSync(pd, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) writeFileSync(join(pd, `${id}.md`), `packet ${id}\n`);
    const d = join(root, "theses", "gonepacket");
    buildDraft(d, { packetDir: pd });
    rmSync(join(pd, "a2.md"));
    const r = spawnSync(process.execPath, [self, "open", "--draft", join(d, "draft.md"), "--workspace", join(root, "ws-gone")], { encoding: "utf8" });
    ok("an absent Packet refuses BY NAME", r.status === 1 && /step a2: the Packet the trace names is absent/.test(r.stderr));
    ok("and names the re-render that repairs it", /draft\.mjs packet .*--step a2/.test(r.stderr));
  }

  // 6 — ACCEPTANCE 1's second half: a Packet whose sha differs from the
  // trace's. The Draft was not produced from this Packet, and every later
  // comparison would be against an input that produced nothing on the page.
  {
    const pd = join(root, "packets-drift"); mkdirSync(pd, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) writeFileSync(join(pd, `${id}.md`), `packet ${id}\n`);
    const d = join(root, "theses", "driftpacket");
    buildDraft(d, { packetDir: pd });
    writeFileSync(join(pd, "a1.md"), "packet a1 — edited after the Draft was emitted\n");
    const r = spawnSync(process.execPath, [self, "open", "--draft", join(d, "draft.md"), "--workspace", join(root, "ws-drift")], { encoding: "utf8" });
    ok("a Packet sha differing from the trace's refuses BY NAME",
      r.status === 1 && /step a1: the Packet's sha differs/.test(r.stderr));
    ok("and says what the difference MEANS, not only that it exists",
      /was not produced from this Packet/.test(r.stderr));
    ok("and renders both shas so the reader can tell which moved",
      /trace\s+[0-9a-f]{64}/.test(r.stderr) && /file\s+[0-9a-f]{64}/.test(r.stderr));
  }

  // 7 — ACCEPTANCE 1's first half: `open` succeeds on a well-formed Draft.
  const rOpen = drive("open");
  ok("open succeeds on a well-formed Draft", rOpen.status === 0);
  ok("open names the Steps it found", rOpen.stdout.includes("a1, a2, a3"));
  ok("open names the Sections it found", /sections\s+2 —/.test(rOpen.stdout));
  ok("open reports the Packets as verified against the trace", /packets\s+3 verified/.test(rOpen.stdout));
  ok("open renders the FIRST recovery input", /first recovery input: .*recovery[\/\\]a1\.md/.test(rOpen.stdout));
  ok("open writes a run record", existsSync(join(WS, "run.json")));

  // 8 — THE RECOVERY IS BLIND, and this is the case that binds it. The input
  // carries the prose and nothing from the Packet; a token only the Packet has
  // must not appear.
  {
    const input = readFileSync(join(WS, "pass-1", "recovery", "a1.md"), "utf8");
    ok("the recovery input carries the Step's prose", input.includes("The first passage opens the claim"));
    ok("the recovery input carries NOTHING from the Packet", !input.includes("PACKETONLYTOKEN"));
    ok("the recovery input names the draft line range it quoted", /draft lines \d+–\d+/.test(input));
    ok("the recovery input tells the reviewer not to reason about the input",
      /Do not reason about what the\s+author was probably told/.test(input));
    ok("and forbids verdicts and advice outright (kogaki#871)",
      /Write no verdicts and no advice/.test(input));
    // THE QUOTED PASSAGE IS EXACTLY THE FILE LINES THE TRACE NAMES, asserted
    // through the NUMBERING rather than as a substring (kogaki#871): each line
    // is rendered `<n> | <text>`, so the case reconstructs the file from the
    // input and compares. An off-by-one in either the range or the numbering
    // would review the wrong passage silently, and only comparing BOTH the
    // numbers and the text catches both.
    const fileLines = readFileSync(draft.path, "utf8").split("\n");
    const [s, e] = [draft.ranges.a1[0] + draft.bodyOffset, draft.ranges.a1[1] + draft.bodyOffset];
    const block = input.split(`## The passage — draft lines ${s}–${e}`)[1] || "";
    const numbered = block.split("\n").filter((l) => /^\s*\d+ \| /.test(l));
    const reconstructed = numbered.map((l) => l.replace(/^\s*\d+ \| /, ""));
    const numbers = numbered.map((l) => Number(l.match(/^\s*(\d+) \| /)[1]));
    ok("the quoted passage is exactly the file lines the trace names",
      reconstructed.join("\n") === fileLines.slice(s - 1, e).join("\n"));
    ok("and every line carries its own DRAFT line number, so spans and the trace share one coordinate",
      numbers.length === e - s + 1 && numbers[0] === s && numbers[numbers.length - 1] === e);
  }

  // 9 — an unknown Step names BOTH sides.
  {
    const bad = writeRecord("a1");
    const r = drive("recover", "--step", "zz", "--file", bad);
    ok("an unknown step_id refuses naming both sides",
      r.status === 1 && /unknown step `zz`/.test(r.stderr) && /a1, a2, a3/.test(r.stderr));
  }

  // 10 — THE ORDERING GUARD. A record handed back for a Step whose input was
  // never rendered was written against something else, and afterwards there is
  // no way to tell what.
  {
    const rec = writeRecord("a3");
    const r = drive("recover", "--step", "a3", "--file", rec);
    ok("a Step whose recovery input was never rendered refuses",
      r.status === 1 && /step a3 has no rendered recovery input/.test(r.stderr));
    ok("and the refusal names the Step actually owed", /The Step now owed is a1/.test(r.stderr));
  }

  // 11 — recording one recovery renders the next.
  {
    const rec = writeRecord("a1");
    const r = drive("recover", "--step", "a1", "--file", rec);
    ok("a recovery is recorded", r.status === 0 && /recorded: a1/.test(r.stdout));
    ok("and the NEXT recovery input is rendered", /next recovery input: .*a2\.md/.test(r.stdout));
    ok("the recovered record lands in the workspace", existsSync(join(WS, "pass-1", "recovered", "a1.json")));
  }

  // 12 — ACCEPTANCE 2: compare before every recovery refuses, naming what is
  // missing. Both halves are named, not only the first one found.
  {
    const r = drive("compare");
    ok("compare with recoveries outstanding refuses", r.status === 1);
    ok("and names the missing Steps", /step recoveries: a2, a3/.test(r.stderr));
    ok("and names the missing Section entries in the SAME refusal",
      /section ledger entries: 1, 2/.test(r.stderr));
    ok("and says why a partial join is worse than none",
      /report the gaps as agreement/.test(r.stderr));
  }

  // 13 — finish the recoveries. The LAST one hands over to the Section ledger
  // rather than rendering a next input, which is what makes the flow
  // self-driving all the way to `compare` instead of stopping silently.
  let lastRecover = null;
  for (const id of ["a2", "a3"]) {
    const rec = writeRecord(id);
    lastRecover = drive("recover", "--step", id, "--file", rec);
    ok(`recovery ${id} is recorded`, lastRecover.status === 0);
  }
  ok("the last recovery renders no next input",
    !/next recovery input/.test(lastRecover.stdout));
  ok("and hands over to the Section ledger, naming how many entries it owes",
    /every Step is recovered/.test(lastRecover.stdout)
    && /2 entries/.test(lastRecover.stdout));

  // 14 — compare now names ONLY the cold reader's inputs, and names the final
  // claim as its own kind rather than as a Section number (kogaki#873's
  // ACCEPTANCE 2). A reviewer sent back for "a missing entry" would have to
  // work out which; a claim reported under a Section number would send them to
  // re-read a Section they already recorded.
  {
    const r = drive("compare");
    ok("compare with only the cold reader's inputs outstanding refuses on those alone",
      r.status === 1 && /section ledger entries: 1, 2/.test(r.stderr) && !/step recover/.test(r.stderr));
    ok("and names the final claim as its own missing input, not as a Section",
      /final claim/.test(r.stderr) && !/section ledger entries: 1, 2, /.test(r.stderr));
  }

  // 15 — the Section ledger: an unknown Section refuses, a mis-shaped entry
  // refuses BY SECTION NUMBER, and a valid one records (kogaki#873).
  //
  // THE MIS-SHAPED CASES ARE THE POINT. Before kogaki#873 this entry point
  // recorded whatever file it was handed, so a Section could be "recorded" by
  // an empty file and `compare` would lay nothing against the heading and
  // report agreement — the silent pass the whole comparison exists to refuse,
  // reached through the one input nothing validated.
  {
    const bad = drive("read", "--section", "9", "--file", ledgerFile);
    ok("an unknown Section refuses naming the Sections that exist",
      bad.status === 1 && /unknown section 9/.test(bad.stderr) && /1, 2/.test(bad.stderr));

    const notJson = join(root, "led-plain.md");
    writeFileSync(notJson, "the question I answered, and what I now believe\n");
    const rPlain = drive("read", "--section", "1", "--file", notJson);
    ok("an entry that is not JSON refuses, naming the Section and the fields owed",
      rPlain.status === 1 && /Section 1 entry/.test(rPlain.stderr)
      && /`question`/.test(rPlain.stderr) && /`belief`/.test(rPlain.stderr));

    const empty = join(root, "led-empty.json");
    writeFileSync(empty, JSON.stringify({ question: "what it was for", belief: "   " }) + "\n");
    const rEmpty = drive("read", "--section", "1", "--file", empty);
    ok("an empty field refuses by name rather than recording a blank entry",
      rEmpty.status === 1 && /`belief` is empty/.test(rEmpty.stderr));

    const missing = join(root, "led-missing.json");
    writeFileSync(missing, JSON.stringify({ question: "what it was for" }) + "\n");
    const rMissing = drive("read", "--section", "1", "--file", missing);
    ok("an absent field refuses by name", rMissing.status === 1 && /`belief` is absent/.test(rMissing.stderr));

    const extra = join(root, "led-extra.json");
    writeFileSync(extra, JSON.stringify({ question: "q", belief: "b", verdict: "good" }) + "\n");
    const rExtra = drive("read", "--section", "1", "--file", extra);
    ok("a field the ledger does not declare refuses rather than being dropped",
      rExtra.status === 1 && /`verdict`/.test(rExtra.stderr));

    const r1 = drive("read", "--section", "1", "--file", ledgerFile);
    ok("a Section entry is recorded", r1.status === 0 && /recorded: section 1/.test(r1.stdout));
    ok("and the ones still owed are named", /sections still owed: 2/.test(r1.stdout));
    const r2 = drive("read", "--section", "2", "--file", ledgerFile);
    ok("the last Section entry hands over to the final claim",
      /every Section entry is recorded/.test(r2.stdout) && /--claim/.test(r2.stdout));

    // The final claim, through the same entry point and the same reader.
    const badClaim = join(root, "claim-empty.json");
    writeFileSync(badClaim, JSON.stringify({ claim: "" }) + "\n");
    const rc0 = drive("read", "--claim", "--file", badClaim);
    ok("an empty final claim refuses rather than being laid against the thesis",
      rc0.status === 1 && /carries no `claim`/.test(rc0.stderr));
    const rc1 = drive("read", "--claim", "--section", "1", "--file", claimFile);
    ok("`--claim` and `--section` together refuse: they are two records, not one",
      rc1.status === 1 && /two records at once/.test(rc1.stderr));
    const rc2 = drive("read", "--claim", "--file", claimFile);
    ok("the final claim is recorded", rc2.status === 0 && /recorded: the final claim/.test(rc2.stdout));
  }

  // 16 — `check` before `compare` refuses. Asserted on a SECOND workspace,
  // because this run has already compared by the time the later cases need it.
  {
    const ws2 = join(root, "ws2");
    const d2 = spawnSync(process.execPath, [self, "open", "--draft", draft.path, "--workspace", ws2], { encoding: "utf8" });
    ok("a second run opens independently", d2.status === 0);
    const r = spawnSync(process.execPath, [self, "check", "--draft", draft.path, "--workspace", ws2], { encoding: "utf8" });
    ok("check before compare refuses", r.status === 1 && /pass two and there is no pass one/.test(r.stderr));
    const c = spawnSync(process.execPath, [self, "close", "--draft", draft.path, "--workspace", ws2], { encoding: "utf8" });
    ok("close before compare refuses, naming both routes in",
      c.status === 1 && /reachable from `compare` with zero fails, or from `check`/.test(c.stderr));
  }

  // 17 — THE JOIN, IN ITS TWO PHASES (kogaki#872). Phase one decides the
  // mechanical items and renders one join Packet per judged pair; phase two
  // records the verdicts and emits the comparison.
  let owedFirst = null;
  {
    const r = drive("compare");
    ok("compare succeeds once every input is present", r.status === 0);
    ok("and reports the counts it joined over", /3 recovered Step\(s\), 2 Section entries/.test(r.stdout));
    ok("a join record lands in the workspace", existsSync(join(WS, "pass-1", "join.json")));

    const rec = JSON.parse(readFileSync(join(WS, "pass-1", "join.json"), "utf8"));
    owedFirst = rec.owed;
    ok("the unfilled join says so rather than rendering an empty findings list",
      rec.complete === false && /await a verdict/.test(r.stdout));
    // NO COMPARISON LINE IS EMITTED WHILE A PAIR IS UNANSWERED. There is no
    // fourth token for "not asked yet", and rendering `cannot-decide` for one
    // would round an absence into an answer.
    ok("and emits NO comparison line while any pair is unanswered", linesOf(r.stdout).size === 0);
    ok("it names every pair it owes, with the join Packet rendered for each",
      rec.owed.length > 0 && rec.owed.every((o) => existsSync(o.packet))
      && rec.owed.every((o) => r.stdout.includes(o.key)));
    ok("and the run record refuses to call an unfilled join compared",
      JSON.parse(readFileSync(join(WS, "run.json"), "utf8")).compared_at === null);

    // A join Packet is ONE pair and ONE question, and it names the three tokens
    // it will accept. The judging model cannot rank, because it is never shown
    // two pairs at once.
    const jp = rec.owed.length ? readFileSync(rec.owed[0].packet, "utf8") : "";
    ok("a join Packet carries the declared side, the recovered side and the quoted prose",
      /### What the Packet DECLARED/.test(jp) && /### What was RECOVERED from the prose/.test(jp)
      && /### The prose itself — draft lines/.test(jp));
    ok("and exactly one question", (jp.match(/^## The question$/gm) || []).length === 1);
    ok("and the closed three-token answer set", /holds.*fails.*cannot-decide/.test(jp));
    ok("and the template's authoring comment is stripped from it", !jp.startsWith("<!--"));
  }

  // 17a — `close` refuses over an UNFILLED join, and refuses DIFFERENTLY from
  // one where compare never ran: the two have different repairs.
  {
    const c = drive("close");
    ok("close over an unfilled join refuses, naming the pairs it still waits on",
      c.status === 1 && /the join has run and is UNFILLED/.test(c.stderr));
    ok("and says what a record written over them would read as",
      /reads as a clean review/.test(c.stderr));
  }

  // 17b — the verdicts file is validated against WHAT THE RUN OWES, and each
  // refusal is its own mistake.
  {
    const bad = (name, verdicts, expect) => {
      const f = join(root, "bad-verdicts.json");
      writeFileSync(f, JSON.stringify({ verdicts }) + "\n");
      const r = drive("compare", "--verdicts", f);
      const hit = typeof expect === "string" ? r.stderr.includes(expect) : expect.test(r.stderr);
      ok(name, r.status === 1 && hit);
    };
    bad("a verdict for a MECHANICAL item is refused, saying it would replace a computed fact",
      [{ step_id: "a1", item: "term-before-introduction", verdict: "holds", reason: "it reads fine" }],
      "which is a MECHANICAL item");
    bad("a verdict for a pair this run never asked about is refused, naming the pairs it owes",
      [{ step_id: "a1", item: "purpose", pair: 4, verdict: "holds", reason: "it reads fine" }],
      "which this run did not ask about");
    bad("a fourth verdict token is refused, naming the closed three",
      [{ step_id: "a1", item: "purpose", verdict: "mostly-holds", reason: "it reads fine" }],
      "there is no fourth answer");
    bad("a verdict with no reason is refused",
      [{ step_id: "a1", item: "purpose", verdict: "holds" }],
      "carries no `reason`");
    // A DIGIT IN THE REASON IS WHERE A SCORE COMES BACK IN. The item table holds
    // no severity and the verdict set has no order; once one number is written
    // into a review a later reader compares them.
    bad("a reason carrying a digit is refused, because that is where a score comes back in",
      [{ step_id: "a1", item: "purpose", verdict: "holds", reason: "3 of the grounds are carried" }],
      "every other number in a review is a score by another name");
    bad("a verdicts file that is not one object carrying `verdicts` is refused",
      undefined, "carries no `verdicts` array");
    // kogaki#997 — A VERDICT THAT DOES NOT SAY WHAT PRODUCED IT IS REFUSED.
    // The 2026-09-07 run made a hundred and more model calls and its record
    // says what ran none of them, so a reader cannot check that the per-role
    // pins held. The refusal is what makes the omission unreachable rather
    // than merely discouraged.
    bad("a verdict carrying no `model` is refused, naming it as the id of what produced it",
      [{ step_id: "a1", item: "purpose", verdict: "holds", reason: "it reads fine" }],
      "carries no `model`");
    bad("and an empty `model` is refused by the same clause, not accepted as a value",
      [{ step_id: "a1", item: "purpose", verdict: "holds", reason: "it reads fine", model: "   " }],
      "carries no `model`");
    // ONE ID, NOT A SENTENCE ABOUT ONE. `--model` takes a single token, and a
    // value with a space in it is a description of the spawn rather than the
    // thing the spawn was pinned to.
    bad("a `model` carrying whitespace is refused — it is the one id `--model` took",
      [{ step_id: "a1", item: "purpose", verdict: "holds", reason: "it reads fine",
        model: "haiku but the strong one for corrections" }],
      "carries whitespace");
    // EVERY problem in one refusal, never the first found.
    {
      const f = join(root, "bad-verdicts-many.json");
      writeFileSync(f, JSON.stringify({ verdicts: [
        { step_id: "a1", item: "purpose", verdict: "nope", reason: "one" },
        { step_id: "a2", item: "purpose", verdict: "holds", reason: "there are 2 of them" },
      ] }) + "\n");
      const r = drive("compare", "--verdicts", f);
      ok("every verdict problem is named in one refusal, never the first found",
        r.status === 1 && /no fourth answer/.test(r.stderr) && /score by another name/.test(r.stderr));
    }
    ok("and a refused verdicts file leaves the join unfilled",
      JSON.parse(readFileSync(join(WS, "pass-1", "join.json"), "utf8")).complete === false);
  }

  // 17c — ACCEPTANCE 1: the completed join emits ONE LINE PER (Step, item),
  // each carrying a verdict from the closed three and a quoted span, and NO
  // NUMBER THAT IS NOT A LINE NUMBER.
  let baseLines = null;
  // The completed join's own output and record, captured HERE and read by the
  // kogaki#873 cases at the end: later cases correct this Draft, and a Section
  // assertion re-reading the workspace then would be reading pass two's state
  // under pass one's name.
  let baseStdout = null;
  let baseRecord = null;
  {
    const r = drive("compare", "--verdicts", answerOwed(join(WS, "pass-1", "join.json"), "main"));
    baseStdout = r.stdout;
    baseRecord = existsSync(join(WS, "pass-1", "join.json"))
      ? JSON.parse(readFileSync(join(WS, "pass-1", "join.json"), "utf8")) : {};
    ok("recording the verdicts completes the join", r.status === 0 && /recorded: \d+ verdict/.test(r.stdout));
    const rec = JSON.parse(readFileSync(join(WS, "pass-1", "join.json"), "utf8"));
    ok("and the join record says so", rec.complete === true);

    // kogaki#997 — WHAT JUDGED EACH PAIR IS RECOVERABLE FROM THE RECORD.
    // Asserted over EVERY model-decided row and EVERY call in both branches of
    // the log rather than over a sample: the defect the Issue reports is that a
    // hundred and more calls carried step, item, pair and packet and nothing
    // else, and a case that checked one row would pass on a record that lost
    // the rest.
    {
      const stepCalls = rec.model_calls || [];
      const secCalls = (rec.sections || {}).model_calls || [];
      ok("#997: every model call in the Step log names the model that answered it",
        stepCalls.length > 0 && stepCalls.every((c) => c.model === JUDGE_MODEL),
        `${stepCalls.filter((c) => c.model !== JUDGE_MODEL).length} without it, of ${stepCalls.length}`);
      ok("#997: and every model call in the Section log names it too",
        secCalls.length > 0 && secCalls.every((c) => c.model === JUDGE_MODEL),
        `${secCalls.filter((c) => c.model !== JUDGE_MODEL).length} without it, of ${secCalls.length}`);
      // PER PAIR, not only per item: an item whose pairs were answered by
      // different models is what a slipped pin looks like, and the per-pair
      // record is the only place that is visible.
      const pairs = (rec.results || []).flatMap((r) => r.pairs || [])
        .filter((sub) => sub.decided_by === "model");
      ok("#997: every model-decided PAIR carries the model beside its verdict",
        pairs.length > 0 && pairs.every((sub) => sub.model === JUDGE_MODEL));
      ok("#997: and every model-decided Section row does",
        ((rec.sections || {}).results || []).filter((x) => x.decided_by === "model").length > 0
        && ((rec.sections || {}).results || []).filter((x) => x.decided_by === "model")
          .every((x) => x.model === JUDGE_MODEL));
      // THE ABSENCE IS THE RECORD ON A HARNESS ROW. A mechanical item was
      // decided from string facts and no model was asked, so writing one there
      // would be a claim about a call that never happened — and a reader could
      // no longer tell a judged row from a decided one by its own fields.
      const harnessRows = (rec.results || []).filter((x) => x.decided_by === "harness");
      ok("#997: a harness-decided row carries NO model key — no call was made to name",
        harnessRows.length > 0 && harnessRows.every((x) => !("model" in x)));
      // AND THE RUN SAYS IT OUT LOUD, as a DECLARATION rather than as an
      // observation: the Harness invoked no judge, which is the same reading
      // terrain's judge pin was corrected to at kogaki#892.
      ok("#997: the emission names the declared judge and says nothing verified it",
        new RegExp(`judged by DECLARED model\\(s\\) — ${JUDGE_MODEL}; `
          + "the Harness invoked no model and verified none\\.").test(r.stdout),
        r.stdout.split("\n").filter((l) => /DECLARED/.test(l)).join(" | ") || "(no such line)");
    }

    const ITEMS = JSON.parse(readFileSync(join(dirname(self), "review-items.json"), "utf8"));
    baseLines = linesOf(r.stdout);
    // THE ROWS THAT APPLY TO THIS DRAFT, computed from the table rather than
    // counted here (kogaki#880). This fixture's Steps carry no figure, so the
    // figure rows are not evaluated on them — and the count is derived from
    // `figure_only` so a table gaining a sixth figure row moves this number
    // without anyone editing it, while a table gaining an ordinary row still
    // fails here if the runtime does not compute it.
    const PROSE_ITEMS = ITEMS.items.filter((i) => !i.figure_only);
    ok("one comparison line per (Step, item), over the whole item table",
      baseLines.size === 3 * PROSE_ITEMS.length);
    ok("every Step and every item the table declares has a line",
      ["a1", "a2", "a3"].every((s) => PROSE_ITEMS.every((i) => baseLines.has(`${s}/${i.id}`))));
    // kogaki#880 AC3: A DRAFT WITH NO FIGURES RUNS WITH NO FIGURE ITEMS IN ITS
    // LOG. Asserted as absence over the whole emission rather than over a list
    // written here: a vacuous `holds` would satisfy the two cases above and is
    // exactly what this refuses.
    ok("AC3: a figureless Draft's comparison carries no figure item at all",
      ITEMS.items.filter((i) => i.figure_only).length > 0
      && !ITEMS.items.filter((i) => i.figure_only)
        .some((i) => [...baseLines.keys()].some((k) => k.endsWith(`/${i.id}`))));
    ok("AC3: and none is logged as decided mechanically or as a model call either",
      !ITEMS.items.filter((i) => i.figure_only).some((i) =>
        (rec.mechanical || []).some((c) => c.item === i.id)
        || (rec.model_calls || []).some((c) => c.item === i.id)));

    // THE NO-NUMBERS PROPERTY, asserted over what the HARNESS composes: the
    // step id and the span are the line's only numeric fields, and stripping
    // them must leave no digit. Quoted Draft and Packet material is rendered as
    // it stands — the fixture carries no digit in either, so a digit surviving
    // the strip is the FORMAT having invented a number rather than the corpus
    // having contained one.
    const stripped = [...baseLines.values()].map((l) => l.replace(/^\S+\s+/, "").replace(/\[\d+-\d+\]/, ""));
    ok("no number appears in a comparison line that is not a line number",
      stripped.every((l) => !/\d/.test(l)));
    ok("every verdict is one of the closed three",
      [...baseLines.values()].every((l) => /\s(holds|fails|cannot-decide)\s/.test(l)));
    // The span is a DRAFT line range, so it must lie inside the file.
    const total = readFileSync(draft.path, "utf8").split("\n").length;
    ok("and every span is a draft line range inside the file",
      [...baseLines.values()].every((l) => {
        const m = l.match(/\[(\d+)-(\d+)\]/);
        return Number(m[1]) >= 1 && Number(m[2]) <= total && Number(m[1]) <= Number(m[2]);
      }));

    ok("the run reports which pairs cost a model call and which did not",
      /decided mechanically and \d+ judged/.test(r.stdout));
    ok("and says whether any Step is sent to correction — a PRESERVED item failing",
      /no Step is sent to correction/.test(r.stdout));
  }

  // 18 — kogaki#874: `correct` REFUSES A STEP PASS ONE DID NOT SEND IT, and the
  // refusal carries the owed set. This run's join is clean, so nothing is owed
  // — which is the case that binds the CLASS rule at this act: a best-effort
  // fail rides along and never sends a Step here, and a Harness that accepted
  // any Step would let a reviewer re-realize prose no finding asked about.
  //
  // THIS BLOCK RUNS NO `check`, deliberately. Pass two would set `checked_at`
  // on this run and case 19 asserts the record says ONE pass — the clean base
  // run is what that assertion is about, and the two-pass drive has its own
  // Draft below rather than borrowing this one.
  {
    const r = drive("correct", "--step", "a1");
    ok("correct refuses a Step carrying no failing preserved item",
      r.status === 1 && /carries no failing PRESERVED item/.test(r.stderr));
    ok("and names the owed set rather than leaving the reviewer to look",
      /owed: \(none/.test(r.stderr));
    ok("and says a best-effort fail never sends a Step here",
      /rides along/.test(r.stderr));
    const u = drive("correct", "--step", "zz");
    ok("correct refuses an unknown Step naming this Draft's Steps",
      u.status === 1 && /unknown step `zz`/.test(u.stderr) && /a1, a2, a3/.test(u.stderr));
  }

  // 19 — ACCEPTANCE 3: close writes the owner record with its three lists.
  {
    const r = drive("close");
    ok("close succeeds from compare with zero fails", r.status === 0);
    const out = join(thesis, "review.md");
    ok("close writes review.md beside the Draft", existsSync(out));
    const text = readOrEmpty(out);
    ok("the record is headed by the Draft's body sha", text.includes(sha256(readDraft(draft.path).body)));
    ok("the record names every Packet it was reviewed against with its sha",
      ["a1", "a2", "a3"].every((id) => text.includes(`\`${id}\``))
      && (text.match(/sha `[0-9a-f]{64}`/g) || []).length === 3);
    ok("the record carries the Findings list", /^## Findings$/m.test(text));
    ok("the record carries the Corrections list", /^## Corrections$/m.test(text));
    ok("the record carries the Residue list", /^## Residue$/m.test(text));
    ok("a COMPLETED join with no failing item renders its findings list as none",
      /^## Findings\n\n_None\._$/m.test(text));
    ok("the record states how many passes ran", /\*\*Passes\.\*\* one \(compare\)/.test(text));
    ok("the record tells the owner what to fill classified: with",
      /`packet` or `reviewdraft`/.test(text));
  }

  // 20 — ACCEPTANCE 3's binding half: EVERY residue line carries an empty
  // `classified:` field, and the tool never fills it. Driven by writing residue
  // into the run record, because the correction path that produces residue is
  // kogaki#874 and this artifact still owes the rendering.
  {
    const run = JSON.parse(readFileSync(join(WS, "run.json"), "utf8"));
    run.residue = [
      { step_id: "a1", item: "reader_state_after", why: "the recovered state still differs after pass two" },
      { step_id: "a3", item: "restates", why: "the passage restates the Packet's wording" },
    ];
    writeFileSync(join(WS, "run.json"), JSON.stringify(run, null, 2) + "\n");
    const r = drive("close");
    ok("close renders residue", r.status === 0);
    const text = readOrEmpty(join(thesis, "review.md"));
    const residue = text.slice(text.indexOf("## Residue"));
    const items = (residue.match(/^- \*\*/gm) || []).length;
    const fields = (residue.match(/^ {2}classified:$/gm) || []).length;
    ok("every residue line carries a classified: field", items === 2 && fields === 2);
    ok("and the tool leaves every one of them EMPTY",
      !/^ {2}classified:[^\n]*\S/m.test(residue));
  }

  // 21 — the record is ONE per Draft, overwritten on re-run. A second file
  // would leave two records disagreeing about the same Draft.
  {
    const before = readdirSync(thesis).filter((f) => f.startsWith("review")).length;
    drive("close");
    const after = readdirSync(thesis).filter((f) => f.startsWith("review")).length;
    ok("close overwrites its record rather than minting a second", before === 1 && after === 1);
  }

  // 22 — a Draft edited under a live run is a different document, and the run
  // record says so rather than judging prose nobody rendered an input for.
  {
    const original = readFileSync(draft.path, "utf8");
    writeFileSync(draft.path, original + "\nA paragraph added after the run opened.\n");
    const r = drive("compare");
    ok("a Draft edited since `open` refuses", r.status === 1 && /has changed since this run was opened/.test(r.stderr));
    ok("and names re-opening as the repair", /Re-open the run/.test(r.stderr));
    writeFileSync(draft.path, original);
  }

  // 23 — THE CLOSED INPUT SET, asserted structurally rather than promised. The
  // owner's ruling is that a need for a Brief, a Move or a Strand is a PACKET
  // GAP; the mechanical half is that no such read exists in this file.
  // AN ALLOWLIST, NOT A DENYLIST (PR #882 round 1, finding 5). The first form
  // named the modules it refused, so a future `./strand.mjs` would have passed
  // it while breaking the ruling it exists to mechanize — the enumerated
  // prohibition whose load-bearing half is its non-member fallback, and whose
  // fallback there was ADMIT. Enumerating what the Harness MAY import inverts
  // that: an import nobody anticipated is refused by default, which is what
  // makes the registry's claim ("a property rather than a promise") hold
  // against edits nobody anticipated either.
  {
    const src = readFileSync(self, "utf8");
    const code = src.slice(0, src.indexOf("async function runSelfTest"));
    // `node:child_process` joins the set at kogaki#874, and the property is
    // UNCHANGED rather than widened: the clause this case mechanizes is "only
    // node builtins and ./runs.mjs", and a builtin is what it is. It is here
    // for one act — `correct` re-enters the realization lane as a subprocess,
    // because a corrected Step must be realized by the renderer that wrote the
    // Packets rather than by a second one written here. The ruling it protects
    // is about what the REVIEWER reads, and the two store literals asserted
    // below are what would catch a Move or Strand read composed at runtime.
    const ALLOWED = new Set(["node:fs", "node:path", "node:url", "node:crypto",
      "node:child_process", "./runs.mjs"]);
    // BOTH IMPORT FORMS (kogaki#883, finding 1). The first scan matched static
    // `from "…"` only, so a production-side `await import("./strand.mjs")` —
    // the exact form this very function uses for its own builtins — was
    // invisible to it. One scanner, used on the Harness and on the fixture
    // below, so the fixture exercises the scan the case runs rather than a
    // copy of it.
    // THREE FORMS AND ONE QUOTE CLASS (PR #943 round 1). `from '…'` and a bare
    // side-effect `import "…"` were each matched by neither half — the same
    // admit-by-default fallback this case exists to invert, one form over.
    const importsOf = (text) => [
      ...[...text.matchAll(/\bfrom\s*["']([^"']+)["']/g)].map((m) => m[1]),
      ...[...text.matchAll(/^\s*import\s+["']([^"']+)["']/gm)].map((m) => m[1]),
      ...[...text.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]),
    ];
    const imports = importsOf(code);
    const foreign = imports.filter((m) => !ALLOWED.has(m));
    ok("the Harness imports ONLY node builtins and ./runs.mjs — an allowlist, so an unanticipated reader is refused by default",
      imports.length > 0 && foreign.length === 0, foreign.join(", "));
    // The scan's own reach, asserted on a fixture rather than trusted: a
    // dynamic import of a disallowed module must be CAUGHT, and a dynamic
    // import of an allowed one must not be.
    const dyn = 'import { x } from "node:fs";\nconst s = await import("./strand.mjs");\nconst o = await import("node:os");';
    const dynForeign = importsOf(dyn).filter((m) => !ALLOWED.has(m));
    ok("and the scan sees a dynamic import — a fixture importing ./strand.mjs at runtime is refused by name",
      dynForeign.length === 2 && dynForeign.includes("./strand.mjs") && dynForeign.includes("node:os"),
      dynForeign.join(", "));
    ok("while a dynamic import of an allowed module passes the same scan",
      importsOf('const { x } = await import("node:child_process");').filter((m) => !ALLOWED.has(m)).length === 0);
    // And the two forms round 1 named: a single-quoted static import and a
    // bare side-effect import, each refused by name through the same scanner.
    const quoted = importsOf("import { y } from './strand.mjs';\nimport './moves.mjs';\nimport 'node:fs';")
      .filter((m) => !ALLOWED.has(m));
    ok("and a single-quoted `from '…'` and a bare side-effect `import '…'` are both seen",
      quoted.length === 2 && quoted.includes("./strand.mjs") && quoted.includes("./moves.mjs"),
      quoted.join(", "));
    // The two store literals stay asserted beside it: a Move or Strand reached
    // by a path composed at runtime imports nothing, so the allowlist alone
    // cannot see it. Neither case subsumes the other.
    //
    // AND THE CLAUSE IS NARROW ON PURPOSE. `brief.md` is deliberately NOT in
    // this list, though the ruling covers Briefs too: the refusals at
    // `resolveInputs` name `draft.mjs emit --brief <brief.md>` as the act that
    // repairs a stale trace, and a literal test cannot tell that MENTION from a
    // READ. Widening it would have failed on a correct refusal message, which
    // is the guard-that-fires-on-correct-behaviour shape. The Brief is covered
    // by the allowlist above, where the distinction is decidable.
    ok("and reads no moves/ or gloss/ store literal",
      !/moves\//.test(code) && !/ELEMENTS\.jsonl/.test(code));
  }

  // 23a — FINDING 2: `body_sha` is the SAME number on both sides. `emit` writes
  // `fm + "\n\n" + body + "\n"` and records `sha256(body)`; the fixture Draft is
  // built in exactly that shape, so the two can be compared directly. The
  // pre-fix reader hashed `body + "\n"` and no case could witness it, because
  // every assertion went through this module's own reader.
  {
    const raw = readFileSync(draft.path, "utf8");
    const fmEnd = raw.indexOf("\n---\n", 3) + "\n---\n".length;
    const emitted = raw.slice(fmEnd + 1);            // past the blank line
    const emitBody = emitted.replace(/\n$/, "");      // what `emit` hashed
    ok("readDraft's body is exactly the string `emit` hashes",
      readDraft(draft.path).body === emitBody);
    const text = readOrEmpty(join(thesis, "review.md"));
    ok("and the body sha in the owner record matches it",
      text.includes(sha256(emitBody)));
  }

  // 23b — FINDING 3: `--workspace` is a BASE and the slug is joined onto it, so
  // two Drafts driven under one base do not share a run record. Before the fix
  // the second `open` silently overwrote the first's rendered inputs.
  {
    const other = join(root, "theses", "second");
    const d2 = buildDraft(other, { packetDir });
    const base = join(root, "shared-base");
    const o1 = spawnSync(process.execPath, [self, "open", "--draft", draft.path, "--workspace", base], { encoding: "utf8" });
    const o2 = spawnSync(process.execPath, [self, "open", "--draft", d2.path, "--workspace", base], { encoding: "utf8" });
    ok("two Drafts open under one --workspace base", o1.status === 0 && o2.status === 0);
    ok("and each gets its own run record under its own slug",
      existsSync(join(base, "fixture", "run.json")) && existsSync(join(base, "second", "run.json")));
    const r1 = JSON.parse(readFileSync(join(base, "fixture", "run.json"), "utf8"));
    ok("so the first run's record still names the first Draft",
      r1.draft === resolve(draft.path) && r1.slug === "fixture");
  }

  // 23c — FINDING 6: the owner record ends with a newline, like every other
  // write here. It is repo-visible and committed, so without one it lands as a
  // no-final-newline file in every diff that touches it.
  {
    const text = readOrEmpty(join(thesis, "review.md"));
    ok("the owner record ends with a newline", text.endsWith("\n"));
  }

  // ---- kogaki#871 -------------------------------------------------------
  // AC1 — the recovery input for a CONTINUING Step carries the article before
  // it and none of its own Packet. The fixture's Packets hold PACKETONLYTOKEN,
  // and case 8 already asserts its absence for a1; a2 is the case that matters
  // for the article-so-far block, because a1's block is the empty one.
  {
    const input = readFileSync(join(WS, "pass-1", "recovery", "a2.md"), "utf8");
    ok("a continuing Step's recovery input carries the PRECEDING Step's prose",
      input.includes(PROSE.a1[0]));
    ok("and its own prose", input.includes(PROSE.a2[0]));
    ok("and none of the strings that appear only in its Packet",
      !input.includes("PACKETONLYTOKEN"));
    ok("and it groups the article before it under the Section heading the TRACE declares",
      input.includes(`## ${SECTIONS[0].title}`));
    // The heading comes from the trace, never from a scan of the body — so a
    // Section whose heading text the body does not carry still renders.
    ok("the article-so-far block ends where the passage begins",
      input.indexOf(PROSE.a1[0]) < input.indexOf("## The passage"));
    // a1 opens the article, so its own block says so rather than rendering empty.
    const first = readFileSync(join(WS, "pass-1", "recovery", "a1.md"), "utf8");
    ok("the article's FIRST passage says nothing precedes it rather than rendering an empty block",
      /nothing yet — this is the article's first passage/.test(first));
    // a3 opens the SECOND Section, so its block carries both headings.
    const third = readFileSync(join(WS, "pass-1", "recovery", "a3.md"), "utf8");
    ok("a Step opening a later Section carries every earlier Section's heading",
      third.includes(`## ${SECTIONS[0].title}`) && !third.includes(`## ${SECTIONS[1].title}`));
  }

  // THE REVERSE OUTLINE IS VALIDATED BY THE BRIEF PARSER, and every refusal
  // NAMES what it saw (kogaki#1014). An outline is the one artifact in this flow
  // a person writes by hand, so a bare "invalid" costs another read to act on.
  //
  // THERE IS NO TEMPLATE FILE ANY MORE, so the absent-template case above is
  // gone with it: the input is rendered from the field declaration, and a
  // declaration that lost a field is caught by the count case below rather than
  // by a file's absence.
  {
    const ws3 = join(root, "ws3");
    const D = (...a) => spawnSync(process.execPath,
      [self, ...a, "--draft", draft.path, "--workspace", ws3], { encoding: "utf8" });
    ok("a third run opens", D("open").status === 0);

    // `expect` is a substring or a regex. The refusals quote field names in
    // backticks, which read far more clearly as substrings than as patterns
    // escaped through two layers.
    const bad = (name, mutate, expect) => {
      const f = writeRecord("a1", mutate);
      const r = D("recover", "--step", "a1", "--file", f);
      const hit = typeof expect === "string" ? r.stderr.includes(expect) : expect.test(r.stderr);
      ok(name, r.status === 1 && hit);
    };

    // ITERATED FROM THE DECLARATION, never transcribed — the same discipline PR
    // #884 round 1 finding 3 imposed on the deleted schema. A field added to
    // RECONSTRUCTIBLE_FIELDS gains its refusal case here without an edit.
    for (const f of RECONSTRUCTIBLE_FIELDS.filter((x) => x.kind === "line")) {
      bad(`an outline missing \`${f.name}\` is refused BY NAME`,
        (o) => { o[f.name] = null; return o; },
        `carries no \`${f.name}:\` line`);
      bad(`a blank \`${f.name}\` is refused, and is a different refusal from an absent one`,
        (o) => { o[f.name] = ""; return o; },
        `\`${f.name}:\` is blank`);
    }

    // AN ABSENT OPTIONAL FIELD IS AN ANSWER. `introduces`, `opens_section` and
    // `concession` are each legitimately absent — a passage that introduces
    // nothing, continues a section, or concedes nothing carries no line — and
    // this is the case that makes the refusals above mean something.
    {
      const f = writeRecord("a1");
      const r = D("recover", "--step", "a1", "--file", f);
      ok("while an outline with no introduces, opens_section or concession is accepted", r.status === 0);
    }

    // `grounds` IS THE ONE RECONSTRUCTIBLE FIELD WITH A FLOOR, because a
    // passage that asserts nothing is not a passage.
    bad("an outline carrying no ground line is refused, with its own reason",
      (o) => { o.grounds = []; return o; },
      /carries no `ground ` line/);

    // THE NOT-RECONSTRUCTIBLE FIELDS ARE REFUSED, NOT DROPPED. A field the
    // reader could not have read off the passage is an inference, and dropping
    // it silently would leave the inference having shaped the rest of the
    // outline with no trace. Iterated from the declaration for the same reason.
    for (const f of NOT_RECONSTRUCTIBLE_FIELDS) {
      bad(`an outline carrying \`${f.name}\` is refused — it is declared not reconstructible`,
        (o) => { o.extra = { ...(o.extra || {}), [f.name]: "something" }; return o; },
        `carries \`${f.name}:\`, which is declared NOT reconstructible`);
    }

    // THE LINE SET IS CLOSED. A name nobody declared carries a judgment the
    // Harness never reads, and admit-by-default is how that arrives with no
    // trace — the same reason the deleted record's key set was closed
    // (kogaki#885). `impression` is the specimen precisely because nobody would
    // have thought to forbid it.
    bad("an undeclared line is refused — the set is closed, not forbidden-list-only",
      (o) => { o.extra = { impression: "the passage reads well" }; return o; },
      "carries `impression:`, which is not a Brief Step field");
    bad("and a verdict is refused by the same rule",
      (o) => { o.extra = { verdict: "holds" }; return o; },
      "carries `verdict:`, which is not a Brief Step field");
    bad("and so is advice",
      (o) => { o.extra = { advice: "tighten the second paragraph" }; return o; },
      "carries `advice:`, which is not a Brief Step field");

    // THE OUTLINE IS FILED AGAINST THE PASSAGE IT READ. A block whose step_id
    // names another Step is a reading of something else.
    bad("an outline whose step_id names a different Step is refused, naming both",
      (o) => { o.step_id = "a2"; return o; },
      "is `a2` and this pass is reading a1");

    // The refusal collects EVERY problem rather than the first, so a reader
    // repairing an outline does not discover them one run at a time.
    {
      const f = writeRecord("a1", (o) => { o.purpose = null; o.reader_state_after = null; o.extra = { score: "3" }; return o; });
      const r = D("recover", "--step", "a1", "--file", f);
      ok("every problem is named in one refusal, never the first one found",
        r.status === 1 && /carries no `purpose:` line/.test(r.stderr)
        && /carries no `reader_state_after:` line/.test(r.stderr)
        && /carries `score:`, which is not a Brief Step field/.test(r.stderr));
    }

    // NOT A STEP BLOCK AT ALL, and TWO of them, are separate refusals because
    // they are separate mistakes. Both come from the Brief's own fence grammar.
    {
      const f = join(root, "notblock.md"); writeFileSync(f, "recovered a1, in prose\n");
      const r = D("recover", "--step", "a1", "--file", f);
      ok("an outline that is not a fenced step block is refused, saying what one is",
        r.status === 1 && /carries no fenced `step` block/.test(r.stderr));
      const g = join(root, "twoblocks.md");
      writeFileSync(g, readFileSync(writeRecord("a1"), "utf8") + "\n" + readFileSync(writeRecord("a2"), "utf8"));
      const r2 = D("recover", "--step", "a1", "--file", g);
      ok("two step blocks are refused — an outline is the reading of ONE passage",
        r2.status === 1 && /carries more than one fenced `step` block/.test(r2.stderr));
    }

    // A BLOCK THE BRIEF ITSELF COULD NOT CARRY IS REFUSED BY THE BRIEF'S OWN
    // REFUSAL, which is the acceptance rather than a way of meeting it: the
    // grammar below is `introducesRefusal`'s, reached through `parseStepBlock`.
    bad("a malformed introduces entry is refused by the Brief parser's own grammar",
      (o) => { o.introduces = ["opacity"]; return o; },
      /introduces/);

    // THE VALIDATION HAPPENS BEFORE THE OUTLINE IS WRITTEN. One validated
    // afterwards would leave `compare` to discover the defect, by which point
    // the reader who could fix it has finished reading.
    {
      // A FRESH workspace: `ws3` already holds a successful a1 recovery from the
      // accepted case above, and asserting absence there would pass or fail on
      // that history rather than on this refusal.
      const ws4 = join(root, "ws4");
      spawnSync(process.execPath, [self, "open", "--draft", draft.path, "--workspace", ws4], { encoding: "utf8" });
      const f = writeRecord("a1", (o) => { o.purpose = null; return o; });
      const r = spawnSync(process.execPath,
        [self, "recover", "--step", "a1", "--file", f, "--draft", draft.path, "--workspace", ws4], { encoding: "utf8" });
      ok("a refused outline is not written to the workspace",
        r.status === 1 && !existsSync(join(ws4, "fixture", "pass-1", "recovered", "a1.json"))
        && !existsSync(join(ws4, "fixture", "pass-1", "recovered", "a1.md")));
    }

    // BOTH HALVES ARE KEPT, and this is what makes the run's own record able to
    // show what the Blind Reader said rather than only what the Harness read
    // out of it.
    {
      const f = writeRecord("a2");
      const r = D("recover", "--step", "a2", "--file", f);
      ok("an accepted outline lands as BOTH the block it was written as and the reading",
        r.status === 0
        && existsSync(join(ws3, "fixture", "pass-1", "recovered", "a2.md"))
        && existsSync(join(ws3, "fixture", "pass-1", "recovered", "a2.json")));
      const rec = JSON.parse(readFileSync(join(ws3, "fixture", "pass-1", "recovered", "a2.json"), "utf8"));
      ok("and the reading carries the BRIEF's field names, with no translation left",
        Object.prototype.hasOwnProperty.call(rec, "grounds")
        && Object.prototype.hasOwnProperty.call(rec, "introduces")
        && !Object.prototype.hasOwnProperty.call(rec, "claims")
        && !Object.prototype.hasOwnProperty.call(rec, "terms_introduced")
        && !Object.prototype.hasOwnProperty.call(rec, "shape"));
    }
  }


  // ---- kogaki#872 -------------------------------------------------------
  // ACCEPTANCE 2: removing ONE ground from a Packet copy yields exactly one new
  // `widened` fail on that Step, and no change elsewhere.
  //
  // DRIVEN AS TWO WHOLE RUNS OVER TWO WHOLE DRAFTS, because the Packet's sha is
  // in the trace: editing a Packet under a live Draft is refused by `open`, by
  // design, so "a Packet copy" is a second Draft emitted against it. The two
  // Drafts differ in exactly one ground, and every line range is identical
  // because `buildDraft` computes them from the same body.
  {
    const full = join(root, "packets-full"); mkdirSync(full, { recursive: true });
    const short = join(root, "packets-short"); mkdirSync(short, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) {
      writePacket(full, id);
      // a1 keeps only its FIRST ground; the second recovered claim now rests on
      // nothing the Packet declares.
      writePacket(short, id, id === "a1" ? { grounds: [GROUNDS.a1[0]] } : {});
    }
    const dFull = buildDraft(join(root, "theses", "full"), { packetDir: full });
    const dShort = buildDraft(join(root, "theses", "short"), { packetDir: short });
    const rFull = driveToCompletedJoin(dFull, join(root, "ws-full"), "full");
    // THE ORPHANED CLAIM IS FAILED BY THE JUDGE, NOT BY THE MATCHER (kogaki#996).
    // Before the ruling of 2026-09-07 this case needed no override: removing the
    // ground made claim 1 pair with nothing and the Harness failed it as
    // `widened`. `grounds` is now judged against the whole remaining ground list,
    // so the fail is a READING, and a case that wants one has to say the judge
    // gave it. What the case still measures is unchanged — that ONE pair failing
    // moves exactly one line and sends exactly that Step to correction.
    const rShort = driveToCompletedJoin(dShort, join(root, "ws-short"), "short",
      (o) => (o.step_id === "a1" && o.item === "grounds" && o.pair === 1
        ? { verdict: "fails", reason: "the claim rests on no ground this Packet declares" }
        : null));
    ok("both runs reach a completed join", rFull.second.status === 0 && rShort.second.status === 0);

    const L1 = linesOf(rFull.second.stdout);
    const L2 = linesOf(rShort.second.stdout);
    const failing = (m) => [...m.entries()].filter(([, l]) => /\sfails\s/.test(l)).map(([k]) => k);
    ok("the unmutated run has no failing item", failing(L1).length === 0);
    ok("one failed pair yields EXACTLY ONE failing item", failing(L2).length === 1);
    ok("and it is on the Step whose Packet lost the ground, on the grounds item",
      failing(L2)[0] === "a1/grounds");
    ok("and the line carries the judge's own reason rather than a pairing fact",
      /rests on no ground this Packet declares/.test(L2.get("a1/grounds")));
    // NO CHANGE ELSEWHERE, asserted as line-for-line identity over every OTHER
    // pair rather than as a count: a count would pass while two items swapped
    // verdicts.
    const changed = [...L1.keys()].filter((k) => k !== "a1/grounds" && L1.get(k) !== L2.get(k));
    ok("and nothing else changes — every other (Step, item) line is identical",
      L1.size === L2.size && changed.length === 0, changed.join(", "));
    // THE ORPHANED PAIR IS ASKED ABOUT RATHER THAN DECIDED. This is the inverse
    // of what this case asserted before kogaki#996, and it is the behaviour the
    // ruling bought: the claim the matcher could not place is the one most in
    // need of a reading, and it used to be the one that never got one.
    const recShort = JSON.parse(readFileSync(rShort.jsonPath, "utf8"));
    ok("the claim that pairs with nothing is asked about, not decided by the Harness",
      recShort.model_calls.some((c) => c.step_id === "a1" && c.item === "grounds" && c.pair === 1)
      && !recShort.mechanical.some((c) => c.item === "grounds"));
    // The other half of the same pairing: the ground the claim used to rest on
    // is gone, so `grounds-unused` still holds — the two items read ONE
    // assignment and cannot disagree about the same Step.
    ok("and the unused-grounds item, which reads the same pairing, still holds",
      /\sholds\s/.test(L2.get("a1/grounds-unused")));
    // kogaki#997, PR #1001 round 1 — THE ROW-LEVEL `model` KEY, AND THE VEHICLE
    // THIS CASE LOST TO kogaki#996.
    //
    // #997's defect was the HYBRID ROW: `grounds` used to carry a Harness-decided
    // `widened` fail beside pairs a model answered, `fails` won the selection,
    // and the row read `decided_by: "model"` while the line it rendered came
    // from the Harness — a row claiming a judge and naming none. The fix keys
    // the key's PRESENCE on the row and its VALUE on the chosen pair, and that
    // fix is untouched here (the selection at `rowDecidedBy`).
    //
    // WHAT CHANGED IS THAT THE SHIPPED TABLE CAN NO LONGER BUILD ONE. `grounds`
    // was the only `paired` item and it now takes `unpaired: "judge"`, so every
    // one of its pairs is answered by a model and no row mixes the two. The
    // `"fail"` branch that produces a hybrid is still in the Harness and still
    // reachable by any item that declares it — but no item does, and the item
    // table is FIXED in the Harness by design (`readItems`), so this case has no
    // fixture that can reach it. It is recorded here rather than deleted: the
    // guarantee is live code with no current specimen, not a retired rule.
    //
    // WHAT IS ASSERTED INSTEAD IS VEHICLE-INDEPENDENT and stronger for it —
    // stated over EVERY row the run produced rather than over one built row.
    {
      const row = (recShort.results || [])
        .find((r) => r.step_id === "a1" && r.item === "grounds");
      ok("#997: the judged row is decided_by model — some pair was judged",
        row && row.decided_by === "model" && row.verdict === "fails");
      ok("#997: and it CARRIES the model key, because presence answers `was a model asked here`",
        row && "model" in row);
      // AND THE TRUTH PER PAIR IS STILL THERE, which is what makes a null at the
      // row safe to render rather than a loss.
      ok("#997: while the judged pairs inside it still name what answered them",
        row && (row.pairs || []).some((sub) => sub.decided_by === "model" && sub.model === JUDGE_MODEL));
      // THE INVARIANT THE HYBRID CASE WAS PROTECTING, over every row in the run:
      // presence tracks `was a model asked`, and nothing names a model it did
      // not consult. A hybrid row would satisfy both of these too — which is
      // why these hold whether or not the table can build one.
      const allRows = recShort.results || [];
      ok("#997: every model-decided row carries the model key, across the whole run",
        allRows.filter((r) => r.decided_by === "model").every((r) => "model" in r),
        `${allRows.filter((r) => r.decided_by === "model" && !("model" in r)).length} without it`);
      ok("#997: and no Harness-decided row names a model it never consulted",
        allRows.filter((r) => r.decided_by === "harness").every((r) => !("model" in r)));
      ok("#997: while every pair naming a model was answered by one",
        allRows.flatMap((r) => r.pairs || [])
          .every((sub) => (sub.model == null) || sub.decided_by === "model"));
    }
    // A PRESERVED item failing is what sends a Step to correction, and the run
    // says which — the class is the consequence, never a severity.
    ok("a preserved item failing sends its Step to correction, and the run names it",
      /Steps sent to correction[^\n]*a1/.test(rShort.second.stdout));
  }

  // THE HYGIENE AND MOVE ROWS ARE GONE, AND THIS IS THE RECORDED DECLINE
  // (kogaki#1013 item 3, owner 2026-09-09). What stood here was ACCEPTANCE 3's
  // `term-before-introduction` case — a term used one Step before the Step
  // whose Packet says to introduce it, caught mechanically with the earlier
  // occurrence as its span. Prose hygiene is not part of Reverse Outlining: a
  // reader cannot infer the source a structure was produced from, and being
  // able to would be abnormal. So the row left the table and its implementation
  // left `MECHANICAL` — and this case asserts the removal rather than being
  // deleted with them, because a behaviour leaves under a recorded decline and
  // never silently. Whether any of the five survives as a realization-time lint
  // in `draft` is a separate question for the owner, not this rebuild.
  //
  // WHAT SURVIVES HERE IS THE BINDING BETWEEN THE TABLE AND THE CODE, which is
  // the half that would let a row come back with no implementation behind it.
  {
    const ITEMS = JSON.parse(readFileSync(join(dirname(self), "review-items.json"), "utf8"));
    const ids = ITEMS.items.map((i) => i.id);
    for (const gone of ["term-before-introduction", "restates-earlier-step", "packet-wording",
      "exemplar-leak", "move-contract"]) {
      ok(`the Round Trip table carries no \`${gone}\` row`, !ids.includes(gone));
    }
    ok("and no row keeps a translation column — every row names a Brief Step field",
      ITEMS.items.every((i) => !Object.prototype.hasOwnProperty.call(i, "recovered_field")));

    const r = driveToCompletedJoin(draft, join(root, "ws-mech"), "mech");
    ok("a run still reaches a completed join with those rows gone", r.second.status === 0);
    const rec = JSON.parse(readFileSync(r.jsonPath, "utf8"));
    const mech = ITEMS.items.filter((i) => i.mode === "mechanical").map((i) => i.id);
    ok("every item the table calls mechanical costs no model call on any Step",
      mech.length > 0 && !rec.model_calls.some((c) => mech.includes(c.item)));
    ok("and every judged item DOES cost one",
      ITEMS.items.filter((i) => i.mode === "judged" && !i.figure_only)
        .every((i) => rec.model_calls.some((c) => c.item === i.id)));
  }

  // ROUND 1, FINDING 2: a Step whose Brief declares NO grounds is an ordinary
  // Step, not a Packet gap. The renderer writes `(none recorded)` into the
  // grounds BLOCK, below a bullet whose own text is fixed instruction prose, so
  // a reader testing the bullet could never match and refused the whole run.
  {
    const pd = join(root, "packets-groundless"); mkdirSync(pd, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) writePacket(pd, id, id === "a2" ? { grounds: [] } : {});
    ok("the fixture's groundless Packet carries the stated absence the renderer writes",
      /\(none recorded\)/.test(readFileSync(join(pd, "a2.md"), "utf8")));
    const d = buildDraft(join(root, "theses", "groundless"), { packetDir: pd });
    const r = driveToCompletedJoin(d, join(root, "ws-groundless"), "groundless");
    ok("a Step declaring no grounds does not refuse the run as a Packet gap",
      r.second.status === 0 && !/carries no `grounds` block/.test(r.first.stderr + r.second.stderr));
    const L = linesOf(r.second.stdout);
    ok("and the unused-grounds item says so in its own words",
      /this Step declares no grounds/.test(L.get("a2/grounds-unused")));
    // AND `grounds` ITSELF IS DECIDED BY THE TABLE, NOT ASKED OVER AN EMPTY
    // LIST (PR #1003 successor). Under `unpaired: "judge"` a groundless Step
    // put one Packet per claim to a judge whose declared side read `(none)`
    // against a question quantifying over it — a coin flip on a preserved
    // item. The item declares its answer for a stated absence, as
    // `exemplar-leak` does, so no Packet is rendered and no model is asked.
    {
      const grec = JSON.parse(readOrEmpty(r.jsonPath) || "{}");
      const row = (grec.results || []).find((x) => x.step_id === "a2" && x.item === "grounds");
      ok("a Step declaring no grounds has `grounds` decided by the item's declared-absence arm",
        !!row && row.decided_by === "harness" && row.verdict === "holds"
        && /declares no grounds/.test(row.reason || ""), row ? JSON.stringify(row).slice(0, 200) : "no row");
      ok("and no join Packet is rendered for it",
        !(grec.model_calls || []).some((c) => c.step_id === "a2" && c.item === "grounds")
        && (grec.mechanical || []).some((m) => m.step_id === "a2" && m.item === "grounds"));
    }
    // The other Steps are untouched: the absence is this Step's, not the run's.
    ok("while a Step that does declare grounds still carries them",
      /every ground is carried by a recovered claim/.test(L.get("a1/grounds-unused")));
  }

  // ROUND 1, FINDING 3: the Section block's declared side is the RENDERED VALUE,
  // never the template's instruction prose. The anchor used to stop one sentence
  // short of its paragraph, so the sentence after it was prepended to what the
  // judging model reads — the exact failure the reader's own comment names,
  // reached by an incomplete anchor rather than by a rewrap.
  {
    const rec = JSON.parse(readFileSync(join(WS, "pass-1", "join.json"), "utf8"));
    const call = rec.model_calls.find((c) => c.item === "section-continues");
    const jp = call && existsSync(call.packet) ? readFileSync(call.packet, "utf8") : "";
    const declared = (jp.split("### What the Packet DECLARED")[1] || "").split("###")[0];
    ok("the Section block's declared side carries the rendered placement",
      /This Step (OPENS|CONTINUES)/.test(declared));
    // ASSERTED AGAINST THE TEMPLATE'S OWN SENTENCES rather than a transcribed
    // pair, so a paragraph the template gains is covered by the derivation.
    const para = TEMPLATE.split("## The Section this Step sits in")[1].split("{{section_placement}}")[0];
    const sentences = para.split(/(?<=\.)\s+/).map((s) => s.replace(/\s+/g, " ").trim()).filter((s) => s.length > 30);
    ok("and none of the template's instruction sentences survives into it",
      sentences.length > 0 && !sentences.some((s) => declared.replace(/\s+/g, " ").includes(s)),
      sentences.find((s) => declared.replace(/\s+/g, " ").includes(s)) || "");
  }

  // ROUND 1, FINDING 5: a recorded verdict can be REVISED. `owed` shrinks as
  // answers land, so validating against it alone refused a re-submitted file and
  // told a reviewer correcting a wrong answer that the run never asked — which
  // is false, and named no repair.
  {
    const f = join(root, "revise.json");
    writeFileSync(f, JSON.stringify({ verdicts: [{ step_id: "a1", item: "purpose",
      verdict: "fails", reason: "the passage is doing a different job from the declared one",
      model: JUDGE_MODEL }] }) + "\n");
    const r = drive("compare", "--verdicts", f);
    ok("an answered pair can be answered again", r.status === 0 && /recorded: 1 verdict/.test(r.stdout));
    ok("and the revision is what the comparison line now renders",
      /\sfails\s/.test(linesOf(r.stdout).get("a1/purpose")));
    // Put it back, so the cases after this one see the run they expect.
    const g = join(root, "revise-back.json");
    writeFileSync(g, JSON.stringify({ verdicts: [{ step_id: "a1", item: "purpose",
      verdict: "holds", reason: "the declared line and the recovered one agree",
      model: JUDGE_MODEL }] }) + "\n");
    const back = drive("compare", "--verdicts", g);
    ok("and a revision is not one-way", /\sholds\s/.test(linesOf(back.stdout).get("a1/purpose")));
    // A pair the run never asked about is STILL refused, and the refusal now
    // names the answered set as revisable rather than claiming nothing is.
    const bad = join(root, "revise-bad.json");
    writeFileSync(bad, JSON.stringify({ verdicts: [{ step_id: "a1", item: "purpose", pair: 7,
      verdict: "holds", reason: "it reads fine" }] }) + "\n");
    const b = drive("compare", "--verdicts", bad);
    ok("while a pair nobody asked about is still refused, naming the revisable set",
      b.status === 1 && /already answered, which a revision may overwrite/.test(b.stderr));
  }

  // A TERM THE FRONTMATTER HAPPENS TO CARRY IS NOT MET BY THE READER THERE. The
  // record half holds the trace, the Brief pin and every cite, so a Step
  // introducing a word the trace contains would otherwise fail on a line no
  // reader ever sees, with the finding pointing at JSON as the place the reader
  // first met the term.
  {
    const pd = join(root, "packets-fm"); mkdirSync(pd, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) {
      writePacket(pd, id);
      if (id === "a3") {
        const p = join(pd, "a3.md");
        writeFileSync(p, readFileSync(p, "utf8").replace("- **introduce here.** (nothing new)",
          "- **introduce here.** - packet"));
      }
    }
    const d = buildDraft(join(root, "theses", "fm"), { packetDir: pd });
    const fmText = readFileSync(d.path, "utf8").split("\n").slice(0, 8).join("\n");
    ok("the fixture's own frontmatter carries the term, so the case can witness the defect",
      /packet/.test(fmText));
    const r = driveToCompletedJoin(d, join(root, "ws-fm"), "fm");
    ok("the run completes", r.second.status === 0);
    ok("and a term occurring only in the frontmatter does not fail the Step that introduces it",
      /\sholds\s/.test(linesOf(r.second.stdout).get("a3/term-before-introduction")));
  }

  // kogaki#995 — A CONCESSION REACHES THE JUDGING MODEL AS ITS OWN WORDS. The
  // `concessions` item's recovered side is a list of OBJECTS, and the renderer
  // interpolated each one directly, so the join input read `- [object Object]`.
  // Every `concessions` judgment in the 2026-09-07 ReviewDraft run came back
  // `cannot-decide` on that input, which is the right answer to an unreadable
  // pair and the wrong thing for the record to carry as a judgment.
  // ASSERTED ON THE JOIN PACKET THE RUN WROTE, never on the renderer: what the
  // defect was about is what reached the reader, and a unit assertion on
  // `renderSide` would pass while the Packet still carried the placeholder.
  {
    const pd = join(root, "packets-entries"); mkdirSync(pd, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) writePacket(pd, id);
    const d = buildDraft(join(root, "theses", "entries"), { packetDir: pd });
    const wsBase = join(root, "ws-entries");
    const D = (...a) => spawnSync(process.execPath,
      [self, ...a, "--draft", d.path, "--workspace", wsBase], { encoding: "utf8" });
    D("open");
    const CONCEDED = "the passage carries the ground more weakly than the packet declares it";
    const RESTATED = "the claim the opening Step already settled";
    let lo3 = 0, hi3 = 0;
    for (const id of ["a1", "a2", "a3"]) {
      const rg = d.ranges[id];
      const [lo, hi] = [rg[0] + d.bodyOffset, rg[1] + d.bodyOffset];
      if (id === "a3") { lo3 = lo; hi3 = hi; }
      const fx = RECOVERED[id];
      const p2 = join(root, `rec-entries-${id}.json`);
      writeFileSync(p2, JSON.stringify({
        claims: fx.claims.map((claim) => ({ claim, span: [lo, hi] })),
        reader_state_after: fx.after,
        purpose: fx.purpose,
        terms_introduced: [],
        shape: "It states a thing and moves on.",
        // ONE STEP CARRIES ENTRIES AND THE OTHERS DO NOT, so the case witnesses
        // the rendering rather than a constant: an empty list still renders
        // `(none)` beside it.
        concessions: id === "a3" ? [{ text: CONCEDED, span: [lo, hi] }] : [],
        restates: id === "a3" ? [{ of: RESTATED, span: [lo, hi] }] : [],
      }, null, 2) + "\n");
      D("recover", "--step", id, "--file", p2);
    }
    for (const n of ["1", "2"]) D("read", "--section", n, "--file", ledgerFile);
    D("read", "--claim", "--file", claimFile);
    const cmp = D("compare");
    ok("#995: the run reaches a join over a record carrying a concession", cmp.status === 0);
    const conceded = readOrEmpty(join(wsBase, "entries", "pass-1", "join", "a3.concessions.md"));
    ok("#995: the concessions Packet carries the concession's own words",
      conceded.includes(CONCEDED), conceded.slice(0, 400));
    ok("#995: and never the stringified object the entry used to render as",
      conceded !== "" && !conceded.includes("[object Object]"));
    ok("#995: the entry carries the draft lines it was recovered from",
      conceded.includes(`${CONCEDED} (lines ${lo3}\u2013${hi3})`));
    // The Step that conceded nothing still renders the stated absence, so the
    // case above is bound to the entry and not to the field being present.
    const nothingConceded = readOrEmpty(join(wsBase, "entries", "pass-1", "join", "a1.concessions.md"));
    ok("#995: while a Step conceding nothing renders the absence",
      /\(none\)/.test(nothingConceded) && !nothingConceded.includes("[object Object]"));
  }

  // A TERM CARRYING A DIGIT STILL YIELDS A DIGIT-FREE COMPARISON LINE. This is
  // the case the first live drive earned: the live Draft's grounds are labelled
  // by the Strands they came from, so quoting the offending material into the
  // reason put a number in front of a reader that was not a line number. The
  // line refuses to carry a quote; the evidence holds it in full.
  //
  // THE VEHICLE CHANGED AND THE RULE DID NOT (kogaki#1014). This case used to
  // ride `term-before-introduction`, whose row left the table with the rest of
  // the hygiene items; the rule it binds — a comparison line quotes nothing,
  // and the evidence holds the quoted material whole — is unchanged, so the
  // case is retargeted rather than deleted. `grounds-unused` is the surviving
  // mechanical row that carries evidence, and the fixture's ground names a
  // Strand, which is exactly the shape that put a non-line-number digit in
  // front of a reader on the first live drive.
  {
    const pd = join(root, "packets-digit"); mkdirSync(pd, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) {
      // a2 declares a second ground no read ground rests on, and it carries a
      // digit in its own text.
      writePacket(pd, id, id === "a2"
        ? { grounds: [GROUNDS.a2[0], "the pinned survey at strand L97 settles the boundary"] }
        : {});
    }
    const d = buildDraft(join(root, "theses", "digit"), { packetDir: pd });
    const r = driveToCompletedJoin(d, join(root, "ws-digit"), "digit");
    ok("a run whose Packet declares a ground carrying a digit still completes", r.second.status === 0);
    const line = linesOf(r.second.stdout).get("a2/grounds-unused");
    ok("it fails on the Step whose ground nothing rests on", /\sfails\s/.test(line));
    ok("and the comparison line carries no digit outside its span",
      !/\d/.test(line.replace(/^\S+\s+/, "").replace(/\[\d+-\d+\]/, "")));
    ok("while the evidence carries the ground whole, digit included",
      JSON.parse(readFileSync(r.jsonPath, "utf8")).results
        .find((x) => x.step_id === "a2" && x.item === "grounds-unused")
        .evidence.some((e) => /strand L97/.test(e)));
  }

  // `cannot-decide` IS A THIRD ANSWER AND IS NEVER ROUNDED. It is listed with
  // its pair, and it is not a fail — it sends no Step to correction.
  {
    const pd = join(root, "packets-undecided"); mkdirSync(pd, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) writePacket(pd, id);
    const d = buildDraft(join(root, "theses", "undecided"), { packetDir: pd });
    const wsb = join(root, "ws-undecided");
    const D = (...a) => spawnSync(process.execPath,
      [self, ...a, "--draft", d.path, "--workspace", wsb], { encoding: "utf8" });
    D("open");
    for (const id of ["a1", "a2", "a3"]) D("recover", "--step", id, "--file", writeRecordFor(d, id, "und"));
    for (const n of ["1", "2"]) D("read", "--section", n, "--file", ledgerFile);
    D("read", "--claim", "--file", claimFile);
    D("compare");
    const jp = join(wsb, "undecided", "pass-1", "join.json");
    const f = answerOwed(jp, "und", "cannot-decide", "the passage does not say either way");
    const r = D("compare", "--verdicts", f);
    ok("a run answered entirely `cannot-decide` completes", r.status === 0);
    const L = linesOf(r.second === undefined ? r.stdout : r.stdout);
    ok("every judged pair renders `cannot-decide` rather than being rounded",
      [...L.values()].some((l) => /\scannot-decide\s/.test(l)));
    ok("and it is listed with its pair", /cannot-decide, listed with its pair and never rounded/.test(r.stdout));
    ok("and it sends no Step to correction — it is not a fail",
      /no Step is sent to correction/.test(r.stdout));
    // A cannot-decide is still a FINDING: it is what the owner record must
    // carry so a person can look at what the reader could not settle.
    const c = D("close");
    ok("close is reachable with cannot-decide and zero fails", c.status === 0);
    const rev = readOrEmpty(join(root, "theses", "undecided", "review.md"));
    ok("and the owner record lists every undecided pair with its class",
      /cannot-decide \((preserved|best-effort)\)/.test(rev));
  }

  // A BEST-EFFORT FAIL RIDES ALONG: it reaches the owner record with its class
  // and its EVIDENCE, and it does NOT withhold `close`. A guard counting every
  // fail would send a Step to pass two for a finding the design says to carry
  // rather than to act on — and on the first live drive a best-effort item fired
  // on every Step, so `close` would have been unreachable for that Draft.
  {
    const pd = join(root, "packets-riding"); mkdirSync(pd, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) writePacket(pd, id);
    // a2 repeats a run of a1's words verbatim — `restates-earlier-step`, which
    // the table calls best-effort and mechanical.
    const ridingProse = {
      a1: PROSE.a1,
      a2: ["The first passage opens the claim and says what the reader is about to be shown again."],
      a3: PROSE.a3,
    };
    const d = buildDraft(join(root, "theses", "riding"), { packetDir: pd, prose: ridingProse });
    const wsb = join(root, "ws-riding");
    const r = driveToCompletedJoin(d, wsb, "riding");
    ok("the run completes", r.second.status === 0);
    const L = linesOf(r.second.stdout);
    ok("the best-effort item fails", /\sfails\s/.test(L.get("a2/restates-earlier-step")));
    ok("and no Step is sent to correction, because no PRESERVED item failed",
      /no Step is sent to correction/.test(r.second.stdout));
    const D = (...a) => spawnSync(process.execPath,
      [self, ...a, "--draft", d.path, "--workspace", wsb], { encoding: "utf8" });
    const c = D("close");
    ok("close is reachable with a best-effort fail outstanding", c.status === 0);
    const rev = readOrEmpty(join(root, "theses", "riding", "review.md"));
    ok("and the owner record carries the finding with its class",
      /a2 \/ restates-earlier-step\*\* — fails \(best-effort\)/.test(rev));
    // THE EVIDENCE IS WHERE THE QUOTED MATERIAL LIVES, and this is the other
    // half of the comparison line's no-numbers rule: the line refuses to carry a
    // quote, so the record is where a finding becomes actionable rather than
    // merely located.
    ok("and the quoted material the comparison line refused to carry",
      /^ {2}- evidence: \S/m.test(rev));

    // A PRESERVED fail still withholds it, and the refusal says which kind.
    const short = join(root, "packets-riding-short"); mkdirSync(short, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) writePacket(short, id, id === "a1" ? { grounds: [GROUNDS.a1[0]] } : {});
    const d2 = buildDraft(join(root, "theses", "riding-short"), { packetDir: short });
    const wsb2 = join(root, "ws-riding-short");
    // The PRESERVED fail is the judge's, for the reason kogaki#996 gives at the
    // sibling case above: removing the ground no longer fails the item by itself.
    driveToCompletedJoin(d2, wsb2, "ridingshort",
      (o) => (o.step_id === "a1" && o.item === "grounds" && o.pair === 1
        ? { verdict: "fails", reason: "the claim rests on no ground this Packet declares" }
        : null));
    const c2 = spawnSync(process.execPath,
      [self, "close", "--draft", d2.path, "--workspace", wsb2], { encoding: "utf8" });
    ok("while a PRESERVED fail still withholds the record, naming the class",
      c2.status === 1 && /failing PRESERVED item/.test(c2.stderr)
      && /A best-effort fail does not withhold the record/.test(c2.stderr));
  }

  // A PACKET MISSING A BLOCK THE COMPARISON NEEDS IS A PACKET GAP, refused BY
  // NAME and filed against the template — never satisfied by reading the Brief,
  // the Move or the Strand.
  {
    const pd = join(root, "packets-gapped"); mkdirSync(pd, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) writePacket(pd, id);
    const p = join(pd, "a2.md");
    writeFileSync(p, readFileSync(p, "utf8")
      .split("\n").filter((l) => !/^- \*\*purpose\.\*\*/.test(l)).join("\n"));
    const d = buildDraft(join(root, "theses", "gapped"), { packetDir: pd });
    const wsb = join(root, "ws-gapped");
    const D = (...a) => spawnSync(process.execPath,
      [self, ...a, "--draft", d.path, "--workspace", wsb], { encoding: "utf8" });
    D("open");
    for (const id of ["a1", "a2", "a3"]) D("recover", "--step", id, "--file", writeRecordFor(d, id, "gap"));
    for (const n of ["1", "2"]) D("read", "--section", n, "--file", ledgerFile);
    D("read", "--claim", "--file", claimFile);
    const r = D("compare");
    ok("a Packet missing a block the comparison needs refuses BY NAME, naming the Step",
      r.status === 1 && /step a2: its Packet carries no `purpose` block/.test(r.stderr));
    ok("and names the item that compares against it", /purpose/.test(r.stderr));
    ok("and files it as a PACKET GAP against the template, not as a side read",
      /PACKET GAP/.test(r.stderr) && /src\/packet-template\.md/.test(r.stderr));
  }

  // A MOVE RECORD WITH NO EXEMPLAR MAKES THE NEGATIVE ITEM VACUOUS, and the
  // table says so per item rather than the runtime deciding it: there is no
  // exemplar, so no subject matter can leak from one.
  {
    const rec = JSON.parse(readFileSync(join(WS, "pass-1", "join.json"), "utf8"));
    const a3 = rec.results.find((x) => x.step_id === "a3" && x.item === "exemplar-leak");
    const a1 = rec.results.find((x) => x.step_id === "a1" && x.item === "exemplar-leak");
    ok("a Step whose Move carries no exemplar is decided by the Harness, with no model call",
      a3.decided_by === "harness" && /no exemplar/.test(a3.reason)
      && !rec.model_calls.some((c) => c.step_id === "a3" && c.item === "exemplar-leak"));
    ok("while a Step whose Move DOES carry one is judged",
      a1.decided_by === "model"
      && rec.model_calls.some((c) => c.step_id === "a1" && c.item === "exemplar-leak"));
  }

  // THE ITEM TABLE IS READ, NEVER RESTATED — the same arrangement the recovered
  // record's schema has. The item ids that DO occur in the runtime are the keys
  // of the mechanical implementations and of the Packet-block readers, which is
  // the binding the table's `mode` and `declared_block` fields name; every other
  // use iterates `items`.
  {
    const table = JSON.parse(readFileSync(join(dirname(self), "review-items.json"), "utf8"));
    const code = readFileSync(self, "utf8");
    const prod = code.slice(0, code.indexOf("async function runSelfTest"));
    const judged = table.items.filter((i) => i.mode !== "mechanical").map((i) => i.id);
    ok("no JUDGED item's id occurs in the runtime — the table is the only carrier",
      judged.length > 0 && !judged.some((id) => prod.includes(`"${id}"`)));
    ok("every MECHANICAL item the table declares has an implementation keyed by its id",
      table.items.filter((i) => i.mode === "mechanical").every((i) => prod.includes(`"${i.id}"`)));
    // The runtime enumerates no verdict set of its own — it VALIDATES against
    // the table's. The one token it names is in the selection rule, which needs
    // to know that a fail outranks an undecided pair when an item's line has to
    // pick one of its pairs to render; that is an ordering the table does not
    // carry and the runtime owns.
    ok("the closed verdict set is validated from the table, not from a list here",
      table.verdicts.length === 3 && prod.includes("items.verdicts.includes")
      && !/"holds"\s*,\s*"fails"/.test(prod));
    ok("and every threshold is an INPUT: no emitted line renders one",
      Object.keys(table.thresholds).filter((k) => k !== "note").length > 0
      && [...baseLines.values()].every((l) =>
        !String(table.thresholds.claim_ground_containment).includes(".") || !l.includes("0.")));
  }

  // AN ABSENT JOIN TEMPLATE IS A HOLE THE MODEL FILLS BY INVENTION, so the
  // Harness refuses rather than asking a question with no form. Driven against a
  // copy of the module with the template removed from beside it.
  {
    const solo = join(root, "solo-join"); mkdirSync(solo, { recursive: true });
    for (const f of ["review-draft.mjs", "runs.mjs", "runs.json", "recovery-template.md",
      "cold-reader-template.md", "recovered-schema.json", "review-items.json"]) {
      writeFileSync(join(solo, f), readFileSync(join(dirname(self), f)));
    }
    const d = buildDraft(join(root, "theses", "nojointpl"), { packetDir });
    const wsb = join(root, "ws-nojointpl");
    const D = (...a) => spawnSync(process.execPath,
      [join(solo, "review-draft.mjs"), ...a, "--draft", d.path, "--workspace", wsb], { encoding: "utf8" });
    D("open");
    for (const id of ["a1", "a2", "a3"]) D("recover", "--step", id, "--file", writeRecordFor(d, id, "njt"));
    for (const n of ["1", "2"]) D("read", "--section", n, "--file", ledgerFile);
    D("read", "--claim", "--file", claimFile);
    const r = D("compare");
    ok("an absent join template refuses rather than asking a question with no form",
      r.status === 1 && /join template is absent/.test(r.stderr));
  }

  // AND AN ABSENT ITEM TABLE REFUSES, for the reason the table exists: the
  // comparison would otherwise join against a table it invented.
  //
  // IT REFUSES AT `open` SINCE kogaki#873, and the case is moved rather than
  // relaxed. `open` renders the cold reader's input, whose entry shape is the
  // table's `sections.ledger_fields`, so the table is load-bearing one act
  // earlier than it was — and asserting at `compare` would now assert against
  // "no run record", which is true and is not this refusal.
  {
    const solo = join(root, "solo-items"); mkdirSync(solo, { recursive: true });
    for (const f of ["review-draft.mjs", "runs.mjs", "runs.json", "recovery-template.md",
      "cold-reader-template.md", "recovered-schema.json", "join-template.md"]) {
      writeFileSync(join(solo, f), readFileSync(join(dirname(self), f)));
    }
    const d = buildDraft(join(root, "theses", "noitems"), { packetDir });
    const wsb = join(root, "ws-noitems");
    const D = (...a) => spawnSync(process.execPath,
      [join(solo, "review-draft.mjs"), ...a, "--draft", d.path, "--workspace", wsb], { encoding: "utf8" });
    const r = D("open");
    ok("an absent item table refuses rather than joining against a table it invented",
      r.status === 1 && /item table is absent/.test(r.stderr));
  }

  // THE SCHEMA IS READ, NEVER RESTATED. The runtime must not carry its own copy
  // of the field list, or amending the record's shape becomes two edits that
  // can disagree.
  {
    const schema = JSON.parse(readFileSync(join(dirname(self), "recovered-schema.json"), "utf8"));
    const code = readFileSync(self, "utf8");
    const prod = code.slice(0, code.indexOf("async function runSelfTest"));
    ok("the schema declares the seven fields the issue names",
      schema.required.length === 7 && schema.required.includes("terms_introduced"));
    // `!some` and NOT `!every` (PR #884 round 1, finding 3): the `every` form
    // passed as soon as ONE of the seven names was absent from production code,
    // so a runtime restating six of seven read clean. `!some` is the property
    // this case's own name claims.
    ok("and the runtime does not restate the field list",
      !schema.required.some((f) => prod.includes(`"${f}"`)));
  }

  // 24 — usage with no command, and an unknown command.
  {
    const u = spawnSync(process.execPath, [self], { encoding: "utf8" });
    ok("bare invocation prints usage and exits 0", u.status === 0 && /review-draft —/.test(u.stdout));
    ok("usage names every entry point the design declares",
      ["open", "recover", "read", "compare", "correct", "check", "close"].every((c) => u.stdout.includes(`review-draft.mjs ${c}`)));
    const b = spawnSync(process.execPath, [self, "nonsense"], { encoding: "utf8" });
    ok("an unknown command exits 1 with the usage", b.status === 1);
  }

  // 25 — the omitted-value guard, inherited from draft.mjs: a bare `--draft`
  // parses as boolean true and String(true) would reach readFileSync.
  {
    const r = spawnSync(process.execPath, [self, "open", "--draft"], { encoding: "utf8" });
    ok("a bare --draft refuses with usage rather than reading a file named `true`",
      r.status === 1 && /usage: review-draft open/.test(r.stderr));
  }


  // ==========================================================================
  // kogaki#874 — THE CORRECTION PATH, DRIVEN END TO END OVER A REAL DRAFT.
  //
  // WHY THIS BLOCK BUILDS ITS OWN DRAFT THROUGH `src/draft.mjs` INSTEAD OF
  // `buildDraft` ABOVE. Every case up to here reviews a hand-assembled Draft,
  // which is right for them: they assert what THIS Harness does with a trace, a
  // Packet and a record, and hand-assembly is what lets a case construct a
  // malformed one. `correct` is different in kind — it RE-ENTERS the
  // realization lane, so the property under test is that a corrected Step is
  // realized from a Packet the renderer produced against the article as it now
  // stands. A hand-written stand-in for that Packet would be this pass checking
  // that it can read its own guess, and the "article so far" block — the whole
  // continuity mechanism the owner's 2026-09-04 concern is about — is exactly
  // the part a stand-in would have to invent.
  //
  // It stays seam-free: a Brief, a Move store and a workspace under the same
  // temp root, no network, no gateway, and no read of this repository's own
  // `theses/` or `runs/`.
  {
    const draftCli = join(dirname(self), "draft.mjs");
    const cRoot = join(root, "correction");
    const cBrief = join(cRoot, "theses", "correction-fixture");
    const cMoves = join(cRoot, "moves");
    const cWs = join(cRoot, "ws-draft");
    mkdirSync(cBrief, { recursive: true });
    mkdirSync(cMoves, { recursive: true });
    for (const id of ["open_the_claim", "carry_the_claim"]) {
      writeFileSync(join(cMoves, `${id}.md`), [
        `id: ${id}`, "status: observed",
        "intent: >-", `  what ${id} does to the reader.`,
        "requires: >-", "  the state this move depends on.",
        "effect: >-", "  the state this move produces.",
        "constraints: >-", "  what a correct performance must not do.",
        "failure_modes: >-", "  how it goes wrong when imitated badly.",
        "excerpt: >-", "  the author's account of the movement they observed.",
      ].join("\n") + "\n");
    }
    // FOUR STEPS AND TWO SECTIONS, so that correcting s2 and s3 leaves s4 as a
    // successor that is NOT itself corrected. That is what makes the successor
    // arm of the bound assertable on its own: a successor that had also been
    // corrected would be in the bound twice and the case could not tell which
    // arm put it there.
    const STEPS = [
      { id: "s1", move: "open_the_claim", opens: "The first heading" },
      { id: "s2", move: "carry_the_claim", opens: null },
      { id: "s3", move: "open_the_claim", opens: "The second heading" },
      { id: "s4", move: "carry_the_claim", opens: null },
    ];
    const briefText = [
      "# Brief — correction-fixture", "",
      "*Survey pin:* `product-lab@0000000000000000000000000000000000000000`", "",
      "## Strands", "",
      "### L1 — first-strand", "",
      "- cite: `gloss/ELEMENTS.jsonl slug=first-strand kind=lesson @0000000000000000000000000000000000000000`", "",
      "## Thesis", "", "The fixture claim.", "",
      "## Reader start", "", "The reader believes the fixture claim is obvious.", "",
      "## Reader target", "", "The reader can say why the fixture claim is not obvious.", "",
      "## Opening question", "", "What makes the fixture claim worth stating?", "",
      "## Sequence", "",
      ...STEPS.flatMap((s) => ["```step", `step_id: ${s.id}`, `move: ${s.move}`,
        ...(s.opens ? [`opens_section: ${s.opens}`] : []),
        `purpose: the job ${s.id} does.`,
        `reader_state_before: the reader arrives at ${s.id} holding what came before.`,
        `reader_state_after: the reader leaves ${s.id} able to say what it settled.`,
        "materials: L1",
        `rationale: ${s.id} sits here because the path put it here.`,
        `ground (strand L1): the material supports what ${s.id} asserts.`, "```", ""]),
    ].join("\n");
    writeFileSync(join(cBrief, "brief.md"), briefText);

    const dl = (cmd, ...extra) => spawnSync(process.execPath,
      [draftCli, cmd, "--brief", join(cBrief, "brief.md"), "--workspace", cWs, "--moves-dir", cMoves, ...extra],
      { encoding: "utf8" });

    // The realized prose. Deliberately unlike the Packet's own wording: the
    // mechanical `packet-wording` item fires on a run of the Packet's ground or
    // state lines, and prose that tripped it would make every case below assert
    // against the fixture's phrasing rather than against the correction path.
    const REAL = {
      s1: "Two harbours keep different hours and a boat leaving one arrives at the other on a tide nobody planned.",
      s2: "The harbourmaster writes the hours down each spring, and the writing is what makes them argue rather than what settles them.",
      s3: "A tide table is not a promise about water; it is a record of what somebody measured, on days somebody chose.",
      s4: "So a skipper reading it is reading a measurement, and the question worth asking is who was standing there and when.",
    };
    const proseFile = (id, text) => {
      const f = join(cRoot, `prose-${id}.md`);
      writeFileSync(f, text + "\n");
      return f;
    };

    const r0 = dl("resolve");
    let built = r0.status === 0;
    for (const s of STEPS) {
      const r = dl("section", "--step", s.id, "--file", proseFile(s.id, REAL[s.id]));
      if (r.status !== 0) built = false;
    }
    const rEmit = dl("emit");
    built = built && rEmit.status === 0;
    const cDraft = join(cBrief, "draft.md");
    ok("the realization lane produces a real Draft for the correction drive to review",
      built && existsSync(cDraft));

    // --- the review, up to a completed join with two preserved fails --------
    const cwsBase = join(cRoot, "ws-review");
    const cWsRun = join(cwsBase, "correction-fixture");
    const RD = (...a) => spawnSync(process.execPath,
      [self, ...a, "--draft", cDraft, "--workspace", cwsBase,
        "--draft-workspace", cWs, "--moves-dir", cMoves], { encoding: "utf8" });

    // A record whose spans come from the EMITTED trace, not from a fixture's own
    // arithmetic: this Draft's ranges are `emit`'s, and transcribing them would
    // be the drifting-range defect this Harness is itself about.
    const traceOf = () => JSON.parse(readFileSync(join(cWsRun, "run.json"), "utf8")).steps;
    const recFor = (id, tag) => {
      const st = traceOf().find((s) => s.step_id === id);
      const f = join(cRoot, `rec-${tag}-${id}.json`);
      writeFileSync(f, JSON.stringify({
        claims: [{ claim: `the material supports what ${id} asserts, as the passage has it`, span: st.lines }],
        reader_state_after: `the reader leaves ${id} able to say what it settled`,
        purpose: `the job ${id} does`,
        terms_introduced: [],
        shape: "It states a thing and moves on.",
        concessions: [],
        restates: [],
      }, null, 2) + "\n");
      return f;
    };
    // Answer every owed pair, failing exactly the pairs named. A `fails` on a
    // PRESERVED item is what sends a Step to correction, so this is where the
    // drive decides which Steps the correction path will be exercised on.
    const answer = (recordPath, tag, failKeys) => {
      // BOTH BRANCHES OF THE RECORD, for the reason `answerOwed` gives above:
      // answering only the Step half leaves every Section pair owed and the
      // join never completes, so every case below would assert against an
      // unfilled join rather than against the correction path it names.
      const rec0 = existsSync(recordPath) ? JSON.parse(readFileSync(recordPath, "utf8")) : {};
      const owed = [...(rec0.owed || []), ...((rec0.sections || {}).owed || [])];
      const f = join(cRoot, `verdicts-${tag}.json`);
      writeFileSync(f, JSON.stringify({
        verdicts: owed.map((o) => {
          const failing = failKeys.includes(`${o.step_id}/${o.item}`);
          return {
            step_id: o.step_id, item: o.item,
            ...(o.pair === null ? {} : { pair: o.pair }),
            verdict: failing ? "fails" : "holds",
            reason: failing
              ? "the recovered reader would not be the declared one"
              : "the declared line and the recovered one agree",
            model: JUDGE_MODEL,
          };
        }),
      }, null, 2) + "\n");
      return f;
    };

    RD("open");
    for (const s of STEPS) RD("recover", "--step", s.id, "--file", recFor(s.id, "p1"));
    for (const n of ["1", "2"]) RD("read", "--section", n, "--file", ledgerFile);
    RD("read", "--claim", "--file", claimFile);
    RD("compare");
    const joinPath = join(cWsRun, "pass-1", "join.json");
    const FAILS = ["s2/reader-state-after", "s3/reader-state-after"];
    const p1 = RD("compare", "--verdicts", answer(joinPath, "p1", FAILS));
    ok("pass one completes and sends the two preserved-failing Steps to correction",
      p1.status === 0 && /Steps sent to correction[^\n]*s2, s3/.test(p1.stdout));

    // --- FINDING 1 (PR #906 round 1): `check` with NOTHING corrected --------
    // Declining to correct is a legitimate route — `close` is reachable from
    // `check` in every state — and the defect was the CLAIM the route produced:
    // a pass-one fail reaching the owner record as "still failing after pass
    // two", on a pair pass two never re-judged, as the basis for classifying it
    // `packet` or `reviewdraft`. Driven BEFORE any correction, which is the
    // only point in this run where the state exists.
    {
      const r = RD("check");
      // THE HEADLINE'S CLAIM CHANGED AT PR #946 round 1 AND THIS CASE'S DOES
      // NOT: it asserts the Steps are NAMED, which is PR #906 round 1's finding
      // and is untouched. What moved is the sentence around them — it read "and
      // no correction was made", which the per-seat line made false for a Step
      // that received one seat and still owes the other.
      ok("check with nothing corrected NAMES the Steps pass one sent to correction",
        r.status === 0 && /UNCORRECTED — pass one sent these to correction and they are still owed: s2, s3/.test(r.stdout));
      ok("and says their fails are carried rather than re-judged",
        /not re-judged by this pass/.test(r.stdout));
      const rc = RD("close");
      const rv = readOrEmpty(join(cBrief, "review.md"));
      const res = rv.slice(rv.indexOf("## Residue"));
      ok("the owner record does not claim a carried fail survived pass two",
        rc.status === 0 && !/still failing after pass two/.test(res));
      ok("and says per line that the Step was not corrected, so nothing re-read it",
        /NOT re-judged: this Step was not corrected/.test(res));
      ok("while the residue line still carries its EMPTY classified: field",
        (res.match(/^ {2}classified:$/gm) || []).length === 2
        && !/^ {2}classified:[^\n]*\S/m.test(res));
    }

    // --- ORDER: a later Step refuses while an earlier one is owed -----------
    {
      const r = RD("correct", "--step", "s3");
      ok("correct refuses a Step out of path order, naming what is owed first",
        r.status === 1 && /not next/.test(r.stderr) && /s2/.test(r.stderr));
      ok("and says why the order matters — a Step realized against prose about to move",
        /about to move under it/.test(r.stderr));
    }

    // THE ARTICLE AS THIS RUN FOUND IT, read before any correction moves it.
    // The kogaki#994 cases below assert `close` puts it back byte for byte, and
    // a comparison against the run's own snapshot would only prove the restore
    // matched the file it copied.
    const cArticleAsReviewed = readFileSync(cDraft, "utf8");

    // --- ACCEPTANCE 1: the correction input is a FRESH Packet + a Correction
    //     block. The "article so far" holds s1 as it stands in the Draft at
    //     this moment; the Correction block holds s2's previous prose and the
    //     pair that failed.
    const rA = RD("correct", "--step", "s2");
    const inputPath = join(cWsRun, "pass-1", "corrections", "s2.md");
    ok("correct renders a correction input for the Step pass one sent it",
      rA.status === 0 && existsSync(inputPath));
    const inA = readOrEmpty(inputPath);
    ok("AC1: the input's article-so-far carries the preceding Step's prose as the Draft has it",
      inA.includes("## The article so far") && inA.includes(REAL.s1));
    ok("AC1: and one Correction block carrying the Step's PREVIOUS realization verbatim",
      inA.includes("## The Correction") && inA.includes(`> ${REAL.s2}`));
    ok("AC1: and the failed item with its pair and quoted span",
      /### What failed/.test(inA) && inA.includes("reader-state-after")
      && /span: lines \d+–\d+/.test(inA));
    ok("AC1: and the items that HELD, as what the correction must not break",
      /### What held, and must go on holding/.test(inA));
    ok("AC1: and the instruction to change what the findings name and nothing else",
      /Change what the findings above name and nothing else/.test(inA)
      && /Do not restate the/.test(inA) && /Packet's wording/.test(inA));
    // The blindness of the RECOVERY is not the blindness of the CORRECTION: a
    // corrected Step is realized from its Packet by design, which is the whole
    // of what "a freshly rendered Packet" means. Asserted so the two are not
    // read as one property — this input SHOULD carry Packet material.
    ok("the correction input carries the Packet's own blocks, which the recovery input never does",
      /## What this Step must do/.test(inA) || /## Write/.test(inA));

    // --- record s2's correction ---------------------------------------------
    // THE FIRST CORRECTION IS TWO LINES WHERE THE PREVIOUS REALIZATION WAS ONE
    // (PR #906 round 1, finding 2). The Draft's line count has to MOVE for a
    // stale carried span to be observable at all; a same-length correction
    // leaves every later Step at the numbers it already had, and the case would
    // pass against a defect that was simply not expressed.
    const CORRECTED = {
      s2: "The harbourmaster writes the hours down each spring, and a skipper who trusts the writing has trusted a person.\n\nThat is a different kind of trust from the one a table seems to offer, and the difference is the whole point.",
      s3: "A tide table records what somebody measured, on days somebody chose, and it promises nothing about the water tomorrow.",
    };
    const rB = RD("correct", "--step", "s2", "--file", proseFile("s2-corrected", CORRECTED.s2));
    ok("correct records the corrected Step through the realization lane", rB.status === 0);
    ok("and reports drift as a change share and a Packet overlap",
      /sentence\(s\) differ from the previous realization/.test(rB.stdout)
      && /repeat a run of the Packet's ground or state wording/.test(rB.stdout));
    ok("and says the drift is reported rather than gated",
      /reported, never gated/.test(rB.stdout));
    ok("the corrected prose is in the Draft and the previous realization is not",
      readOrEmpty(cDraft).includes(CORRECTED.s2) && !readOrEmpty(cDraft).includes(REAL.s2));
    ok("snapshots before and after the correction land in the review workspace",
      existsSync(join(cWsRun, "snapshots", "01-before-s2.md"))
      && existsSync(join(cWsRun, "snapshots", "01-after-s2.md")));
    ok("and the before-snapshot holds the prose the correction replaced",
      readOrEmpty(join(cWsRun, "snapshots", "01-before-s2.md")).includes(REAL.s2));

    // --- the rendered-input guard, the same one `recover` has. Placed HERE, after s2 is
    // recorded, because the ORDER refusal above runs first and would answer for
    // s3 while s2 was still owed — a case asserting the input guard against a
    // refusal about ordering would pass on the wrong refusal.
    {
      const stray = join(cRoot, "stray.md");
      writeFileSync(stray, "prose written against nothing\n");
      const r = RD("correct", "--step", "s3", "--file", stray);
      ok("correct refuses prose for a Step whose correction input it did not render",
        r.status === 1 && /no rendered correction input/.test(r.stderr));
    }

    // --- ACCEPTANCE 2: correcting s2 then s3 in one pass — s3's Packet
    //     carries the CORRECTED s2.
    const rC = RD("correct", "--step", "s3");
    const inputS3 = readOrEmpty(join(cWsRun, "pass-1", "corrections", "s3.md"));
    ok("AC2: the next correction's input renders against the article as it now stands",
      rC.status === 0 && inputS3.includes(CORRECTED.s2));
    ok("AC2: and does not carry the prose that correction replaced",
      !inputS3.includes(REAL.s2));
    const rD = RD("correct", "--step", "s3", "--file", proseFile("s3-corrected", CORRECTED.s3));
    ok("the second correction records", rD.status === 0);
    ok("and reports that every Step pass one sent to correction has been corrected",
      /every Step pass one sent to correction has been corrected/.test(rD.stdout));

    // --- pass two re-runs the blind recovery for the corrected Steps --------
    const rE = RD("check");
    ok("check re-runs the blind recovery for the corrected Steps and refuses until it comes back",
      rE.status === 1 && /re-runs the blind recovery/.test(rE.stderr)
      && /s2/.test(rE.stderr) && /s3/.test(rE.stderr));
    ok("and says why — the recorded reading is about text that is gone",
      /about text that is gone/.test(rE.stderr));
    ok("and it re-runs recovery for the CORRECTED Steps only",
      !/\ss1\s{2}/.test(rE.stderr) && !/\ss4\s{2}/.test(rE.stderr));
    for (const id of ["s2", "s3"]) RD("recover", "--step", id, "--file", recFor(id, "p2"));

    // --- ACCEPTANCE 3: the bound. `check` judges ONLY the corrected Steps'
    //     own items, the successors' two continuity items, and the mechanical
    //     items over the whole Draft.
    const rF = RD("check");
    const checkPath = join(cWsRun, "pass-2", "check.json");
    ok("check writes its own record beside pass one's rather than overwriting it",
      existsSync(checkPath) && existsSync(joinPath));
    const chk = JSON.parse(readOrEmpty(checkPath) || "{}");
    const items = JSON.parse(readFileSync(join(dirname(self), "review-items.json"), "utf8"));
    const mech = new Set(items.items.filter((i) => i.mode === "mechanical").map((i) => i.id));
    const FIGURE_ITEM_IDS = new Set(items.items.filter((i) => i.figure_only).map((i) => i.id));
    const succItems = items.pass_two.successor_items;
    const p1rec = JSON.parse(readOrEmpty(joinPath) || "{}");
    const ownOf = (id) => {
      const rows = (p1rec.results || []).filter((r) => r.step_id === id);
      return new Set([...rows.filter((r) => r.verdict === "fails").map((r) => r.item),
        ...rows.filter((r) => r.verdict === "holds" && r.class === "preserved").map((r) => r.item)]);
    };
    const inBound = (stepId, item) => mech.has(item)
      || (["s2", "s3"].includes(stepId) && ownOf(stepId).has(item))
      || (["s3", "s4"].includes(stepId) && succItems.includes(item));
    // THE UNIT IS THE SET OF JUDGED ITEMS ACROSS ONE RUN, never a single pair.
    // "re-judges only the named set" is a property no one output can display —
    // it is about what the run did NOT do — so the assertion reads the run's own
    // log of model calls as a whole and compares it against the bound computed
    // from pass one's record and the item table.
    // consulted: product-lab@a3b1382c69acc3f57add6576e25ea113d3aa3f2c
    //   gloss/lessons/testing.md:267 (match-the-detectors-unit-to-the-propertys-unit)
    const calls = chk.model_calls || [];
    ok("AC3: every judged item in pass two is inside the bound",
      calls.length > 0 && calls.every((c) => inBound(c.step_id, c.item)));
    ok("AC3: and no judged item is outside it — the count matches the bound exactly",
      calls.filter((c) => !inBound(c.step_id, c.item)).length === 0);
    // The mechanical arm covers every Step, and `mech` is narrowed to the rows
    // this Draft actually runs: a figure row is mechanical and applies to no
    // Step here, so demanding it over every Step would assert coverage of a
    // figure the fixture does not have.
    const proseMech = [...mech].filter((m) => !FIGURE_ITEM_IDS.has(m));
    ok("AC3: every mechanical item is re-run over EVERY Step",
      STEPS.every((s) => proseMech.every((m) =>
        (chk.mechanical || []).some((x) => x.step_id === s.id && x.item === m))));
    ok("AC3: the untouched Step's judged items are CARRIED, not re-judged",
      !calls.some((c) => c.step_id === "s1" && !mech.has(c.item))
      && (chk.results || []).some((r) => r.step_id === "s1" && r.carried));
    ok("AC3: and the successor that was not itself corrected is re-checked on the two continuity items only",
      succItems.every((i) => (chk.results || []).some((r) => r.step_id === "s4" && r.item === i && !r.carried))
      && (chk.results || []).filter((r) => r.step_id === "s4" && !r.carried)
        .every((r) => succItems.includes(r.item) || mech.has(r.item)));
    // A CASE MUST FAIL, NEVER THROW (the readOrEmpty rule above, applied to a
    // record rather than to a file): an absent `bound` is a failing case here,
    // and reading through it would take the whole pass down with a TypeError —
    // which reports no case count at all, the shape the member reads as "the
    // pass did not run".
    const bnd = chk.bound || { corrected: [], successors: [], verdicts_cleared: 0 };
    // FINDING 2 (PR #906 round 1): a carried row's span is the Step's CURRENT
    // range, never pass one's. The correction above added a line, so every
    // later Step moved; a carried row keeping its old range would name the
    // neighbouring lines under a body sha that is no longer the one it was
    // computed against.
    {
      const now = JSON.parse(readOrEmpty(join(cWsRun, "run.json")) || "{}");
      const cur = new Map((now.steps || []).map((x) => [x.step_id, x.lines]));
      const carriedRows = (chk.results || []).filter((r) => r.carried);
      ok("FINDING 2: every carried row's span is the Step's CURRENT line range",
        carriedRows.length > 0 && carriedRows.every((r) =>
          JSON.stringify(r.span) === JSON.stringify(cur.get(r.step_id))));
      const moved = carriedRows.filter((r) =>
        JSON.stringify(r.pass_one_span) !== JSON.stringify(r.span));
      ok("and the correction actually moved a Step, so the case is expressed rather than vacuous",
        moved.length > 0);
      ok("and pass one's own range is kept beside it, labelled as pass one's",
        carriedRows.every((r) => Array.isArray(r.pass_one_span)));
    }

    ok("AC3: the bound itself is RECORDED, so a reader can check it rather than take it",
      Boolean(chk.bound) && bnd.corrected.join(",") === "s2,s3"
      && bnd.successors.includes("s4"));
    ok("pass one's own answers for the re-judged pairs are discarded before pass two builds",
      bnd.verdicts_cleared > 0);

    // Answer pass two's owed pairs and complete it.
    // PASS TWO ANSWERS THROUGH `check --verdicts`, NEVER `compare`'s. Asserted
    // as its own case because the wrong door is the plausible one: `compare`
    // accepts the file, and would rebuild the UNBOUNDED join against the
    // corrected Draft — overwriting the pass-one record this pass carries from.
    const p2 = RD("check", "--verdicts", answer(checkPath, "p2", []));
    ok("pass two's owed pairs are answered through check's own verdicts route", p2.status === 0);
    ok("and the pass-one record is not rebuilt by it",
      JSON.parse(readOrEmpty(joinPath) || "{}").compared_at === p1rec.compared_at);
    const rG = RD("check");
    ok("check completes and names what it re-judged and what it carried",
      rG.status === 0 && /carried unchanged from pass one/.test(rG.stdout));
    ok("and reports an empty residue where nothing preserved still fails",
      /no preserved item fails after pass two/.test(rG.stdout));

    // RESIDUE: a PRESERVED item still failing after pass two, and only a
    // preserved one. Driven by re-answering one pair — verdicts are revisable
    // by design (PR #895 round 1, finding 5) — rather than by a second whole
    // drive, so the residue is computed by the same `check` over the same run
    // the cases above just watched complete.
    {
      // A REVISION IS ANSWERED AGAINST THE PAIRS PASS TWO ACTUALLY PUT, which
      // is its `model_calls` log. `owed` is empty once the pass completes, so a
      // revision built from it would revise nothing and the case would pass on
      // an empty file.
      const revise = (tag, failKeys) => {
        const rec = JSON.parse(readOrEmpty(checkPath) || "{}");
        const f = join(cRoot, `verdicts-${tag}.json`);
        writeFileSync(f, JSON.stringify({
          verdicts: (rec.model_calls || []).map((c) => {
            const failing = failKeys.includes(`${c.step_id}/${c.item}`);
            return {
              step_id: c.step_id, item: c.item,
              ...(c.pair === null ? {} : { pair: c.pair }),
              verdict: failing ? "fails" : "holds",
              reason: failing
                ? "the recovered reader would not be the declared one"
                : "the declared line and the recovered one agree",
              model: JUDGE_MODEL,
            };
          }),
        }, null, 2) + "\n");
        return f;
      };
      const back = RD("check", "--verdicts",
        revise("p2-fail", ["s2/reader-state-after", "s4/already-knows"]));
      ok("a revised answer re-opens the same bounded pass", back.status === 0);
      const chk2 = JSON.parse(readOrEmpty(checkPath) || "{}");
      const failed = (chk2.results || []).filter((r) => r.verdict === "fails" && !r.carried);
      ok("a preserved item still failing after pass two becomes residue",
        /residue — preserved item\(s\) reaching the owner/.test(back.stdout)
        && /s2\/reader-state-after/.test(back.stdout)
        && !/UNCORRECTED/.test(back.stdout));
      // The best-effort fail is in the SAME answer file and must NOT be
      // residue: the class is the consequence here exactly as it is at `close`,
      // and a residue list counting every fail would hand the owner a question
      // the design already answered.
      ok("and a BEST-EFFORT item failing in the same pass does not",
        failed.some((r) => r.item === "already-knows")
        && !/s4\/already-knows/.test(back.stdout.slice(back.stdout.indexOf("residue —"))));
      const rClose = RD("close");
      const revR = readOrEmpty(join(cBrief, "review.md"));
      const residue = revR.slice(revR.indexOf("## Residue"));
      ok("close hands the residue to the owner with an empty classified: field",
        rClose.status === 0
        && (residue.match(/^ {2}classified:$/gm) || []).length === 1
        && !/^ {2}classified:[^\n]*\S/m.test(residue));
      ok("and the residue line says the item survived pass two",
        /still failing after pass two/.test(residue));
      // EVERY POINTER THE RECORD RENDERS RESOLVES (PR #1004 round 2, finding 5).
      // The legend above asserts the template text; this asserts the paths
      // composed for the run's actual findings and residue — which used to
      // name `<step>.<item>.md` for a paired item whose inputs are
      // `<step>.<item>.<n>.md`, a Packet for a Harness-decided row that never
      // had one, and `pass-2/` for a row pass two never read.
      {
        const pointers = [...revR.matchAll(/^ {2}- (?:recovered record|the pair the judge saw): `([^`]+)`/gm)]
          .map((m) => m[1]);
        const none = (revR.match(/^ {2}- the pair the judge saw: none — /gm) || []).length;
        ok("#1004/5: the record composes pointers for its findings and residue",
          pointers.length > 0, `pointers: ${pointers.length}`);
        const dead = pointers.filter((f) => !existsSync(resolve(process.cwd(), f)));
        ok("#1004/5: and every pointer names a file this run wrote",
          dead.length === 0, dead.join(", "));
        // A ROW THE HARNESS DECIDED SAYS SO, AND POINTS AT THE RECORD THAT
        // DECIDED IT rather than at a Packet nothing rendered. This run's
        // findings include mechanically-decided rows, so the arm is expressed.
        const rr = JSON.parse(readFileSync(join(cWsRun, "run.json"), "utf8"));
        // COUNTED OVER BOTH SECTIONS THE LINE IS RENDERED IN (PR #1007 round 1,
        // finding 1): a preserved fail is a finding AND a residue row, so its
        // none-line renders twice, and a count over `findings` alone would
        // fail the equality on correct output.
        const harnessRows = (rr.findings || []).filter((f) => !chosenJudged(f)).length
          + (rr.residue || []).filter((r) => !chosenJudged(r)).length;
        // This fixture's findings are all judged, so the equality is the
        // whole of what it can express here; the arm with a Harness-decided
        // row is asserted on the #996 fixture, whose `grounds-unused` fail is
        // decided by the Harness by construction.
        ok("#1004/5: a Harness-decided line renders no Packet pointer, and only such a line does",
          none === harnessRows
          && (harnessRows === 0 || /the pair the judge saw: none — [^\n]*(join|check)\.json/.test(revR)),
          `harness-decided rows: ${harnessRows}, none-lines: ${none}`);
        // A CARRIED RESIDUE LINE POINTS AT PASS ONE even though `check` ran.
        const carriedResidue = (rr.residue || []).filter((r) => r.carried);
        const residueText = revR.slice(revR.indexOf("## Residue"));
        ok("#1004/5: a carried residue line points at pass one, the only pass that read it",
          carriedResidue.every((r) => new RegExp(
            `\\*\\*${r.step_id} / ${r.item}\\*\\*[^]*?recovered record: \`[^\`]*pass-1/recovered/${r.step_id}\\.json\``)
            .test(residueText)),
          `carried residue rows: ${carriedResidue.length}`);
      }
      // AND THE CLOSE IS UNDONE TOO (kogaki#994). `close` now ends a run: it
      // writes the reviewed Draft, restores `draft.md` to the article the run
      // read, and refuses a second close that would copy that original back
      // over the reviewed one. This block closes to INSPECT the record and then
      // carries on, so it puts the tree and the run record back exactly as the
      // close found them — the same undo the line below performs for the
      // verdicts, one artifact over.
      {
        const reviewedFile = join(cBrief, REVIEWED_BASENAME);
        if (existsSync(reviewedFile)) {
          writeFileSync(cDraft, readFileSync(reviewedFile, "utf8"));
          rmSync(reviewedFile, { force: true });
        }
        const rr = JSON.parse(readFileSync(join(cWsRun, "run.json"), "utf8"));
        delete rr.reviewed_at; delete rr.reviewed_draft; delete rr.restored_from;
        delete rr.closed_at;
        writeFileSync(join(cWsRun, "run.json"), JSON.stringify(rr, null, 2) + "\n");
      }
      // Put the run back where the rest of the block found it, so the record
      // the AC4 cases read is the completed two-pass one rather than this
      // deliberately-failed variant.
      RD("check", "--verdicts", revise("p2-restore", []));
    }

    // --- ACCEPTANCE 4: the owner record carries the drift, per corrected Step
    const rH = RD("close");
    const rev = readOrEmpty(join(cBrief, "review.md"));
    ok("close is reachable from check and writes the owner record", rH.status === 0 && rev.length > 0);
    ok("the record states that two passes ran", /\*\*Passes\.\*\* two \(compare, check\)/.test(rev));
    ok("AC4: the record carries a change share for every corrected Step",
      (rev.match(/^ {2}- change share: /gm) || []).length === 2);
    ok("AC4: and a Packet overlap for every corrected Step",
      (rev.match(/^ {2}- packet overlap: /gm) || []).length === 2);
    ok("AC4: and names each corrected Step with the pass it was corrected in",
      /- \*\*s2\*\* \(pass 1\)/.test(rev) && /- \*\*s3\*\* \(pass 1\)/.test(rev));

    // --- kogaki#994: THE WORKSPACE IS SPLIT BY PASS AND EVERY PASS'S EVIDENCE
    //     SURVIVES. This run corrected two Steps and ran `check`, so pass two
    //     re-read exactly those Steps blind — which is the write that used to
    //     land on pass one's file and destroy the reading it recorded.
    const P1 = (...a) => join(cWsRun, "pass-1", ...a);
    const P2 = (...a) => join(cWsRun, "pass-2", ...a);
    ok("#994: pass one's own directory holds the whole of its evidence",
      ["recovery", "recovered", "join", "ledger", "corrections"]
        .every((d) => existsSync(P1(d)))
      && existsSync(P1("cold-reader.md")) && existsSync(P1("join.json")));
    ok("#994: and pass two's holds its own, in its own directory",
      existsSync(P2("check.json")) && existsSync(P2("recovery")) && existsSync(P2("recovered")));
    ok("#994: the run record and the snapshots stay at the workspace root",
      existsSync(join(cWsRun, "run.json")) && existsSync(join(cWsRun, "snapshots"))
      && !existsSync(P1("run.json")) && !existsSync(P2("run.json")));

    // THE TWO READINGS BOTH EXIST, AND THEY DIFFER. Presence alone would pass
    // on a pass-two file that was a copy of pass one's; the point is that the
    // corrected Step was read twice, against two different articles.
    for (const id of ["s2", "s3"]) {
      const r1 = readOrEmpty(P1("recovery", `${id}.md`));
      const r2 = readOrEmpty(P2("recovery", `${id}.md`));
      ok(`#994: ${id}'s pass-one recovery input survives pass two re-reading it`,
        r1.length > 0 && r2.length > 0 && r1 !== r2);
      ok(`#994: and both passes' recovered records for ${id} are on disk`,
        existsSync(P1("recovered", `${id}.json`)) && existsSync(P2("recovered", `${id}.json`)));
    }
    ok("#994: pass one's join record and pass two's are separate files",
      existsSync(P1("join.json")) && existsSync(P2("check.json"))
      && readOrEmpty(P1("join.json")) !== readOrEmpty(P2("check.json")));
    ok("#994: and the correction inputs are filed with the verdicts that asked for them",
      existsSync(P1("corrections", "s2.md")) && existsSync(P1("corrections", "s3.md"))
      && !existsSync(P2("corrections")));

    // --- kogaki#994: THE REVIEWED DRAFT HAS ITS OWN FILENAME AND `draft.md` IS
    //     THE DRAFT THAT WAS REVIEWED.
    const cReviewed = join(cBrief, REVIEWED_BASENAME);
    ok("#994: the reviewed Draft lands beside the Draft under its own name",
      existsSync(cReviewed));
    ok("#994: `draft.md` is byte-identical to the article this run reviewed",
      readFileSync(cDraft, "utf8") === cArticleAsReviewed);
    ok("#994: and the reviewed Draft is the corrected article, not a copy of it",
      readOrEmpty(cReviewed) !== cArticleAsReviewed);
    ok("#994: the owner record names both files",
      /\*\*Draft reviewed\.\*\*/.test(rev) && rev.includes(REVIEWED_BASENAME));

    // A SECOND `close` WOULD COPY THE RESTORED ORIGINAL OVER THE REVIEWED
    // DRAFT, and is refused by name rather than performed.
    {
      const again = RD("close");
      ok("#994: a second close over a restored run refuses",
        again.status === 1 && /this run is closed/.test(again.stderr));
      ok("#994: and the reviewed Draft is untouched by the refusal",
        readOrEmpty(cReviewed) !== cArticleAsReviewed);
    }

    // --- PR #1004 round 1, finding 1, and its successor's finding 4: `compare`
    //     IS PASS ONE, AND PASS ONE ENDS AT THE FIRST CORRECTION. Driven by
    //     running `compare` again with the run on pass two, which is the door
    //     `check`'s own comment names as the plausible wrong one. Round 1 found
    //     the Packets landing in `pass-2/join/`; the successor review found
    //     that, with that fixed, the re-run still re-rendered pass ONE's
    //     Packets from the corrected prose over the inputs its verdicts were
    //     given on. So the act is refused, and both directories are asserted
    //     byte-for-byte untouched.
    {
      writeFileSync(cDraft, readFileSync(join(cBrief, REVIEWED_BASENAME), "utf8"));
      const rr = JSON.parse(readFileSync(join(cWsRun, "run.json"), "utf8"));
      delete rr.reviewed_at; delete rr.restored_from; delete rr.closed_at;
      writeFileSync(join(cWsRun, "run.json"), JSON.stringify(rr, null, 2) + "\n");
      const p2JoinBefore = existsSync(P2("join"))
        ? readdirSync(P2("join")).sort().join(",") : "";
      // THE CASE IS ONLY EXPRESSED IF PASS TWO HAS PAIR INPUTS TO LOSE. An
      // empty pass-2 `join/` would make the comparison below vacuously true,
      // which is the shape this whole Harness exists to refuse.
      ok("#1004/1: pass two has pair inputs of its own for the case to be about",
        p2JoinBefore.length > 0);
      const dirBytes = (d) => readdirSync(d).sort()
        .map((n) => `${n}:${readFileSync(join(d, n), "utf8")}`).join("\u0000");
      ok("#1004/1: and pass one has pair inputs of its own for the case to be about",
        existsSync(P1("join")) && readdirSync(P1("join")).length > 0);
      const p1JoinBefore = dirBytes(P1("join"));
      const p1RecordBefore = readOrEmpty(P1("join.json"));
      const rCmp = RD("compare");
      ok("#1004/1: compare over a run with corrections is refused by name",
        rCmp.status === 1 && /pass one is over/.test(rCmp.stderr)
        && /over the inputs its verdicts were given on/.test(rCmp.stderr));
      ok("#1004/1: and the refusal names `check` as the pass over a corrected Draft",
        /review-draft\.mjs check --draft/.test(rCmp.stderr));
      const p2JoinAfter = existsSync(P2("join"))
        ? readdirSync(P2("join")).sort().join(",") : "";
      ok("#1004/1: pass two's pair inputs are untouched",
        p2JoinAfter === p2JoinBefore);
      ok("#1004/1: and pass one's pair inputs are byte-for-byte the ones its verdicts were given on",
        dirBytes(P1("join")) === p1JoinBefore);
      ok("#1004/1: and pass one's record is unchanged",
        readOrEmpty(P1("join.json")) === p1RecordBefore);
      // THE COLD READER'S ENTRIES ARE PASS ONE'S TOO (PR #1007 round 1, finding
      // 2): a `read` over a run with corrections is refused the same way, and
      // no ledger exists under pass two whatever pass the run has reached.
      const ledgerBefore = readdirSync(P1("ledger")).sort()
        .map((n) => `${n}:${readFileSync(P1("ledger", n), "utf8")}`).join("\u0000");
      const rRead = RD("read", "--section", "1", "--file", ledgerFile);
      ok("#1007/2: read over a run with corrections is refused by name",
        rRead.status === 1 && /pass one is over/.test(rRead.stderr)
        && /Section verdicts were given on/.test(rRead.stderr));
      ok("#1007/2: pass one's ledger entries are byte-for-byte untouched and pass two has no ledger",
        readdirSync(P1("ledger")).sort()
          .map((n) => `${n}:${readFileSync(P1("ledger", n), "utf8")}`).join("\u0000") === ledgerBefore
        && !existsSync(P2("ledger")));
    }

    // --- PR #1004 round 1, finding 3: kogaki#994 item 4 — the owner record
    //     points at the pass directories, so a finding leads to the input the
    //     judge saw and the record the blind reviewer wrote.
    {
      const rC = RD("close");
      const rv = readOrEmpty(join(cBrief, "review.md"));
      ok("#1004/3: close succeeds and the record names where the evidence is",
        rC.status === 0 && /^### Where this run's evidence is$/m.test(rv));
      ok("#1004/3: it names both passes' directories",
        /\*\*Pass 1 — `compare`\.\*\*/.test(rv) && /\*\*Pass 2 — `check`\.\*\*/.test(rv)
        && rv.includes("pass-1") && rv.includes("pass-2"));
      ok("#1004/3: and the artefacts a reader goes from a finding to",
        /recovered\/<step>\.json/.test(rv) && /join\/<step>\.<item>/.test(rv));
      ok("#1004/3: the snapshots and the run record are named at the root",
        /\*\*Snapshots\.\*\*/.test(rv) && /\*\*Run record\.\*\*/.test(rv));
      // Undo the close again — the pass-collision case below needs a live run.
      writeFileSync(cDraft, readFileSync(join(cBrief, REVIEWED_BASENAME), "utf8"));
      const rr = JSON.parse(readFileSync(join(cWsRun, "run.json"), "utf8"));
      delete rr.reviewed_at; delete rr.restored_from; delete rr.closed_at;
      writeFileSync(join(cWsRun, "run.json"), JSON.stringify(rr, null, 2) + "\n");
    }

    // --- kogaki#994: A WRITE THAT WOULD LAND ON ANOTHER PASS'S FILE IS REFUSED
    //     BY NAME. Driven by putting the run back on pass one with pass two's
    //     ledger intact, which is the state a site composing a path by hand
    //     would produce — the directory split alone makes it unreachable, and
    //     the refusal is what keeps it unreachable when the split is edited.
    {
      // The close restored `draft.md`, so the corrected article goes back first:
      // `requireCurrent` guards every act and would refuse on the restore before
      // the pass ledger was ever consulted.
      writeFileSync(cDraft, readFileSync(cReviewed, "utf8"));
      const rr = JSON.parse(readFileSync(join(cWsRun, "run.json"), "utf8"));
      rr.pass = 1;
      rr.pass_files[["pass-1", "recovered", "s2.json"].join("/")] = 2;
      delete rr.reviewed_at; delete rr.restored_from;
      delete rr.recovered.s2;
      writeFileSync(join(cWsRun, "run.json"), JSON.stringify(rr, null, 2) + "\n");
      const r = RD("recover", "--step", "s2", "--file", P2("recovered", "s2.json"));
      ok("#994: a pass writing over a file another pass wrote is refused by name",
        r.status === 1 && /would write over a file pass 2 wrote/.test(r.stderr));
      ok("#994: and the refusal says why the other pass's reading is not recoverable",
        /not recoverable once this write lands/.test(r.stderr));
    }
  }


  // -- kogaki#873: THE COLD READER -----------------------------------------
  //
  // A Section declares its heading and nothing else, so its review is a second
  // reader rather than a second Step: the body alone, entries per Section, and
  // one final claim. What these cases assert is the three properties the issue
  // names — the input's blindness, the entry set `compare` requires, and where
  // a Section fail goes.

  // ACCEPTANCE 1 — THE COLD READER'S INPUT CARRIES NOTHING FROM A PACKET.
  //
  // ASSERTED AS STRING ABSENCE, not as a reading of the renderer. The fixture
  // Packets carry a token that appears nowhere in the prose for exactly this,
  // and it is the same instrument the recovery input's own blindness case uses:
  // a template edit that pasted a Packet block in would read as helpful and
  // would silently end the measurement, and only a string test catches that.
  {
    const cold = readOrEmpty(join(WS, "pass-1", "cold-reader.md"));
    ok("open renders the cold reader's input", cold.length > 0);
    ok("AC1: it carries no string that occurs only in a Packet", !/PACKETONLYTOKEN/.test(cold));
    // The body IS there — an empty file would pass the test above for the wrong
    // reason, which is the shape a blindness assertion is most likely to fail in.
    ok("AC1: and it does carry the Draft's body, so the absence above is not vacuous",
      cold.includes("The first passage opens the claim")
      && cold.includes("The third passage opens the second Section"));
    // ASSERTED AS A LINE, NOT AS A PATTERN (round 1, finding 1). The first form
    // built a RegExp from a template literal and escaped the backslashes twice,
    // so the source read `^\\s*NN \\| The first passage` — a bare `|` splitting
    // it into two alternatives whose second matched the body unconditionally.
    // The numbering was right the whole time, which is why nothing showed it.
    // A fixed number needs no pattern: the rendered line is a string, and
    // comparing strings cannot be an alternation by accident.
    ok("AC1: with the Draft's own line numbers, so the reader's spans are the Harness's",
      cold.split("\n").some((l) =>
        l.trimStart() === `${draft.ranges.a1[0] + draft.bodyOffset} | The first passage opens the claim `
          + "and says what the reader is about to be shown."));
    // NO STEP BOUNDARY IS RENDERED. Half of what the Section pairs measure is
    // whether a Section reads as one movement, and marking the seams would tell
    // the reader where to expect them.
    ok("AC1: and no Step boundary is marked in it", !/\ba1\b/.test(cold) && !/\ba2\b/.test(cold));
    // The frontmatter is stripped: a reader shown the trace has been shown the
    // Packet pointers and the Step ranges, which is the plan by another route.
    ok("AC1: and the frontmatter is not in it", !/trace:/.test(cold) && !/packet_sha/.test(cold));
  }

  // A DRAFT THAT QUOTES A TEMPLATE SLOT IN ITS OWN PROSE (round 1, finding 4).
  // Not a contrivance here: this repository's live Draft is about this pipeline,
  // so an article naming `{{read_command}}` is the ordinary case rather than the
  // adversarial one. Before the fix the body went in first, so such prose was
  // either rewritten with the command or made `open` refuse with a message
  // about the template disagreeing with the renderer — false, and naming a
  // repair the Draft's author cannot perform.
  {
    const qRoot = join(root, "theses", "quotesslot");
    const qProse = {
      a1: ["The first passage opens the claim and quotes {{read_command}} as an example.", "",
        "It runs two paragraphs so a range covering more than one line is exercised.",
        "The harness renders each input in the path's recorded order."],
      a2: ["The second passage mentions {{not_a_real_slot}} and does not restate the heading."],
      a3: PROSE.a3,
    };
    const d = buildDraft(qRoot, { packetDir, prose: qProse });
    const wsb = join(root, "ws-quotesslot");
    const r = spawnSync(process.execPath,
      [self, "open", "--draft", d.path, "--workspace", wsb], { encoding: "utf8" });
    ok("a Draft quoting a template slot opens rather than refusing falsely", r.status === 0);
    const cold = readOrEmpty(join(wsb, "quotesslot", "pass-1", "cold-reader.md"));
    ok("and the reader gets the article's own words back, unrewritten",
      cold.includes("quotes {{read_command}} as an example")
      && cold.includes("mentions {{not_a_real_slot}}"));
    // The check still catches a template the renderer really does disagree with,
    // which is the property that must survive the reordering.
    const solo = join(root, "solo-slot"); mkdirSync(solo, { recursive: true });
    for (const f of ["review-draft.mjs", "runs.mjs", "runs.json", "recovery-template.md",
      "cold-reader-template.md", "recovered-schema.json", "review-items.json",
      "join-template.md"]) {
      writeFileSync(join(solo, f), readFileSync(join(dirname(self), f)));
    }
    // MUTATE THE RENDERED HALF, NEVER THE COMMENT. The template's authoring
    // comment lists its own slot names and is stripped at render, so an edit
    // there reaches nothing — a first attempt did exactly that and the case
    // passed while asserting about a file the renderer never saw. The comment
    // is split off here and the mutation applied to what remains.
    const tpl = join(solo, "cold-reader-template.md");
    const rendered = (t) => t.replace(/^<!--[\s\S]*?-->\n*/, "");
    const commentOf = (t) => t.slice(0, t.length - rendered(t).length);
    const mutateRendered = (t, f) => commentOf(t) + f(rendered(t));
    writeFileSync(tpl, mutateRendered(readFileSync(tpl, "utf8"),
      (b) => b.replace("{{slug}}", "{{slug}} {{invented_slot}}")));
    const d2 = buildDraft(join(root, "theses", "slotgap"), { packetDir });
    const r2 = spawnSync(process.execPath,
      [join(solo, "review-draft.mjs"), "open", "--draft", d2.path,
        "--workspace", join(root, "ws-slotgap")], { encoding: "utf8" });
    ok("an unfilled slot in the TEMPLATE still refuses by name",
      r2.status === 1 && /\{\{invented_slot\}\} was not filled/.test(r2.stderr));
    // And a template with no body slot at all refuses rather than handing over
    // an instruction with no article under it — the failure the reordering
    // would otherwise have made silent.
    writeFileSync(tpl, mutateRendered(readFileSync(join(dirname(self), "cold-reader-template.md"), "utf8"),
      (b) => b.replace("{{body}}", "(the article goes here)")));
    const r3 = spawnSync(process.execPath,
      [join(solo, "review-draft.mjs"), "open", "--draft", d2.path,
        "--workspace", join(root, "ws-slotgap2")], { encoding: "utf8" });
    ok("and a template carrying no {{body}} slot refuses rather than rendering an empty read",
      r3.status === 1 && /carries no \{\{body\}\} slot/.test(r3.stderr));
  }

  // ACCEPTANCE 3 — ALL STEPS HOLD AND THE HEADING IS UNRELATED: one
  // `upstream: brief` residue line, and ZERO correction targets.
  //
  // This is the route no correction can discharge, and the one worth a fixture
  // of its own: a run that quietly localized it anyway would send a healthy
  // Step to be rewritten and report the Section clean afterwards. The heading
  // is replaced in the BODY AND IN THE TRACE, which is what `emit` writes —
  // mutating one alone would test a Draft no lane can produce.
  {
    const bRoot = join(root, "theses", "briefdefect");
    const d = buildDraft(bRoot, { packetDir,
      mutate: (t) => t.split("The second heading").join("An unrelated title") });
    const wsb = join(root, "ws-briefdefect");
    const wsRun = join(wsb, "briefdefect");
    const D = (...a) => spawnSync(process.execPath,
      [self, ...a, "--draft", d.path, "--workspace", wsb], { encoding: "utf8" });

    // Every pair holds except the Section's own question pair: the Steps are
    // untouched, so what is wrong can only be the grouping.
    const answerBut = (tag, failKeys) => {
      const rec0 = existsSync(join(wsRun, "pass-1", "join.json"))
        ? JSON.parse(readFileSync(join(wsRun, "pass-1", "join.json"), "utf8")) : {};
      const owed = [...(rec0.owed || []), ...((rec0.sections || {}).owed || [])];
      const f = join(root, `verdicts-${tag}.json`);
      writeFileSync(f, JSON.stringify({
        verdicts: owed.map((o) => {
          const failing = failKeys.includes(o.key);
          return { step_id: o.step_id, item: o.item,
            ...(o.pair === null ? {} : { pair: o.pair }),
            verdict: failing ? "fails" : "holds",
            reason: failing
              ? "the heading promises a question this Section does not answer"
              : "the declared line and the recovered one agree",
            model: JUDGE_MODEL };
        }),
      }, null, 2) + "\n");
      return f;
    };

    D("open");
    for (const id of ["a1", "a2", "a3"]) D("recover", "--step", id, "--file", writeRecordFor(d, id, "bd"));
    for (const n of ["1", "2"]) D("read", "--section", n, "--file", ledgerFile);
    D("read", "--claim", "--file", claimFile);
    D("compare");
    const r = D("compare", "--verdicts", answerBut("bd", ["section:2/section-question"]));
    ok("the run reaches a completed join with one Section pair failing", r.status === 0);
    const SL = sectionLinesOf(r.stdout);
    ok("AC3: the Section line renders the fail", SL.get("2/section-question")?.verdict === "fails");
    ok("AC3: no preserved Step item fails, so no Step is sent to correction",
      /No preserved item fails, so no Step is sent to correction\./.test(r.stdout));
    ok("AC3: and the run says the Section fail routed UPSTREAM to the Brief",
      /routed UPSTREAM to the Brief/.test(r.stdout) && /section 2/.test(r.stdout));
    ok("AC3: naming that no correction runs for it",
      /No correction runs for these\./.test(r.stdout));

    const rec = JSON.parse(readFileSync(join(wsRun, "pass-1", "join.json"), "utf8"));
    const routes = rec.sections.routes;
    ok("AC3: exactly one route is recorded, and it is upstream",
      routes.length === 1 && routes[0].kind === "upstream" && routes[0].upstream === "brief");
    ok("AC3: the route says why — the grouping is what is wrong",
      /the grouping is what/.test(routes[0].why));

    // ZERO CORRECTION TARGETS is asserted at the act that would perform one:
    // `correct` is what a target reaches, so a route that produced none is
    // checkable by that command refusing rather than by reading a count back.
    const rc = D("correct", "--step", "a3");
    ok("AC3: zero correction targets — `correct` refuses BY THE RIGHT REASON, that pass one "
      + "sent this Step nothing",
      rc.status === 1 && /carries no failing PRESERVED item/.test(rc.stderr));
    // And the Section's OTHER Step too, so the assertion is about the route
    // rather than about which Step happened to be named.
    const rc2 = D("correct", "--step", "a1");
    ok("AC3: and no Step in the Draft is a target",
      rc2.status === 1 && /carries no failing PRESERVED item/.test(rc2.stderr));

    // `close` is reachable DIRECTLY, without pass two: no correction runs for a
    // Brief defect, so routing it through `check` would ask a pass to re-read
    // something nothing changed.
    const rClose = D("close");
    ok("AC3: close is reachable from compare — an upstream route does not withhold it",
      rClose.status === 0);
    const rev = readOrEmpty(join(bRoot, "review.md"));
    const residue = rev.slice(rev.indexOf("## Residue"));
    ok("AC3: exactly one residue line, and it is the upstream one",
      (residue.match(/^- \*\*/gm) || []).length === 1 && /upstream: brief/.test(residue));
    ok("AC3: it carries its EMPTY classified: field like every other residue line",
      /^ {2}classified:$/m.test(residue) && !/^ {2}classified:[^\n]*\S/m.test(residue));
    ok("AC3: and says no correction ran, so the owner is not left to infer it",
      /No correction ran/.test(residue));
    // The finding itself is rendered with its route, so the record answers
    // "was a correction owed for this" rather than leaving it to be worked out.
    ok("AC3: the Section finding names its route in the record",
      /- \*\*Section 2 \/ section-question\*\* — fails/.test(rev)
      && /route: \*\*upstream: brief\*\*/.test(rev));
  }

  // AND THE OTHER ROUTE: a Section fail LOCALIZES when a Step in it is already
  // failing. Same shape, one Step's preserved item failing too — which is the
  // control for the case above, since without it "upstream" could be what this
  // Harness answers for every Section fail.
  {
    const lRoot = join(root, "theses", "localize");
    const d = buildDraft(lRoot, { packetDir });
    const wsb = join(root, "ws-localize");
    const wsRun = join(wsb, "localize");
    const D = (...a) => spawnSync(process.execPath,
      [self, ...a, "--draft", d.path, "--workspace", wsb], { encoding: "utf8" });
    const answerBut = (tag, failKeys) => {
      const rec0 = existsSync(join(wsRun, "pass-1", "join.json"))
        ? JSON.parse(readFileSync(join(wsRun, "pass-1", "join.json"), "utf8")) : {};
      const owed = [...(rec0.owed || []), ...((rec0.sections || {}).owed || [])];
      const f = join(root, `verdicts-${tag}.json`);
      writeFileSync(f, JSON.stringify({
        verdicts: owed.map((o) => ({
          step_id: o.step_id, item: o.item,
          ...(o.pair === null ? {} : { pair: o.pair }),
          verdict: failKeys.includes(o.key) ? "fails" : "holds",
          reason: failKeys.includes(o.key)
            ? "the recovered reader would not be the declared one"
            : "the declared line and the recovered one agree",
          model: JUDGE_MODEL,
        })),
      }, null, 2) + "\n");
      return f;
    };
    D("open");
    for (const id of ["a1", "a2", "a3"]) D("recover", "--step", id, "--file", writeRecordFor(d, id, "loc"));
    for (const n of ["1", "2"]) D("read", "--section", n, "--file", ledgerFile);
    D("read", "--claim", "--file", claimFile);
    D("compare");
    const r = D("compare", "--verdicts",
      answerBut("loc", ["section:1/section-belief-after", "a2/reader-state-after"]));
    ok("the localizing run reaches a completed join", r.status === 0);
    const rec = JSON.parse(readFileSync(join(wsRun, "pass-1", "join.json"), "utf8"));
    const routes = rec.sections.routes;
    ok("a Section fail LOCALIZES to the Step already failing a preserved item",
      routes.length === 1 && routes[0].kind === "localized" && routes[0].step_id === "a2");
    ok("and the run names where it went", /Section fails localized to a Step[^\n]*section 1 -> a2/.test(r.stdout));
    ok("no upstream residue is produced for a localized fail",
      !/routed UPSTREAM/.test(r.stdout));
    // AND IT WITHHOLDS `close`, exactly as a preserved Step fail does: it named
    // a correction target, so pass two is what turns it into a correction or
    // into residue.
    const rClose = D("close");
    ok("a localized Section fail withholds close, routing through check",
      rClose.status === 1 && /reachable only through `check`/.test(rClose.stderr));
  }

  // AND THE THIRD ROUTE (round 1, finding 2): a Section fails while a Step in it
  // carries a `cannot-decide` on the localizing item. Neither of the two routes
  // above applies — no Step FAILS, and not every Step HOLDS — and the first form
  // of this Harness swept the case into localization, handing a correction
  // target to a reviewer who had declined to decide. This is the case that
  // arm was missing.
  {
    const uRoot = join(root, "theses", "undecided");
    const d = buildDraft(uRoot, { packetDir });
    const wsb = join(root, "ws-undecided");
    const wsRun = join(wsb, "undecided");
    const D = (...a) => spawnSync(process.execPath,
      [self, ...a, "--draft", d.path, "--workspace", wsb], { encoding: "utf8" });
    const answerWith = (tag, byKey) => {
      const rec0 = existsSync(join(wsRun, "pass-1", "join.json"))
        ? JSON.parse(readFileSync(join(wsRun, "pass-1", "join.json"), "utf8")) : {};
      const owed = [...(rec0.owed || []), ...((rec0.sections || {}).owed || [])];
      const f = join(root, `verdicts-${tag}.json`);
      const REASONS = {
        fails: "the heading promises a question this Section does not answer",
        "cannot-decide": "the passage could be read either way and this reader will not choose",
        holds: "the declared line and the recovered one agree",
      };
      writeFileSync(f, JSON.stringify({
        verdicts: owed.map((o) => {
          const v = byKey[o.key] || "holds";
          return { step_id: o.step_id, item: o.item,
            ...(o.pair === null ? {} : { pair: o.pair }),
            verdict: v, reason: REASONS[v], model: JUDGE_MODEL };
        }),
      }, null, 2) + "\n");
      return f;
    };
    D("open");
    for (const id of ["a1", "a2", "a3"]) D("recover", "--step", id, "--file", writeRecordFor(d, id, "und"));
    for (const n of ["1", "2"]) D("read", "--section", n, "--file", ledgerFile);
    D("read", "--claim", "--file", claimFile);
    D("compare");
    const r = D("compare", "--verdicts", answerWith("und", {
      "section:1/section-question": "fails",
      "a2/reader-state-after": "cannot-decide",
    }));
    ok("the undecided run reaches a completed join", r.status === 0);
    const rec = JSON.parse(readFileSync(join(wsRun, "pass-1", "join.json"), "utf8"));
    const routes = rec.sections.routes;
    ok("a `cannot-decide` on the localizing item does NOT localize the Section fail",
      routes.length === 1 && routes[0].kind !== "localized");
    ok("it routes `undecided`, naming the Steps that are unsettled",
      routes[0].kind === "undecided" && routes[0].steps.join(",") === "a2");
    // AND IT IS NOT REPORTED AS A BRIEF DEFECT. Narrowing the localizing arm to
    // `fails` alone would have produced exactly that, on route 2's own premise
    // that every Step holds — which is false here.
    ok("and it is NOT rounded into the upstream route, whose premise is false here",
      !/routed UPSTREAM/.test(r.stdout) && /could not be decided/.test(r.stdout));
    ok("`correct` is offered no target, so no Step is handed a correction it was not sent",
      D("correct", "--step", "a2").status === 1
      && D("correct", "--step", "a1").status === 1);
    const rClose = D("close");
    ok("close is reachable — an undecided route withholds nothing, having no target",
      rClose.status === 0);
    const rev = readOrEmpty(join(uRoot, "review.md"));
    const residue = rev.slice(rev.indexOf("## Residue"));
    ok("the residue line says `undecided` rather than `upstream: brief`",
      /undecided/.test(residue) && !/upstream: brief/.test(residue));
    ok("and says explicitly that this is not a Brief defect",
      /NOT a Brief defect/.test(residue));
    ok("while still carrying its EMPTY classified: field",
      /^ {2}classified:$/m.test(residue) && !/^ {2}classified:[^\n]*\S/m.test(residue));
  }

  // THE VACUOUS PAIRS ARE DECIDED AND RENDERED, never skipped. A skipped pair
  // and a pair that held are the same silence to a reader of the output, and
  // the sentence comes from the table rather than from this runtime.
  {
    const SL = sectionLinesOf(baseStdout);
    ok("a pair that does not bind on this Section still renders a line",
      SL.has("1/section-belief-before") && SL.has("1/final-claim") && SL.has("2/opening-question"));
    ok("and it holds, carrying the table's own reason for not binding",
      SL.get("1/section-belief-before").verdict === "holds"
      && /first Section/.test(SL.get("1/section-belief-before").reason));
    ok("the final claim is paired once, at the last Section",
      SL.get("2/final-claim").verdict !== undefined
      && /recorded once for the whole Draft/.test(SL.get("1/final-claim").reason));
    // A vacuous pair costs NO MODEL CALL, and the record says so per pair —
    // which is what makes "decided by the Harness" checkable rather than claimed.
    const mech = (baseRecord.sections.mechanical || []).map((m) => `${m.section}/${m.item}`);
    ok("and it appears in the Section mechanical log and in no model call",
      mech.includes("1/section-belief-before")
      && !baseRecord.sections.model_calls.some((m) => m.section === 1 && m.item === "section-belief-before"));
  }

  // ---- kogaki#880 -------------------------------------------------------
  // THE FIGURE'S ROUND TRIP: the blind reading, the element-to-ground join, and
  // the caption against the declared reader state. Driven on its OWN Draft
  // rather than by adding a figure to the fixture above — every case above
  // asserts a count or an absence over that Draft, and a figure appearing in it
  // would move those numbers for a reason unrelated to what they measure.
  {
    const fdir = join(root, "fig");
    const fPacketDir = join(fdir, "packets");
    mkdirSync(fPacketDir, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) writePacket(fPacketDir, id);

    // The record is an INSTANCE of the `axis` form. Each element's `ground` is
    // The figure decision's ADDRESS over this Step's own grounds, 1-based — `g1` and `g2` are
    // the two `GROUNDS.a1` lines. The binding itself is the figure record's to refuse; what
    // `figure-element-ground` asks is whether each element's WORDING is carried
    // by the line its address points at.
    const FIG_RECORD = {
      kind: "axis",
      elements: {
        endpoint_a: { text: "the harness renders the recovery input", ground: "g1" },
        endpoint_b: { text: "the reviewer never reads the packet that produced the prose",
          ground: "g2" },
        criterion: { text: "the recovery input is rendered before any record is accepted",
          ground: "g1" },
      },
      relations: ["the two endpoints sit on the criterion"],
      emphasis: "endpoint_a",
      caption: "The reader knows which act renders the input.",
      position: "after",
    };
    const fdraft = buildDraft(fdir, { packetDir: fPacketDir, figures: { a1: { record: FIG_RECORD } } });
    // `--workspace` IS A BASE AND THE SLUG IS JOINED ONTO IT, which is the
    // reading `workspaceFor` gives the flag; the run directory is therefore the
    // base plus this Draft's own slug, and reading the base would read a
    // directory nothing writes.
    const FWS_BASE = join(root, "fws");
    const FWS = join(FWS_BASE, "fig");
    const fdrive = (...a) => spawnSync(process.execPath,
      [self, a[0], "--draft", fdraft.path, "--workspace", FWS_BASE, ...a.slice(1)], { encoding: "utf8" });

    const o = fdrive("open");
    ok("#880: a Draft carrying a figure opens", o.status === 0);
    const input = readOrEmpty(join(FWS, "pass-1", "recovery", "a1.md"));

    // AC1 — THE RECOVERY INPUT SHOWS THE FENCE AND THE CAPTION.
    ok("#880 AC1: the blind recovery input carries the figure's fence",
      input.includes("```mermaid") && input.includes("flowchart LR"));
    ok("#880 AC1: and its caption",
      input.includes(FIG_RECORD.caption));
    ok("#880 AC1: with its own draft line numbers, so the reader can see where it sits",
      new RegExp(`^\\s*${fdraft.figureRanges.a1[0] + fdraft.bodyOffset} \\| \`\`\`mermaid$`, "m").test(input));

    // AC1 — AND NO STRING THAT OCCURS ONLY IN THE RECORD FILE. The element→
    // ground BINDING is that string: it is the whole of what the record adds
    // over the rendering, and a reviewer shown it would name the elements the
    // record names — which would make `figure-element-ground` a check of the
    // record against itself.
    //
    // THE POSITION WORD IS DELIBERATELY NOT ASSERTED HERE, and saying so is the
    // point: `before`/`after` are ordinary English that the reviewer's own
    // instruction uses, so an absence case on them would assert about the
    // template's wording rather than about the record. What the reviewer may
    // see of the placement is the LINE NUMBERS, which are the article's fact.
    ok("#880 AC1: and no element's ground binding reaches the blind reviewer",
      !/ground: g\d/.test(input) && !/"ground"/.test(input));
    // THE RELATIONS ARE NOT AMONG THEM, and that is the renderer rather than an
    // oversight: every relation reaches the output as an edge label, so a
    // relation string is the ARTICLE'S and not the record's. What the record
    // has and the rendering does not is the JSON itself — the field names that
    // carry the bindings — and that is what is asserted.
    ok("#880 AC1: nor does the record's own JSON reach it",
      !input.includes('"ground"') && !input.includes('"elements"')
      && !input.includes('"relations"') && !input.includes('"emphasis"'));

    // The eighth field is OWED here and REFUSED on a figureless Step, which is
    // the conditional closed set working in both directions.
    ok("#880: the recovery input asks for `figure_reading` on a figure Step",
      /`figure_reading`/.test(input) && /`shows`/.test(input)
      && /`reader_state_after` — what you hold after looking/.test(input));
    ok("#880: and says the record has EIGHT fields rather than seven",
      /\*\*These eight are the whole record/.test(input));
    ok("#880: while a figureless Step's input asks for neither",
      !readOrEmpty(join(WS, "pass-1", "recovery", "a1.md")).includes("figure_reading")
      && /\*\*These seven are the whole record/.test(readOrEmpty(join(WS, "pass-1", "recovery", "a1.md"))));

    const FIG_READING = {
      shows: "two endpoints sitting on a criterion about when the input is rendered",
      elements: ["the harness rendering the recovery input",
        "the reviewer not reading the packet", "the criterion they sit on"],
      reader_state_after: "The reader knows which act renders the input.",
    };
    // THE RECOVERED CLAIMS PAIR WITH THE STEP'S OWN GROUNDS, deliberately. The
    // figure cases below turn on which PRESERVED item fails, so a fixture whose
    // claims paired with nothing would fail `grounds` on every Step and make
    // every figure routing case assert against a Draft that was failing for a
    // reason unrelated to its figure. Each claim is a paraphrase rather than
    // the ground's own wording — enough content-word overlap to pair, short of
    // the verbatim run `packet-wording` refuses.
    const CLAIMS = {
      a1: ["The harness renders the recovery input before a record is accepted.",
        "The reviewer never reads the packet which produced this prose."],
      a2: ["The session cannot get an ordering the harness owns wrong."],
      a3: ["The owner classifies a residue line, never the tool."],
    };
    const claimsFor = (id, ranges, offset) => CLAIMS[id].map((claim) => ({
      claim, span: [ranges[id][0] + offset, ranges[id][0] + offset],
    }));
    const recFor = (id, extra = {}) => ({
      claims: claimsFor(id, fdraft.ranges, fdraft.bodyOffset),
      reader_state_after: "The reader knows which act renders the input.",
      purpose: "To open the claim.",
      terms_introduced: [], shape: "It opens.", concessions: [], restates: [],
      ...extra,
    });
    const wrote = (obj) => {
      const f = join(root, "fig-recovered.json");
      writeFileSync(f, JSON.stringify(obj) + "\n");
      return f;
    };

    const rNo = fdrive("recover", "--step", "a1", "--file", wrote(recFor("a1")));
    ok("#880: a figure Step's record without `figure_reading` refuses, naming the field",
      rNo.status === 1 && /is missing `figure_reading`, which this Step owes/.test(rNo.stderr));

    const rBad = fdrive("recover", "--step", "a1", "--file",
      wrote(recFor("a1", { figure_reading: { shows: "x", elements: [], reader_state_after: "y" } })));
    ok("#880: an empty `elements` refuses — a reader who named nothing did not look",
      rBad.status === 1 && /`figure_reading`\.elements carries 0 entries and needs at least 1/.test(rBad.stderr));

    const rExtra = fdrive("recover", "--step", "a1", "--file",
      wrote(recFor("a1", { figure_reading: { ...FIG_READING, confidence: "high" } })));
    ok("#880: a field inside `figure_reading` the schema does not declare refuses by name",
      rExtra.status === 1 && /`figure_reading`\.confidence is not one of the fields/.test(rExtra.stderr));

    const rOk = fdrive("recover", "--step", "a1", "--file",
      wrote(recFor("a1", { figure_reading: FIG_READING })));
    ok("#880: and the record with a reading of the figure is recorded", rOk.status === 0);

    // The eighth field on a Step that met no figure is refused, and the refusal
    // says WHY it is refused rather than reporting it as an unnamed key: an
    // invented reading and a stray annotation are different mistakes.
    const rUnowed = fdrive("recover", "--step", "a2", "--file",
      wrote(recFor("a2", { figure_reading: FIG_READING })));
    ok("#880: `figure_reading` on a Step that met no figure refuses, saying it is not owed",
      rUnowed.status === 1 && /which this Step does not owe/.test(rUnowed.stderr)
      && /is an invention, not a recovery/.test(rUnowed.stderr));

    ok("#880: a2 recovers without it", fdrive("recover", "--step", "a2", "--file", wrote(recFor("a2"))).status === 0);
    ok("#880: a3 recovers without it", fdrive("recover", "--step", "a3", "--file", wrote(recFor("a3"))).status === 0);

    const led = join(root, "fig-led.json");
    writeFileSync(led, JSON.stringify({ question: "which act renders the input", belief: "the harness does" }) + "\n");
    fdrive("read", "--section", "1", "--file", led);
    fdrive("read", "--section", "2", "--file", led);
    const clm = join(root, "fig-claim.json");
    writeFileSync(clm, JSON.stringify({ claim: "the harness owns the ordering" }) + "\n");
    fdrive("read", "--claim", "--file", clm);

    const c = fdrive("compare");
    ok("#880: the comparison runs over the figure Draft", c.status === 0);
    const frec = JSON.parse(readOrEmpty(join(FWS, "pass-1", "join.json")) || "{}");
    const ITEMS_ALL = JSON.parse(readFileSync(join(dirname(self), "review-items.json"), "utf8"));
    const FIG_IDS = new Set(ITEMS_ALL.items.filter((i) => i.figure_only).map((i) => i.id));

    // The figure rows exist on the Step that has a figure and NOWHERE ELSE —
    // AC3 asserted from the other side, on a Draft that does have one.
    const figRows = (frec.results || []).filter((r) => FIG_IDS.has(r.item));
    ok("#880: every figure item is computed on the Step that carries a figure",
      [...FIG_IDS].every((id) => figRows.some((r) => r.step_id === "a1" && r.item === id)));
    ok("#880 AC3: and on no other Step, even in a Draft that has one",
      figRows.every((r) => r.step_id === "a1"));

    // The mechanical row costs no model call and the judged ones do — the same
    // property the prose half asserts, over the figure's own rows.
    ok("#880: the element-to-ground row is decided by the Harness alone",
      (frec.mechanical || []).some((m) => m.step_id === "a1" && m.item === "figure-element-ground")
      && !(frec.model_calls || []).some((m) => m.item === "figure-element-ground"));
    ok("#880: and every judged figure row renders one join Packet",
      ITEMS_ALL.items.filter((i) => i.figure_only && i.mode === "judged")
        .every((i) => (frec.model_calls || []).some((m) => m.step_id === "a1" && m.item === i.id)));

    // The join Packet names the RECORD as the carrier the declared line came
    // from, never the Packet — the finding a reader repairs is in the record.
    const fp = (frec.owed || []).find((o) => o.item === "figure-elements");
    const fpText = fp ? readOrEmpty(fp.packet) : "";
    ok("#880: a figure join Packet says its declared side came from the figure record",
      /### What the figure record DECLARED/.test(fpText));
    ok("#880: and quotes the figure beside the prose, so the judged pair can see it",
      fpText.includes("```mermaid"));

    ok("#880: the element-to-ground row holds when every element is worded from its ground",
      (figRows.find((r) => r.item === "figure-element-ground") || {}).verdict === "holds");

    // AC2 — REPLACING AN ELEMENT'S TEXT WITH WORDING ITS GROUND DOES NOT CARRY
    // YIELDS EXACTLY ONE MECHANICAL FAIL ON THAT ITEM. Built as a second Draft
    // from the same fixture, mutating the record and nothing else.
    {
      const mdir = join(root, "fig-mut");
      const mPacketDir = join(mdir, "packets");
      mkdirSync(mPacketDir, { recursive: true });
      for (const id of ["a1", "a2", "a3"]) writePacket(mPacketDir, id);
      const mutated = JSON.parse(JSON.stringify(FIG_RECORD));
      mutated.elements.endpoint_b.text = "harbours and tides under a shifting weather front";
      const mdraft = buildDraft(mdir, { packetDir: mPacketDir, figures: { a1: { record: mutated } } });
      const MWS_BASE = join(root, "fig-mut-ws");
      const MWS = join(MWS_BASE, "fig-mut");
      const mdrive = (...a) => spawnSync(process.execPath,
        [self, a[0], "--draft", mdraft.path, "--workspace", MWS_BASE, ...a.slice(1)], { encoding: "utf8" });
      mdrive("open");
      const mrecFor = (id, extra = {}) => ({
        claims: claimsFor(id, mdraft.ranges, mdraft.bodyOffset),
        reader_state_after: "The reader knows which act renders the input.",
        purpose: "To open the claim.",
        terms_introduced: [], shape: "It opens.", concessions: [], restates: [],
        ...extra,
      });
      const mwrote = (obj) => {
        const f = join(root, "fig-mut-recovered.json");
        writeFileSync(f, JSON.stringify(obj) + "\n");
        return f;
      };
      mdrive("recover", "--step", "a1", "--file", mwrote(mrecFor("a1", { figure_reading: FIG_READING })));
      mdrive("recover", "--step", "a2", "--file", mwrote(mrecFor("a2")));
      mdrive("recover", "--step", "a3", "--file", mwrote(mrecFor("a3")));
      mdrive("read", "--section", "1", "--file", led);
      mdrive("read", "--section", "2", "--file", led);
      mdrive("read", "--claim", "--file", clm);
      const mc = mdrive("compare");
      ok("#880 AC2: the mutated Draft compares", mc.status === 0);
      // The judged pairs are answered so the join FILLS: the mechanical fail
      // below is decided in phase one either way, but `correct` is reachable
      // only from a completed pass one, and the seat case further down is about
      // where a figure fail routes rather than about an unfilled join.
      {
        const rec0 = JSON.parse(readOrEmpty(join(MWS, "pass-1", "join.json")) || "{}");
        const owed = [...(rec0.owed || []), ...((rec0.sections || {}).owed || [])];
        const vf = join(root, "fig-mut-verdicts.json");
        writeFileSync(vf, JSON.stringify({
          verdicts: owed.map((o) => ({
            step_id: o.step_id, item: o.item,
            ...(o.pair === null || o.pair === undefined ? {} : { pair: o.pair }),
            ...(o.section === undefined ? {} : { section: o.section }),
            verdict: "holds", reason: "it agrees", model: JUDGE_MODEL,
          })),
        }, null, 2) + "\n");
        ok("#880 AC2: and fills once every judged pair is answered",
          mdrive("compare", "--verdicts", vf).status === 0);
      }
      const mrec = JSON.parse(readOrEmpty(join(MWS, "pass-1", "join.json")) || "{}");
      const mechFails = (mrec.results || [])
        .filter((r) => r.verdict === "fails" && r.decided_by === "harness" && FIG_IDS.has(r.item));
      ok("#880 AC2: exactly one mechanical figure fail, on the element-to-ground item",
        mechFails.length === 1 && mechFails[0].item === "figure-element-ground"
        && mechFails[0].step_id === "a1",
        `saw ${mechFails.length}: ${mechFails.map((f) => `${f.step_id}/${f.item}`).join(", ") || "(none)"}`);
      // READ THROUGH A DEFAULT, because a mutation that removes the fail is
      // exactly what this case is for and indexing into an empty array would
      // take the whole pass down with it — a crash reports no case count at
      // all, which the check reads as "the pass did not run" rather than as
      // "this case failed". Found by running that mutation.
      const mechFail = mechFails[0] || {};
      ok("#880 AC2: and it names the element and its ground rather than a score",
        /worded in terms its bound ground does not carry/.test(mechFail.reason || "")
        && (mechFail.evidence || []).some((e) => e.includes("endpoint_b")));
      ok("#880 AC2: the fail costs no model call — it is decided from string facts",
        !(mrec.model_calls || []).some((m) => m.item === "figure-element-ground"));
      ok("#880 AC2: and it is a PRESERVED fail, so it sends its Step to correction",
        mechFail.class === "preserved");

      // An element whose address points past the Step's grounds fails BEFORE
      // containment is computed — a record carrying one was written against a
      // Brief this Draft was not emitted from, and scoring it against whatever
      // sits at that index would be an answer about nothing.
      const udir = join(root, "fig-unbound");
      const uPacketDir = join(udir, "packets");
      mkdirSync(uPacketDir, { recursive: true });
      for (const id of ["a1", "a2", "a3"]) writePacket(uPacketDir, id);
      const unbound = JSON.parse(JSON.stringify(FIG_RECORD));
      unbound.elements.criterion.ground = "g9";
      const udraft = buildDraft(udir, { packetDir: uPacketDir, figures: { a1: { record: unbound } } });
      const UWS_BASE = join(root, "fig-unbound-ws");
      const UWS = join(UWS_BASE, "fig-unbound");
      const udrive = (...a) => spawnSync(process.execPath,
        [self, a[0], "--draft", udraft.path, "--workspace", UWS_BASE, ...a.slice(1)], { encoding: "utf8" });
      udrive("open");
      const urecFor = (id, extra = {}) => ({
        claims: claimsFor(id, udraft.ranges, udraft.bodyOffset),
        reader_state_after: "s", purpose: "p", terms_introduced: [], shape: "s",
        concessions: [], restates: [], ...extra,
      });
      const uwrote = (obj) => {
        const f = join(root, "fig-unbound-recovered.json");
        writeFileSync(f, JSON.stringify(obj) + "\n");
        return f;
      };
      udrive("recover", "--step", "a1", "--file", uwrote(urecFor("a1", { figure_reading: FIG_READING })));
      udrive("recover", "--step", "a2", "--file", uwrote(urecFor("a2")));
      udrive("recover", "--step", "a3", "--file", uwrote(urecFor("a3")));
      udrive("read", "--section", "1", "--file", led);
      udrive("read", "--section", "2", "--file", led);
      udrive("read", "--claim", "--file", clm);
      udrive("compare");
      const urec = JSON.parse(readOrEmpty(join(UWS, "pass-1", "join.json")) || "{}");
      const ufail = (urec.results || []).find((r) => r.item === "figure-element-ground");
      ok("#880: an element whose ground address points past this Step's grounds fails by name",
        ufail && ufail.verdict === "fails"
        && /ground address does not resolve against this Step's grounds/.test(ufail.reason)
        && (ufail.evidence || []).some((e) => /the address points past them/.test(e)));
    }

    // THE FIGURE CORRECTION IS THE SEAT A FIGURE FAIL ROUTES TO, and `correct`
    // without `--figure` refuses it by naming the other seat rather than
    // reporting a Step with nothing owed.
    {
      const rWrong = spawnSync(process.execPath,
        [self, "correct", "--draft", join(root, "fig-mut", "draft.md"), "--workspace", join(root, "fig-mut-ws"), "--step", "a1"],
        { encoding: "utf8" });
      ok("#880: `correct` without --figure on a figure-only fail names the figure seat",
        rWrong.status === 1 && /--figure/.test(rWrong.stderr)
        && /the figure record, not the prose/.test(rWrong.stderr));
    }

    // The trace's own pins are checked on the figure exactly as on the Packet:
    // a record edited after emit makes every figure finding meaningless, so it
    // refuses rather than reporting findings nobody can act on.
    {
      const edir = join(root, "fig-edited");
      const ePacketDir = join(edir, "packets");
      mkdirSync(ePacketDir, { recursive: true });
      for (const id of ["a1", "a2", "a3"]) writePacket(ePacketDir, id);
      const edraft = buildDraft(edir, { packetDir: ePacketDir, figures: { a1: { record: FIG_RECORD } } });
      const rp = join(edir, "figure-a1.json");
      const edited = JSON.parse(readFileSync(rp, "utf8"));
      edited.caption = "A caption nobody validated.";
      writeFileSync(rp, JSON.stringify(edited, null, 2) + "\n");
      const r = spawnSync(process.execPath,
        [self, "open", "--draft", edraft.path, "--workspace", join(root, "fig-edited-ws")], { encoding: "utf8" });
      ok("#880: a figure record edited after emit refuses, naming both shas",
        r.status === 1 && /the figure record's sha differs from the trace's/.test(r.stderr));
      rmSync(rp);
      const r2 = spawnSync(process.execPath,
        [self, "open", "--draft", edraft.path, "--workspace", join(root, "fig-edited-ws2")], { encoding: "utf8" });
      ok("#880: and an absent figure record refuses with the act that re-records it",
        r2.status === 1 && /the figure record the trace names is absent/.test(r2.stderr)
        && /draft\.mjs figure/.test(r2.stderr));
    }
  }

  // ---- kogaki#880, the correction half, END TO END --------------------------
  // A REAL Brief, a real Move with a `visual_form`, the realization lane, a
  // validated figure record and the emitted Draft — driven through the review
  // to a figure fail and out through `correct --figure`. Nothing here is
  // stubbed, for the reason the prose correction's own drive gives: the acts
  // under test are `draft.mjs figure` re-validating the record and `emit`
  // re-rendering the block from it, and a stand-in for either would let this
  // pass assert that the renderer re-ran when nothing ran.
  //
  // ITS OWN BRIEF, not the correction fixture's. That one's cases assert counts
  // over four Steps and two Sections, and adding a figure to it would move
  // those numbers for a reason unrelated to what they measure.
  {
    const draftCli = join(dirname(self), "draft.mjs");
    const gRoot = join(root, "figure-correction");
    const gBrief = join(gRoot, "theses", "figure-fixture");
    const gMoves = join(gRoot, "moves");
    const gWs = join(gRoot, "ws-draft");
    mkdirSync(gBrief, { recursive: true });
    mkdirSync(gMoves, { recursive: true });
    // ONE MOVE CARRIES A FORM AND THE OTHER DOES NOT, so the Draft has a Step
    // that may declare a figure and a Step that may not — which is what makes
    // the figureless half of every case below a fact about this Draft rather
    // than an absence nobody constructed.
    writeFileSync(join(gMoves, "axis_move.md"), [
      "id: axis_move", "status: observed",
      "intent: >-", "  establish a distinction between two endpoints.",
      "requires: >-", "  the reader has no stable distinction yet.",
      "effect: >-", "  the reader can orient later cases on the axis.",
      "constraints: >-", "  the endpoints must clarify the same axis.",
      "failure_modes: >-", "  pairing cases that differ along unrelated dimensions.",
      "excerpt: >-", "  the author's account of the movement they observed.",
      "visual_form:", "  kind: axis",
      "  endpoint_a: the first endpoint the Move presents",
      "  endpoint_b: the opposing endpoint",
      "  criterion: the one axis both endpoints clarify",
    ].join("\n") + "\n");
    writeFileSync(join(gMoves, "plain_move.md"), [
      "id: plain_move", "status: observed",
      "intent: >-", "  carry the claim one step further.",
      "requires: >-", "  the reader holds what the previous passage settled.",
      "effect: >-", "  the reader holds one more consequence.",
      "constraints: >-", "  never re-open what the earlier passage settled.",
      "failure_modes: >-", "  restating the previous passage in new words.",
      "excerpt: >-", "  the author's account of the movement they observed.",
    ].join("\n") + "\n");

    const gBriefText = [
      "# Brief — figure-fixture", "",
      "*Survey pin:* `product-lab@0000000000000000000000000000000000000000`", "",
      "## Strands", "",
      "### L1 — first-strand", "",
      "- cite: `gloss/ELEMENTS.jsonl slug=first-strand kind=lesson @0000000000000000000000000000000000000000`", "",
      "## Thesis", "", "The fixture claim.", "",
      "## Reader start", "", "The reader believes the fixture claim is obvious.", "",
      "## Reader target", "", "The reader can say why the fixture claim is not obvious.", "",
      "## Opening question", "", "What makes the fixture claim worth stating?", "",
      "## Sequence", "",
      "```step", "step_id: f1", "move: axis_move", "opens_section: The only heading",
      "purpose: the job f1 does.",
      "reader_state_before: the reader arrives at f1 holding nothing in particular.",
      "reader_state_after: the reader leaves f1 able to say what separates the two harbours.",
      "materials: L1",
      "rationale: f1 sits here because the path put it here.",
      "figure: it lets the reader hold both harbours against the one tide that separates them",
      "figure_roles: endpoint_a=g1, endpoint_b=g2, criterion=g3",
      "ground (strand L1): the first harbour keeps its own hours.",
      "ground (strand L1): the second harbour keeps different hours.",
      "ground (strand L1): the tide is the one measure both harbours are read against.",
      "```", "",
      "```step", "step_id: f2", "move: plain_move",
      "purpose: the job f2 does.",
      "reader_state_before: the reader arrives at f2 holding what f1 settled.",
      "reader_state_after: the reader leaves f2 able to say who did the measuring.",
      "materials: L1",
      "rationale: f2 sits here because the path put it here.",
      "ground (strand L1): a table records what somebody measured on days somebody chose.",
      "```", "",
    ].join("\n");
    writeFileSync(join(gBrief, "brief.md"), gBriefText);

    const gdl = (cmd, ...extra) => spawnSync(process.execPath,
      [draftCli, cmd, "--brief", join(gBrief, "brief.md"), "--workspace", gWs, "--moves-dir", gMoves, ...extra],
      { encoding: "utf8" });
    const gFile = (name, text) => {
      const f = join(gRoot, name);
      writeFileSync(f, text + "\n");
      return f;
    };

    // The FIRST record's endpoint_b is worded from a ground it is NOT bound to,
    // which is what `figure-element-ground` refuses — the fail this whole drive
    // exists to route.
    const RECORD_BAD = {
      kind: "axis",
      elements: {
        endpoint_a: { text: "the first harbour keeps its own hours", ground: "g1" },
        endpoint_b: { text: "a table records what somebody measured on chosen days", ground: "g2" },
        criterion: { text: "the tide both harbours are read against", ground: "g3" },
      },
      relations: ["the two harbours sit on the tide"],
      caption: "The reader knows what separates the two harbours.",
      position: "after",
    };

    let ready = gdl("resolve").status === 0;
    ready = ready && gdl("section", "--step", "f1", "--file", gFile("prose-f1.md",
      "One harbour keeps its own hours and the next keeps others, and the water they are both "
      + "read against is the same water.")).status === 0;
    const rFig = gdl("figure", "--step", "f1", "--file",
      gFile("record-f1.json", JSON.stringify(RECORD_BAD, null, 2)));
    ready = ready && rFig.status === 0;
    ready = ready && gdl("section", "--step", "f2", "--file", gFile("prose-f2.md",
      "A skipper reading either set of hours is reading a measurement, and the question worth "
      + "asking is who was standing there.")).status === 0;
    const gEmit = gdl("emit");
    ready = ready && gEmit.status === 0;
    const gDraft = join(gBrief, "draft.md");
    ok("#880: the realization lane produces a Draft whose Step carries a validated figure",
      ready && existsSync(gDraft));

    const gwsBase = join(gRoot, "ws-review");
    const gWsRun = join(gwsBase, "figure-fixture");
    const GD = (...a) => spawnSync(process.execPath,
      [self, ...a, "--draft", gDraft, "--workspace", gwsBase,
        "--draft-workspace", gWs, "--moves-dir", gMoves], { encoding: "utf8" });

    ok("#880: ReviewDraft opens it", GD("open").status === 0);
    const gTrace = () => JSON.parse(readOrEmpty(join(gWsRun, "run.json")) || "{}").steps || [];
    // Claims that PAIR with each Step's own grounds, for the reason the
    // synthetic drive above gives: this drive turns on which preserved item
    // fails, and a claim pairing with nothing would fail `grounds` on every
    // Step and route the corrections for a reason unrelated to the figure.
    const G_CLAIMS = {
      f1: "The first harbour keeps its own hours and the second keeps different ones.",
      f2: "A table records a measurement somebody made on days somebody picked.",
    };
    const gRecFor = (id, tag, extra = {}) => {
      const st = gTrace().find((s) => s.step_id === id);
      const f = join(gRoot, `rec-${tag}-${id}.json`);
      writeFileSync(f, JSON.stringify({
        claims: [{ claim: G_CLAIMS[id], span: st.lines }],
        reader_state_after: `the reader leaves ${id} able to say what it settled`,
        purpose: `the job ${id} does`,
        terms_introduced: [], shape: "It states a thing and moves on.",
        concessions: [], restates: [], ...extra,
      }, null, 2) + "\n");
      return f;
    };
    const gReading = {
      shows: "two harbours placed on the tide they are both read against",
      elements: ["the first harbour", "a table of measurements", "the tide"],
      reader_state_after: "The reader knows what separates the two harbours.",
    };
    ok("#880: the figure Step recovers with a reading of the block",
      GD("recover", "--step", "f1", "--file", gRecFor("f1", "p1", { figure_reading: gReading })).status === 0);
    ok("#880: and the Step with no figure recovers without one",
      GD("recover", "--step", "f2", "--file", gRecFor("f2", "p1")).status === 0);
    const gLed = gFile("led.json", JSON.stringify({ question: "what separates the harbours", belief: "the tide does" }));
    const gClaim = gFile("claim.json", JSON.stringify({ claim: "the tide is the measure" }));
    GD("read", "--section", "1", "--file", gLed);
    GD("read", "--claim", "--file", gClaim);
    GD("compare");
    const gJoin = join(gWsRun, "pass-1", "join.json");
    const gAnswer = (tag) => {
      const rec0 = JSON.parse(readOrEmpty(gJoin) || "{}");
      const owed = [...(rec0.owed || []), ...((rec0.sections || {}).owed || [])];
      return gFile(`verdicts-${tag}.json`, JSON.stringify({
        verdicts: owed.map((o) => ({
          step_id: o.step_id, item: o.item,
          ...(o.pair === null || o.pair === undefined ? {} : { pair: o.pair }),
          verdict: "holds", reason: "the declared line and the recovered one agree",
          model: JUDGE_MODEL,
        })),
      }, null, 2));
    };
    const gp1 = GD("compare", "--verdicts", gAnswer("p1"));
    ok("#880: pass one completes and sends the figure-failing Step to correction",
      gp1.status === 0 && /Steps sent to correction[^\n]*f1/.test(gp1.stdout));

    // Phase A — the figure correction input.
    const gcA = GD("correct", "--step", "f1", "--figure");
    const gcInput = readOrEmpty(join(gWsRun, "pass-1", "corrections", "f1.figure.md"));
    ok("#880: `correct --figure` renders a figure correction input", gcA.status === 0 && gcInput !== "");
    ok("#880: it carries the previous record verbatim",
      gcInput.includes('"endpoint_b"') && gcInput.includes(RECORD_BAD.elements.endpoint_b.text));
    ok("#880: and the block as the reader currently meets it",
      gcInput.includes("```mermaid"));
    ok("#880: and the finding that failed, with the element and the ground it names",
      /figure-element-ground/.test(gcInput) && /worded in terms its bound ground does not carry/.test(gcInput));
    ok("#880: and the instruction that the record's kind and roles are not the correction's to change",
      /Keep the record's/.test(gcInput) && /`kind`/.test(gcInput));
    ok("#880: while the run is mid-correction on that Step",
      GD("compare").status === 1);

    // Phase B — the corrected record goes through `draft.mjs figure` and `emit`.
    const RECORD_GOOD = JSON.parse(JSON.stringify(RECORD_BAD));
    RECORD_GOOD.elements.endpoint_b.text = "the second harbour keeps different hours";
    const gcB = GD("correct", "--step", "f1", "--figure", "--file",
      gFile("record-f1-corrected.json", JSON.stringify(RECORD_GOOD, null, 2)));
    ok("#880: the corrected record is recorded through the realization lane", gcB.status === 0);
    ok("#880: and the run reports the record sha moving", /record  \w{16}/.test(gcB.stdout));
    ok("#880: and reports whether the rendered block moved, never gating on it",
      /the rendered block differs from the one the reader met/.test(gcB.stdout)
      && /never gated/.test(gcB.stdout));

    // THE RENDERER RE-RAN BY CONSTRUCTION: the Draft's own bytes now carry the
    // corrected element, and nothing in this pass wrote any Mermaid.
    const gAfter = readOrEmpty(gDraft);
    ok("#880: the emitted Draft carries the corrected element in its rendered block",
      gAfter.includes("the second harbour keeps different hours")
      && !gAfter.includes(RECORD_BAD.elements.endpoint_b.text));

    // Pass two re-recovers the corrected Step and re-judges its figure items.
    // `check` is what RENDERS that recovery input — the corrected Step's own
    // recovery was discarded by the correction, and the reviewer reads the
    // block as it now stands rather than the one it read before.
    const gChk0 = GD("check");
    ok("#880: `check` re-renders the corrected Step's recovery input",
      gChk0.status === 1 && /f1/.test(gChk0.stderr));
    const gRe = GD("recover", "--step", "f1", "--file", gRecFor("f1", "p2", { figure_reading: gReading }));
    ok("#880: the corrected Step's recovery is discarded and re-run", gRe.status === 0);
    GD("check");
    // Pass two answers its OWN owed pairs, through `check --verdicts` and never
    // through `compare`'s — the two records are separate by design.
    const gChkOwed = () => {
      const rec0 = JSON.parse(readOrEmpty(join(gWsRun, "pass-2", "check.json")) || "{}");
      return [...(rec0.owed || []), ...((rec0.sections || {}).owed || [])];
    };
    const gChk = GD("check", "--verdicts", gFile("verdicts-p2.json", JSON.stringify({
      verdicts: gChkOwed().map((o) => ({
        step_id: o.step_id, item: o.item,
        ...(o.pair === null || o.pair === undefined ? {} : { pair: o.pair }),
        verdict: "holds", reason: "the declared line and the recovered one agree",
        model: JUDGE_MODEL,
      })),
    }, null, 2)));
    ok("#880: pass two completes over the corrected figure", gChk.status === 0);
    const gChkRec = JSON.parse(readOrEmpty(join(gWsRun, "pass-2", "check.json")) || "{}");
    ok("#880: and the element-to-ground row now holds",
      (gChkRec.results || []).some((r) => r.step_id === "f1"
        && r.item === "figure-element-ground" && r.verdict === "holds" && !r.carried));
    const gClose = GD("close");
    const gReview = readOrEmpty(join(gBrief, "review.md"));
    ok("#880: the owner record closes", gClose.status === 0 && gReview !== "");
    ok("#880: and no figure item survives as residue — the correction discharged it",
      !/figure-element-ground/.test(gReview.slice(gReview.indexOf("## Residue"))));
    ok("#880: while the figure correction itself is recorded, naming the seat it repaired",
      /f1/.test(gReview) && /figure record re-designed/.test(gReview));
  }

  // ---- kogaki#945 -----------------------------------------------------------
  // THE SEAT-BLIND UNCORRECTED REPORT, AND THE BLIND INPUT'S FIGURE PLACEMENT.
  // Two findings carried out of PR #944 round 1, asserted here rather than left
  // as the comments they were reported against.
  //
  // ITS OWN BRIEF, for the reason the #880 drive states about its own: the
  // drives above turn on which preserved item fails, and adding a second
  // failing seat to one of them would move cases that measure something else.
  // This one is built so that f1 owes BOTH seats — a mechanical
  // `figure-element-ground` fail from a record worded off its bound ground, and
  // a `reader-state-after` fail supplied as a verdict — which is the shape the
  // report could not see.
  {
    const draftCli = join(dirname(self), "draft.mjs");
    const sRoot = join(root, "seat-report");
    const sBrief = join(sRoot, "theses", "seat-fixture");
    const sMoves = join(sRoot, "moves");
    const sWs = join(sRoot, "ws-draft");
    mkdirSync(sBrief, { recursive: true });
    mkdirSync(sMoves, { recursive: true });
    writeFileSync(join(sMoves, "axis_move.md"), [
      "id: axis_move", "status: observed",
      "intent: >-", "  establish a distinction between two endpoints.",
      "requires: >-", "  the reader has no stable distinction yet.",
      "effect: >-", "  the reader can orient later cases on the axis.",
      "constraints: >-", "  the endpoints must clarify the same axis.",
      "failure_modes: >-", "  pairing cases that differ along unrelated dimensions.",
      "excerpt: >-", "  the author's account of the movement they observed.",
      "visual_form:", "  kind: axis",
      "  endpoint_a: the first endpoint the Move presents",
      "  endpoint_b: the opposing endpoint",
      "  criterion: the one axis both endpoints clarify",
    ].join("\n") + "\n");
    writeFileSync(join(sMoves, "plain_move.md"), [
      "id: plain_move", "status: observed",
      "intent: >-", "  carry the claim one step further.",
      "requires: >-", "  the reader holds what the previous passage settled.",
      "effect: >-", "  the reader holds one more consequence.",
      "constraints: >-", "  never re-open what the earlier passage settled.",
      "failure_modes: >-", "  restating the previous passage in new words.",
      "excerpt: >-", "  the author's account of the movement they observed.",
    ].join("\n") + "\n");
    writeFileSync(join(sBrief, "brief.md"), [
      "# Brief — seat-fixture", "",
      "*Survey pin:* `product-lab@0000000000000000000000000000000000000000`", "",
      "## Strands", "",
      "### L1 — first-strand", "",
      "- cite: `gloss/ELEMENTS.jsonl slug=first-strand kind=lesson @0000000000000000000000000000000000000000`", "",
      "## Thesis", "", "The fixture claim.", "",
      "## Reader start", "", "The reader believes the fixture claim is obvious.", "",
      "## Reader target", "", "The reader can say why the fixture claim is not obvious.", "",
      "## Opening question", "", "What makes the fixture claim worth stating?", "",
      "## Sequence", "",
      "```step", "step_id: f1", "move: axis_move", "opens_section: The only heading",
      "purpose: the job f1 does.",
      "reader_state_before: the reader arrives at f1 holding nothing in particular.",
      "reader_state_after: the reader leaves f1 able to say what separates the two harbours.",
      "materials: L1",
      "rationale: f1 sits here because the path put it here.",
      "figure: it lets the reader hold both harbours against the one tide that separates them",
      "figure_roles: endpoint_a=g1, endpoint_b=g2, criterion=g3",
      "ground (strand L1): the first harbour keeps its own hours.",
      "ground (strand L1): the second harbour keeps different hours.",
      "ground (strand L1): the tide is the one measure both harbours are read against.",
      "```", "",
      "```step", "step_id: f2", "move: plain_move",
      "purpose: the job f2 does.",
      "reader_state_before: the reader arrives at f2 holding what f1 settled.",
      "reader_state_after: the reader leaves f2 able to say who did the measuring.",
      "materials: L1",
      "rationale: f2 sits here because the path put it here.",
      "ground (strand L1): a table records what somebody measured on days somebody chose.",
      "```", "",
    ].join("\n"));

    const sdl = (cmd, ...extra) => spawnSync(process.execPath,
      [draftCli, cmd, "--brief", join(sBrief, "brief.md"), "--workspace", sWs, "--moves-dir", sMoves, ...extra],
      { encoding: "utf8" });
    const sFile = (name, text) => {
      const f = join(sRoot, name);
      writeFileSync(f, text + "\n");
      return f;
    };
    // `position: after` — the figure sits BELOW the prose in the Draft, which is
    // the placement finding's whole subject.
    const S_RECORD = {
      kind: "axis",
      elements: {
        endpoint_a: { text: "the first harbour keeps its own hours", ground: "g1" },
        endpoint_b: { text: "a table records what somebody measured on chosen days", ground: "g2" },
        criterion: { text: "the tide both harbours are read against", ground: "g3" },
      },
      relations: ["the two harbours sit on the tide"],
      caption: "The reader knows what separates the two harbours.",
      position: "after",
    };
    let sReady = sdl("resolve").status === 0;
    sReady = sReady && sdl("section", "--step", "f1", "--file", sFile("s-prose-f1.md",
      "One harbour keeps its own hours and the next keeps others, and the water they are both "
      + "read against is the same water.")).status === 0;
    sReady = sReady && sdl("figure", "--step", "f1", "--file",
      sFile("s-record-f1.json", JSON.stringify(S_RECORD, null, 2))).status === 0;
    sReady = sReady && sdl("section", "--step", "f2", "--file", sFile("s-prose-f2.md",
      "A skipper reading either set of hours is reading a measurement, and the question worth "
      + "asking is who was standing there.")).status === 0;
    sReady = sReady && sdl("emit").status === 0;
    const sDraft = join(sBrief, "draft.md");
    ok("#945: the fixture Draft realizes with a figure below its Step's prose", sReady && existsSync(sDraft));

    const swsBase = join(sRoot, "ws-review");
    const sWsRun = join(swsBase, "seat-fixture");
    const SD = (...a) => spawnSync(process.execPath,
      [self, ...a, "--draft", sDraft, "--workspace", swsBase,
        "--draft-workspace", sWs, "--moves-dir", sMoves], { encoding: "utf8" });
    ok("#945: ReviewDraft opens it", SD("open").status === 0);

    // FINDING 3 — THE BLIND INPUT PLACES THE FIGURE WHERE THE READER MET IT.
    // The Draft puts the block below the prose, so the input must too. Asserted
    // by ORDER rather than by presence: the block was always present, and it was
    // always above, which is exactly the defect a presence case cannot see.
    const sInput = readOrEmpty(join(sWsRun, "pass-1", "recovery", "f1.md"));
    const iFig = sInput.indexOf("## The figure the reader met with this passage");
    const iPass = sInput.indexOf("## The passage — draft lines");
    ok("#945: the blind recovery input still carries the figure block",
      iFig !== -1 && sInput.includes("```mermaid"));
    ok("#945: and renders it BELOW the passage, the side the reader met it on",
      iFig !== -1 && iPass !== -1 && iFig > iPass,
      `figure at ${iFig}, passage at ${iPass}`);
    // THE SIDE IS READ FROM THE DRAFT, NOT FROM THE RECORD, and this is the case
    // that says so: the input must still leak nothing the record alone carries,
    // so a repair that arranged the page by reading `position` would fail here.
    // AND THE INSTRUCTION NAMES NO SIDE (PR #946 round 1, finding 1). The five
    // cases around this one assert by slot index, so every one of them stays
    // green while the prose beside the block tells the reviewer the passage is
    // on the other side of it. This asserts the words.
    ok("#947: and the figure section's instruction claims no arrangement of its own",
      iFig !== -1 && !/passage below/.test(sInput) && !/below\.\s*$/m.test(sInput.slice(iFig, iFig + 400)),
      sInput.slice(iFig, iFig + 260).replace(/\n/g, " / "));
    ok("#945: while leaking nothing the record alone holds",
      !/"ground"/.test(sInput) && !/"elements"/.test(sInput)
      && !/"position"/.test(sInput) && !/ground: g\d/.test(sInput));

    // The control: the same record placed BEFORE renders above the passage, so
    // the case above is bound to the placement and not to a constant.
    {
      const bRoot = join(sRoot, "before");
      const bBrief = join(bRoot, "theses", "seat-fixture");
      mkdirSync(bBrief, { recursive: true });
      writeFileSync(join(bBrief, "brief.md"), readFileSync(join(sBrief, "brief.md"), "utf8"));
      const bWs = join(bRoot, "ws-draft");
      const bdl = (cmd, ...extra) => spawnSync(process.execPath,
        [draftCli, cmd, "--brief", join(bBrief, "brief.md"), "--workspace", bWs, "--moves-dir", sMoves, ...extra],
        { encoding: "utf8" });
      const bFile = (name, text) => { const f = join(bRoot, name); writeFileSync(f, text + "\n"); return f; };
      mkdirSync(bRoot, { recursive: true });
      let bReady = bdl("resolve").status === 0;
      bReady = bReady && bdl("section", "--step", "f1", "--file", bFile("b-prose-f1.md",
        "One harbour keeps its own hours and the next keeps others, and the water they are both "
        + "read against is the same water.")).status === 0;
      bReady = bReady && bdl("figure", "--step", "f1", "--file",
        bFile("b-record-f1.json", JSON.stringify({ ...S_RECORD, position: "before" }, null, 2))).status === 0;
      bReady = bReady && bdl("section", "--step", "f2", "--file", bFile("b-prose-f2.md",
        "A skipper reading either set of hours is reading a measurement, and the question worth "
        + "asking is who was standing there.")).status === 0;
      bReady = bReady && bdl("emit").status === 0;
      const bDraft = join(bBrief, "draft.md");
      const bwsBase = join(bRoot, "ws-review");
      const bOpen = spawnSync(process.execPath,
        [self, "open", "--draft", bDraft, "--workspace", bwsBase,
          "--draft-workspace", bWs, "--moves-dir", sMoves], { encoding: "utf8" });
      const bInput = readOrEmpty(join(bwsBase, "seat-fixture", "pass-1", "recovery", "f1.md"));
      const bFig = bInput.indexOf("## The figure the reader met with this passage");
      const bPass = bInput.indexOf("## The passage — draft lines");
      ok("#945 control: a figure the reader met ABOVE the prose renders above it",
        bReady && bOpen.status === 0 && bFig !== -1 && bPass !== -1 && bFig < bPass,
        `figure at ${bFig}, passage at ${bPass}`);
    }

    // FINDING 1 — A STEP OWING BOTH SEATS AND RECEIVING ONE IS NAMED.
    const sTrace = () => JSON.parse(readOrEmpty(join(sWsRun, "run.json")) || "{}").steps || [];
    const S_CLAIMS = {
      f1: "The first harbour keeps its own hours and the second keeps different ones.",
      f2: "A table records a measurement somebody made on days somebody picked.",
    };
    const sRecFor = (id, tag, extra = {}) => {
      const st = sTrace().find((s) => s.step_id === id);
      const f = join(sRoot, `s-rec-${tag}-${id}.json`);
      writeFileSync(f, JSON.stringify({
        claims: [{ claim: S_CLAIMS[id], span: st.lines }],
        reader_state_after: `the reader leaves ${id} able to say what it settled`,
        purpose: `the job ${id} does`,
        terms_introduced: [], shape: "It states a thing and moves on.",
        concessions: [], restates: [], ...extra,
      }, null, 2) + "\n");
      return f;
    };
    SD("recover", "--step", "f1", "--file", sRecFor("f1", "p1", {
      figure_reading: {
        shows: "two harbours placed on the tide they are both read against",
        elements: ["the first harbour", "a table of measurements", "the tide"],
        reader_state_after: "The reader knows what separates the two harbours.",
      },
    }));
    SD("recover", "--step", "f2", "--file", sRecFor("f2", "p1"));
    SD("read", "--section", "1", "--file",
      sFile("s-led.json", JSON.stringify({ question: "what separates the harbours", belief: "the tide does" })));
    SD("read", "--claim", "--file", sFile("s-claim.json", JSON.stringify({ claim: "the tide is the measure" })));
    SD("compare");
    // THE PROSE SEAT IS FAILED BY A VERDICT and the figure seat by the record's
    // own wording, so f1 owes both. `reader-state-after` is a PRESERVED judged
    // item, which is what makes its fail route to correction rather than ride
    // along.
    const sAnswer = (tag, failProse) => {
      const rec0 = JSON.parse(readOrEmpty(join(sWsRun, "pass-1", "join.json")) || "{}");
      const owed = [...(rec0.owed || []), ...((rec0.sections || {}).owed || [])];
      return sFile(`s-verdicts-${tag}.json`, JSON.stringify({
        verdicts: owed.map((o) => {
          const fails = failProse && o.step_id === "f1" && o.item === "reader-state-after";
          return {
            step_id: o.step_id, item: o.item,
            ...(o.pair === null || o.pair === undefined ? {} : { pair: o.pair }),
            verdict: fails ? "fails" : "holds",
            reason: fails ? "the recovered reader state is not the one the Step declared" : "they agree",
            model: JUDGE_MODEL,
          };
        }),
      }, null, 2));
    };
    const sp1 = SD("compare", "--verdicts", sAnswer("p1", true));
    ok("#945: pass one completes with f1 owing BOTH seats",
      sp1.status === 0 && /Steps sent to correction[^\n]*f1/.test(sp1.stdout));

    // ONE SEAT IS CORRECTED — the passage, which the figure record's ordering requires
    // first — and the figure seat is deliberately left owed.
    const scA = SD("correct", "--step", "f1");
    ok("#945: the passage correction input renders", scA.status === 0);
    const scB = SD("correct", "--step", "f1", "--file", sFile("s-corrected-f1.md",
      "One harbour keeps its own hours and the next keeps others, and the single body of water "
      + "they are both read against is what the reader leaves holding."));
    ok("#945: and the passage correction is recorded, leaving the figure seat owed",
      scB.status === 0 && /\(--figure\)/.test(scB.stdout),
      scB.stdout.split("\n").slice(-6).join(" | "));

    // Pass two: re-run the corrected Step's blind recovery, then complete.
    SD("check");
    SD("recover", "--step", "f1", "--file", sRecFor("f1", "p2", {
      figure_reading: {
        shows: "two harbours placed on the tide they are both read against",
        elements: ["the first harbour", "a table of measurements", "the tide"],
        reader_state_after: "The reader knows what separates the two harbours.",
      },
    }));
    SD("check");
    const sChkOwed = () => {
      const rec0 = JSON.parse(readOrEmpty(join(sWsRun, "pass-2", "check.json")) || "{}");
      return [...(rec0.owed || []), ...((rec0.sections || {}).owed || [])];
    };
    const sp2 = SD("check", "--verdicts", sFile("s-verdicts-p2.json", JSON.stringify({
      verdicts: sChkOwed().map((o) => ({
        step_id: o.step_id, item: o.item,
        ...(o.pair === null || o.pair === undefined ? {} : { pair: o.pair }),
        verdict: "holds", reason: "the declared line and the recovered one agree",
        model: JUDGE_MODEL,
      })),
    }, null, 2)));
    // THE CASE THE REPORT COULD NOT PRODUCE. f1 carries a recorded correction,
    // so the Step-keyed read put it in `bound.corrected` and dropped it from
    // UNCORRECTED entirely — the run finished silent about a seat it had itself
    // routed to correction.
    ok("#945: pass two completes over the corrected passage", sp2.status === 0,
      `status ${sp2.status}: ${(sp2.stderr || "").split("\n")[0]}`);
    ok("#945: and UNCORRECTED names the seat still owed on a Step that received the other",
      /UNCORRECTED/.test(sp2.stdout) && /f1 \(--figure\)/.test(sp2.stdout),
      sp2.stdout.split("\n").filter((l) => /UNCORRECTED|f1/.test(l)).join(" | "));
    // AND IT SAYS WHICH SEAT, rather than naming the Step and leaving the reader
    // to work out which half is outstanding.
    ok("#945: the line tells the reader what `(--figure)` marks",
      /`\(--figure\)` is the figure seat/.test(sp2.stdout));
  }

  // ---- kogaki#996 -------------------------------------------------------
  // A STEP WHOSE PROSE FAITHFULLY REALIZES A TWO-GROUND PACKET, ASSERTING THAT
  // `grounds` HOLDS. `GROUNDS.a1` is the two-ground Packet; the claims below
  // are faithful realizations of its two lines in wholly different vocabulary,
  // so `pairClaims` assigns neither of them a ground.
  //
  // UNDER THE OLD FALLBACK THIS STEP FAILED BY CONSTRUCTION: an unpaired claim
  // was failed by the Harness as `widened` with no model call, so `grounds`
  // failed however faithful the prose was. That is what made the item's verdict
  // evidence about the matcher rather than about the Draft. Driven on its own
  // Draft — the cases above assert counts over the shared fixture, and a record
  // whose claims pair with nothing would move them.
  {
    const gdir = join(root, "grounds996");
    const gPacketDir = join(gdir, "packets");
    mkdirSync(gPacketDir, { recursive: true });
    for (const id of ["a1", "a2", "a3"]) writePacket(gPacketDir, id);
    const gdraft = buildDraft(gdir, { packetDir: gPacketDir });
    const GWS_BASE = join(root, "gws996");
    const GWS = join(GWS_BASE, "grounds996");
    const gdrive = (...a) => spawnSync(process.execPath,
      [self, a[0], "--draft", gdraft.path, "--workspace", GWS_BASE, ...a.slice(1)], { encoding: "utf8" });

    // Neither claim shares enough content words with either ground to reach the
    // 0.34 containment floor, and each is a faithful reading of one of them.
    const UNPAIRED = {
      a1: ["no submission is admitted until the tool has already drawn up its blind questionnaire",
        "whoever judges the writing is kept from seeing the brief behind it"],
      a2: ["a sequence the machinery owns cannot be mistaken by whoever sits at it"],
      a3: ["leftover text is sorted by the person in charge and never by the program"],
    };
    const gRec = (id) => ({
      claims: UNPAIRED[id].map((claim) => ({
        claim, span: [gdraft.ranges[id][0] + gdraft.bodyOffset, gdraft.ranges[id][0] + gdraft.bodyOffset],
      })),
      reader_state_after: "The reader knows which act renders the input.",
      purpose: "To open the claim.",
      terms_introduced: [], shape: "It opens.", concessions: [], restates: [],
    });
    gdrive("open");
    for (const id of ["a1", "a2", "a3"]) {
      const f = join(gdir, `rec-${id}.json`);
      writeFileSync(f, JSON.stringify(gRec(id)) + "\n");
      gdrive("recover", "--step", id, "--file", f);
    }
    const gled = join(gdir, "led.json");
    writeFileSync(gled, JSON.stringify({ question: "which act renders the input", belief: "the harness does" }) + "\n");
    gdrive("read", "--section", "1", "--file", gled);
    gdrive("read", "--section", "2", "--file", gled);
    const gclm = join(gdir, "claim.json");
    writeFileSync(gclm, JSON.stringify({ claim: "the harness owns the ordering" }) + "\n");
    gdrive("read", "--claim", "--file", gclm);

    const gc = gdrive("compare");
    ok("#996: the comparison runs over a Draft whose claims pair with no ground", gc.status === 0,
      `status ${gc.status}: ${(gc.stderr || "").split("\n")[0]}`);
    const grec = JSON.parse(readOrEmpty(join(GWS, "pass-1", "join.json")) || "{}");

    // THE HARNESS DECIDES NO CLAIM. This is the defect's own signature: on the
    // 2026-09-07 run 87 of 93 failing claims sat in `mechanical` with no model
    // call, and none may now.
    // THE PREMISE IS ASSERTED, NOT ONLY STATED (PR #1003 round 1). Every
    // assertion below passes whether or not the claims pair, so without this the
    // case would stay green while silently ceasing to exercise the unpaired path
    // it exists for. `grounds-unused` reads the same assignment from the other
    // side: if neither a1 claim reaches the floor, BOTH of a1's grounds are
    // carried by nothing and the item fails naming them.
    const gUnused = (grec.results || []).find((r) => r.step_id === "a1" && r.item === "grounds-unused");
    ok("#996 PREMISE: neither claim on a1 pairs with a ground, so both grounds go unused",
      !!gUnused && gUnused.verdict === "fails"
      && GROUNDS.a1.every((g) => (gUnused.evidence || []).includes(g)),
      gUnused ? `verdict ${gUnused.verdict}, evidence ${(gUnused.evidence || []).length}` : "no row");

    ok("#996: no `grounds` pair is decided by the Harness, however it pairs",
      !(grec.mechanical || []).some((m) => m.item === "grounds"));
    // AND EVERY CLAIM IS ASKED ABOUT. The count is the recovered claims', not
    // the paired ones' — which is what the old branch made unequal.
    ok("#996: every recovered claim on the two-ground Step renders one join Packet",
      (grec.model_calls || []).filter((m) => m.step_id === "a1" && m.item === "grounds").length
        === UNPAIRED.a1.length);

    // THE JUDGE SEES THE WHOLE GROUND LIST. Shown one ground it would be asked
    // a narrower question than the item states, and an unpaired claim would
    // have no declared side to be shown at all.
    const gowed = (grec.owed || []).find((o) => o.step_id === "a1" && o.item === "grounds");
    const gpk = gowed ? readOrEmpty(gowed.packet) : "";
    ok("#996: and its declared side carries EVERY ground the Step declares",
      GROUNDS.a1.every((g) => gpk.includes(g)), `packet ${gowed ? gowed.packet : "(none)"}`);
    // THE QUANTIFIER IS THE UNION, NOT EACH GROUND ALONE (PR #1003 successor). A
    // claim resting on two grounds at once goes beyond either of them singly,
    // and "beyond ALL of them" read literally instructed the judge to fail it.
    ok("#996: while the question asks whether the claim goes beyond the grounds taken together",
      /goes beyond what those grounds, taken together, license/.test(gpk)
      && !/goes beyond ALL of them/.test(gpk));

    // THE ACCEPTANCE ITSELF: with the prose judged faithful, the item HOLDS.
    const gv = join(gdir, "verdicts.json");
    writeFileSync(gv, JSON.stringify({
      verdicts: [...(grec.owed || []), ...((grec.sections || {}).owed || [])].map((o) => ({
        step_id: o.step_id, item: o.item,
        ...(o.pair === null || o.pair === undefined ? {} : { pair: o.pair }),
        verdict: "holds", reason: "the claim rests within the grounds the Step declares",
        model: JUDGE_MODEL,
      })),
    }, null, 2) + "\n");
    const gc2 = gdrive("compare", "--verdicts", gv);
    ok("#996: the filled join completes", gc2.status === 0,
      `status ${gc2.status}: ${(gc2.stderr || "").split("\n")[0]}`);
    const grec2 = JSON.parse(readOrEmpty(join(GWS, "pass-1", "join.json")) || "{}");
    const grow = (grec2.results || []).find((r) => r.step_id === "a1" && r.item === "grounds");
    ok("#996 ACCEPTANCE: `grounds` HOLDS on a Step that faithfully realizes a two-ground Packet",
      !!grow && grow.verdict === "holds", grow ? `verdict ${grow.verdict}` : "no grounds row");
    ok("#996: and every one of its pairs was decided by the model",
      !!grow && (grow.pairs || []).every((x) => x.decided_by === "model"));

    // THE FALLBACK IS DECLARED, NEVER INHERITED. An item that omits `unpaired`
    // is refused rather than defaulted — the half LESSONS.md:88 names as
    // load-bearing, made impossible to leave to the matcher.
    const gitems = JSON.parse(readFileSync(join(dirname(self), "review-items.json"), "utf8"));
    ok("#996: the paired item declares which fallback it takes",
      gitems.items.filter((i) => i.mode === "paired")
        .every((i) => i.unpaired === "judge" || i.unpaired === "fail"));

    // THE OWNER RECORD'S "NONE" ARM, EXPRESSED (PR #1004 successor, #1006). This
    // fixture's `a1/grounds-unused` fail is Harness-decided by construction —
    // the PREMISE case above depends on it — so its finding line must render
    // no Packet pointer and point at the join record instead, while every
    // pointer the record does compose resolves. `close` is reachable here: the
    // only fail is best-effort, and nothing was corrected.
    {
      const gcl = gdrive("close");
      const grv = readOrEmpty(join(gdir, "review.md"));
      ok("#1006: close writes the owner record over a run whose one fail the Harness decided",
        gcl.status === 0 && grv.length > 0, `status ${gcl.status}: ${(gcl.stderr || "").split("\n")[0]}`);
      const gline = grv.slice(grv.indexOf("**a1 / grounds-unused**"));
      const gblock = gline.slice(0, gline.indexOf("\n- **") > 0 ? gline.indexOf("\n- **") : undefined);
      ok("#1006: a Harness-decided finding renders no Packet pointer and names the join record",
        /the pair the judge saw: none — [^\n]*pass-1\/join\.json/.test(gblock)
        && !/the pair the judge saw: `/.test(gblock), gblock.slice(0, 300));
      const gptrs = [...grv.matchAll(/^ {2}- (?:recovered record|the pair the judge saw): `([^`]+)`/gm)].map((m) => m[1]);
      ok("#1006: and every pointer the record composes resolves",
        gptrs.length > 0 && gptrs.every((f) => existsSync(resolve(process.cwd(), f))),
        gptrs.filter((f) => !existsSync(resolve(process.cwd(), f))).join(", "));
    }
  }

  rmSync(root, { recursive: true, force: true });
  process.stdout.write(`review-draft self-test: ${passed} case(s) pass, ${failures.length} fail\n`);
  for (const f of failures) process.stdout.write(`  FAIL: ${f}\n`);
  process.exit(failures.length ? 1 : 0);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args["self-test"]) return runSelfTest();
  const cmd = args._cmd;
  if (!cmd || !COMMANDS[cmd]) {
    process.stdout.write(USAGE);
    process.exit(cmd ? 1 : 0);
  }
  COMMANDS[cmd](args);
}

main();

export { readDraft, resolveInputs, slugOf, missingFor, sha256 };
